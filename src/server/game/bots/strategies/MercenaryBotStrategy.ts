import { SharedGameState } from '../../../../shared/types/GameStateTypes';
import { GameCommand } from '../../../../shared/types/GameCommands';
import { GAMEPLAY_CONFIG } from '../../../../GameConfig';

/**
 * MercenaryBotStrategy - A specialized bot behavior for heroes with Mercenary ability
 * 
 * This strategy operates in two distinct modes:
 * 1. RAGE MODE: Aggressive pursuit of enemies, ignoring minions, maximizing damage output
 * 2. NORMAL MODE: Calculated assassin positioning - seeks enemies within auto-attack range
 *    while avoiding positions targeted by multiple enemies
 * 
 * Key behaviors:
 * - Uses rage when enemies are nearby and it's off cooldown
 * - During rage: aggressively chases enemies, ignores minions, maximizes damage
 * - After rage: positions aggressively for auto-attack opportunities while maintaining safety
 * - Always aware of reduced attack range during rage mode
 * - Avoids areas with multiple attackers for strategic positioning
 */
export class MercenaryBotStrategy {

    generateCommands(bot: any, state: SharedGameState): GameCommand[] {
        const commands: GameCommand[] = [];

        // Skip if bot is dead or respawning
        if (bot.health <= 0 || bot.state === 'respawning') {
            return commands;
        }

        // Check if bot is being targeted by defensive structures
        if (this.isBeingTargetedByDefensiveStructure(bot, state)) {
            // Retreat to safe position
            const safePosition = this.getSafeRetreatPosition(bot, state);
            commands.push({
                type: 'move',
                data: { heroId: bot.id, targetX: safePosition.x, targetY: safePosition.y }
            });
            return commands;
        }

        // Check if we're currently in rage mode
        const isInRageMode = this.isInRageMode(bot, state);
        
        // Find all enemies
        const allEnemies = this.findAllEnemies(bot, state);
        
        if (allEnemies.length > 0) {
            // Check if it's time to use rage
            if (this.shouldUseRage(bot, state, allEnemies)) {
                const rageTarget = this.selectRageTarget(allEnemies, bot, state);
                if (rageTarget) {
                    commands.push({
                        type: 'useAbility',
                        data: { heroId: bot.id, x: rageTarget.x, y: rageTarget.y }
                    });
                }
            }
        }

        // Generate movement commands based on current state
        if (isInRageMode) {
            // RAGE MODE: Aggressive pursuit
            const movementCommand = this.generateRageModeMovement(bot, state, allEnemies);
            if (movementCommand) {
                commands.push(movementCommand);
            }
        } else {
            // NORMAL MODE: Defensive backline positioning
            const movementCommand = this.generateDefensiveMovement(bot, state);
            if (movementCommand) {
                commands.push(movementCommand);
            }
        }

        return commands;
    }

    private isInRageMode(bot: any, state: SharedGameState): boolean {
        // Check if we have active rage effects
        return bot.effects.some((effect: any) => 
            effect.type === 'hunter' && effect.appliedAt > 0
        );
    }

    private shouldUseRage(bot: any, state: SharedGameState, enemies: any[]): boolean {
        const currentTime = state.gameTime;
        const lastUsedTime = bot.ability.lastUsedTime;
        const baseCooldown = bot.ability.cooldown;

        // If never used, fire immediately if enemies are nearby
        if (lastUsedTime === 0) {
            return enemies.some(enemy => enemy.distance <= 150); // Use rage if enemies within 150 pixels
        }

        // Calculate time since last use
        const timeSinceLastUse = currentTime - lastUsedTime;
        if (timeSinceLastUse < baseCooldown) {
            return false; // Still on cooldown
        }

        // Only use rage if we have good targets nearby
        const nearbyEnemies = enemies.filter(enemy => enemy.distance <= 150);
        if (nearbyEnemies.length === 0) {
            return false; // No good targets
        }

        // Prioritize using rage when we're in danger or when we can secure kills
        const lowHealthEnemies = nearbyEnemies.filter(enemy => enemy.health <= 50);
        const inDanger = bot.health <= 60; // Use rage defensively when low health

        return lowHealthEnemies.length > 0 || inDanger;
    }

    private selectRageTarget(enemies: any[], bot: any, state: SharedGameState): any {
        // During rage, only target heroes (hunter effect ignores minions anyway)
        const heroTargets = enemies.filter(enemy => enemy.type === 'hero');
        
        if (heroTargets.length === 0) {
            return null; // No hero targets available
        }

        // Score targets based on multiple factors
        const scoredTargets = heroTargets.map(enemy => {
            let score = 0;
            
            // Higher score for lower health enemies (easier to kill)
            score += (100 - enemy.health) * 3;
            
            // Bonus for closer enemies (easier to reach with reduced range)
            if (enemy.distance <= 100) {
                score += 30;
            } else if (enemy.distance <= 150) {
                score += 15;
            }
            
            // Bonus for enemies that are isolated (easier to kill without interference)
            const nearbyAllies = this.countNearbyAllies(enemy, state, 100);
            score += (3 - nearbyAllies) * 10; // Fewer allies = higher score
            
            return { ...enemy, score };
        });

        // Return the highest scoring target
        return scoredTargets.sort((a, b) => b.score - a.score)[0];
    }

    private generateRageModeMovement(bot: any, state: SharedGameState, enemies: any[]): GameCommand | null {
        // During rage mode, be aggressive and chase enemies
        const nearbyEnemies = enemies.filter(enemy => enemy.distance <= 150);
        
        if (nearbyEnemies.length > 0) {
            // Chase the closest enemy
            const closestEnemy = nearbyEnemies.sort((a, b) => a.distance - b.distance)[0];
            
            // Move toward the enemy, but be aware of reduced attack range during rage
            const rageAttackRange = bot.getAttackRadius();
            const optimalDistance = rageAttackRange + 10; // Stay slightly outside attack range
            
            if (closestEnemy.distance > optimalDistance) {
                // Move closer to get in range
                return {
                    type: 'move',
                    data: { heroId: bot.id, targetX: closestEnemy.x, targetY: closestEnemy.y }
                };
            }
            // Perfect distance or closer, stay in place
            return null;
        } else {
            // No nearby enemies, move toward enemy base to find targets
            const targetPosition = this.getEnemyCradlePosition(bot.team);
            return {
                type: 'move',
                data: { heroId: bot.id, targetX: targetPosition.x, targetY: targetPosition.y }
            };
        }
    }

    private generateDefensiveMovement(bot: any, state: SharedGameState): GameCommand | null {
        // When not in rage mode, position aggressively for auto-attack opportunities
        const allEnemies = this.findAllEnemies(bot, state);
        
        if (allEnemies.length === 0) {
            // No enemies, move toward enemy base to find targets
            const targetPosition = this.getEnemyCradlePosition(bot.team);
            return {
                type: 'move',
                data: { heroId: bot.id, targetX: targetPosition.x, targetY: targetPosition.y }
            };
        }

        // Find enemies that are safe to approach (not too many attackers)
        const safeEnemies = allEnemies.filter(enemy => {
            const attackers = this.countEnemiesAttackingPosition(enemy.x, enemy.y, state, bot);
            return attackers <= 1; // Only approach if max 1 enemy can attack us
        });

        if (safeEnemies.length === 0) {
            // All positions are too dangerous, fall back to safe position
            return {
                type: 'move',
                data: { 
                    heroId: bot.id, 
                    targetX: this.getSafeRetreatPosition(bot, state).x, 
                    targetY: this.getSafeRetreatPosition(bot, state).y 
                }
            };
        }

        // Find the best target - prioritize low health enemies within auto-attack range
        const normalAttackRange = bot.getAttackRadius();
        const optimalTargets = safeEnemies.filter(enemy => 
            enemy.distance <= normalAttackRange * 1.5 // Within 1.5x attack range
        );

        if (optimalTargets.length > 0) {
            // Score targets by health and distance
            const scoredTargets = optimalTargets.map(enemy => {
                let score = 0;
                score += (100 - enemy.health) * 2; // Lower health = higher score
                score += (normalAttackRange - enemy.distance) * 0.5; // Closer = higher score
                return { ...enemy, score };
            });

            const bestTarget = scoredTargets.sort((a, b) => b.score - a.score)[0];
            
            // Move to optimal auto-attack range
            const targetDistance = Math.min(bestTarget.distance, normalAttackRange);
            const direction = this.getDirectionFromTo(bot, bestTarget);
            
            const targetX = bestTarget.x - (direction.x * targetDistance);
            const targetY = bestTarget.y - (direction.y * targetDistance);
            
            return {
                type: 'move',
                data: { heroId: bot.id, targetX, targetY }
            };
        } else {
            // No optimal targets, move toward closest safe enemy
            const closestSafeEnemy = safeEnemies.sort((a, b) => a.distance - b.distance)[0];
            return {
                type: 'move',
                data: { heroId: bot.id, targetX: closestSafeEnemy.x, targetY: closestSafeEnemy.y }
            };
        }
    }

    private findAllEnemies(bot: any, state: SharedGameState): any[] {
        const enemies: any[] = [];
        
        Array.from(state.combatants.values()).forEach((combatant: any) => {
            // Skip allies and dead entities
            if (combatant.team === bot.team || combatant.health <= 0) {
                return;
            }

            // Calculate distance
            const dx = combatant.x - bot.x;
            const dy = combatant.y - bot.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            enemies.push({ ...combatant, distance });
        });

        return enemies;
    }

    private findTeammates(bot: any, state: SharedGameState): any[] {
        const teammates: any[] = [];
        
        Array.from(state.combatants.values()).forEach((combatant: any) => {
            // Skip enemies, dead entities, and self
            if (combatant.team !== bot.team || combatant.health <= 0 || combatant.id === bot.id) {
                return;
            }

            // Only count heroes as teammates
            if (combatant.type === 'hero') {
                teammates.push(combatant);
            }
        });

        return teammates;
    }

    private countNearbyAllies(combatant: any, state: SharedGameState, radius: number): number {
        let count = 0;
        
        Array.from(state.combatants.values()).forEach((ally: any) => {
            if (ally.team === combatant.team && ally.id !== combatant.id && ally.health > 0) {
                const dx = ally.x - combatant.x;
                const dy = ally.y - combatant.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance <= radius) {
                    count++;
                }
            }
        });
        
        return count;
    }

    private isBeingTargetedByDefensiveStructure(bot: any, state: SharedGameState): boolean {
        return Array.from(state.combatants.values()).some((combatant: any) => {
            // Only check enemy turrets and cradles
            if (combatant.team === bot.team || combatant.health <= 0) {
                return false;
            }
            
            if (combatant.type !== 'turret' && combatant.type !== 'cradle') {
                return false;
            }

            // Check if this defensive structure is targeting the bot
            return combatant.target === bot.id;
        });
    }

    private getSafeRetreatPosition(bot: any, state: SharedGameState): { x: number, y: number } {
        // Find the closest friendly defensive structure to retreat to
        const friendlyStructures = Array.from(state.combatants.values()).filter((combatant: any) => 
            combatant.team === bot.team && 
            combatant.health > 0 && 
            (combatant.type === 'cradle' || combatant.type === 'turret')
        );

        if (friendlyStructures.length === 0) {
            // Fallback to team spawn position
            return bot.team === 'blue' 
                ? GAMEPLAY_CONFIG.CRADLE_POSITIONS.BLUE 
                : GAMEPLAY_CONFIG.CRADLE_POSITIONS.RED;
        }

        // Find closest friendly structure
        let closestStructure = friendlyStructures[0];
        let closestDistance = Infinity;

        friendlyStructures.forEach((structure: any) => {
            const dx = structure.x - bot.x;
            const dy = structure.y - bot.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < closestDistance) {
                closestDistance = distance;
                closestStructure = structure;
            }
        });

        // Return position near the closest friendly structure, but outside its attack range
        const retreatDistance = closestStructure.attackRadius + 50; // 50 pixels buffer
        const dx = bot.x - closestStructure.x;
        const dy = bot.y - closestStructure.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance === 0) {
            // Bot is at structure position, move away
            return {
                x: closestStructure.x + retreatDistance,
                y: closestStructure.y + retreatDistance
            };
        }

        // Normalize direction and scale to retreat distance
        const normalizedDx = dx / distance;
        const normalizedDy = dy / distance;
        
        return {
            x: closestStructure.x + (normalizedDx * retreatDistance),
            y: closestStructure.y + (normalizedDy * retreatDistance)
        };
    }

    private getEnemyCradlePosition(team: string): { x: number, y: number } {
        const basePosition = team === 'blue' 
            ? GAMEPLAY_CONFIG.CRADLE_POSITIONS.RED 
            : GAMEPLAY_CONFIG.CRADLE_POSITIONS.BLUE;
        
        // Add some randomization to avoid all bots targeting the exact same spot
        const offsetX = (Math.random() - 0.5) * 60; // ±30 pixels
        const offsetY = (Math.random() - 0.5) * 60; // ±30 pixels
        
        return {
            x: basePosition.x + offsetX,
            y: basePosition.y + offsetY
        };
    }

    private getDistanceToBase(combatant: any, team: string): number {
        const basePosition = team === 'blue' 
            ? GAMEPLAY_CONFIG.CRADLE_POSITIONS.BLUE 
            : GAMEPLAY_CONFIG.CRADLE_POSITIONS.RED;
        
        const dx = combatant.x - basePosition.x;
        const dy = combatant.y - basePosition.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    private getDirectionToBase(combatant: any, team: string): { x: number, y: number } {
        const basePosition = team === 'blue' 
            ? GAMEPLAY_CONFIG.CRADLE_POSITIONS.BLUE 
            : GAMEPLAY_CONFIG.CRADLE_POSITIONS.RED;
        
        const dx = basePosition.x - combatant.x;
        const dy = basePosition.y - combatant.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance === 0) {
            return { x: 0, y: 0 };
        }
        
        return {
            x: dx / distance,
            y: dy / distance
        };
    }

    private getEnemyTeam(team: string): string {
        return team === 'blue' ? 'red' : 'blue';
    }

    private countEnemiesAttackingPosition(x: number, y: number, state: SharedGameState, bot: any): number {
        let count = 0;
        
        Array.from(state.combatants.values()).forEach((combatant: any) => {
            // Skip allies and dead entities
            if (combatant.team === bot.team || combatant.health <= 0) {
                return;
            }
            
            // Check if this enemy is targeting the bot (similar to turret targeting check)
            if (combatant.target === bot.id) {
                count++;
            }
        });
        
        return count;
    }



    private getDirectionFromTo(from: any, to: any): { x: number, y: number } {
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance === 0) {
            return { x: 0, y: 0 };
        }
        
        return {
            x: dx / distance,
            y: dy / distance
        };
    }
}
