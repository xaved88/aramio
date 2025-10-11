import { SharedGameState } from '../../../../shared/types/GameStateTypes';
import { GameCommand } from '../../../../shared/types/GameCommands';
import { GameplayConfig } from '../../../config/ConfigProvider';
import { CombatantUtils } from '../../combatants/CombatantUtils';

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
    private gameplayConfig: GameplayConfig;
    private botHealingState: Map<string, { isHealing: boolean, lastDamageTime: number, lastKnownHealth?: number }> = new Map();

    constructor(gameplayConfig: GameplayConfig) {
        this.gameplayConfig = gameplayConfig;
    }

    generateCommands(bot: any, state: SharedGameState): GameCommand[] {
        const commands: GameCommand[] = [];

        // Skip if bot is dead or respawning
        if (bot.health <= 0 || bot.state === 'respawning') {
            return commands;
        }

        // Track healing state for this bot
        this.updateBotHealingState(bot, state);

        // Find all enemies and combatants first
        const allEnemies = this.findAllEnemies(bot, state);
        const allCombatants = Array.from(state.combatants.values());

        // Check if bot is being targeted by defensive structures
        if (this.isBeingTargetedByDefensiveStructure(bot, state)) {
            // Retreat to safe position
            const retreatPosition = CombatantUtils.getDefensiveRetreatPosition(bot, allCombatants, this.gameplayConfig);
            commands.push({
                type: 'move',
                data: { heroId: bot.id, targetX: retreatPosition.x, targetY: retreatPosition.y }
            });
            return commands;
        }

        // Check if bot needs to heal up (fast regeneration strategy)
        if (this.shouldHeal(bot, state)) {
            // Retreat to safe position behind cradle to heal up using fast regeneration
            const retreatPosition = CombatantUtils.getCradleFallbackPosition(bot.team, this.gameplayConfig);
            commands.push({
                type: 'move',
                data: { heroId: bot.id, targetX: retreatPosition.x, targetY: retreatPosition.y }
            });
            return commands;
        }
        
        // Check if we're outnumbered and should play defensively
        if (CombatantUtils.shouldPlayDefensively(bot, allCombatants, state.gameTime)) {
            // Retreat to nearest friendly structure for defensive positioning
            const retreatPosition = CombatantUtils.getDefensiveRetreatPosition(bot, allCombatants, this.gameplayConfig);
            commands.push({
                type: 'move',
                data: { heroId: bot.id, targetX: retreatPosition.x, targetY: retreatPosition.y }
            });
            return commands;
        }

        // Check if we're currently in rage mode
        const isInRageMode = this.isInRageMode(bot, state);

        // Check if bot is standing in an enemy zone (e.g., pyromancer fire)
        // Mercenaries are more willing to stay in zones if in rage mode
        const enemyZone = CombatantUtils.isInEnemyZone(bot, state.zones);
        if (enemyZone && !isInRageMode) {
            // Check if we have a good reason to stay (e.g., enemy is very low health and close)
            const lowHealthEnemyNearby = CombatantUtils.hasLowHealthEnemyNearby(bot, state);
            
            if (!lowHealthEnemyNearby) {
                // Get safe position away from zones using quickest escape route
                const safePosition = CombatantUtils.getSafePositionAwayFromZones(bot, state.zones, allCombatants);
                commands.push({
                    type: 'move',
                    data: { heroId: bot.id, targetX: safePosition.x, targetY: safePosition.y }
                });
                return commands;
            }
        }
        
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
        const baseCooldown = bot.getAbilityCooldown();

        // Calculate time since last use
        const timeSinceLastUse = currentTime - lastUsedTime;
        if (timeSinceLastUse < baseCooldown) {
            return false; // Still on cooldown
        }

        // Only use rage if we have good targets nearby
        const nearbyEnemies = enemies.filter(enemy => enemy.distance <= 100);
        if (nearbyEnemies.length === 0) {
            return false; // No good targets
        }

        // Prioritize using rage when we're in danger or when we can secure kills
        // Only count heroes for low health check - don't waste rage on minions
        const lowHealthEnemies = nearbyEnemies.filter(enemy => {
            const healthPercent = (enemy.health / enemy.maxHealth) * 100;
            return enemy.type === 'hero' && healthPercent <= 50; // 50% health or below
        });
        const botHealthPercent = (bot.health / bot.maxHealth) * 100;
        const inDanger = botHealthPercent <= 60; // Use rage defensively when at 60% health or below

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
            const enemyHealthPercent = (enemy.health / enemy.maxHealth) * 100;
            score += (100 - enemyHealthPercent) * 3;
            
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
        // Filter out minions since hunter effect prevents targeting them
        const heroEnemies = enemies.filter(enemy => enemy.type === 'hero');
        const nearbyHeroEnemies = heroEnemies.filter(enemy => enemy.distance <= 100);
        
        if (nearbyHeroEnemies.length > 0) {
            // Prioritize the best target (same logic as selectRageTarget)
            const bestTarget = this.selectRageTarget(enemies, bot, state);
            
            // If best target is nearby, chase it; otherwise chase closest
            const targetEnemy = (bestTarget && bestTarget.distance <= 100) 
                ? bestTarget 
                : nearbyHeroEnemies.sort((a, b) => a.distance - b.distance)[0];
            
            // Move toward the enemy, but be aware of reduced attack range during rage
            const rageAttackRange = bot.getAttackRadius();
            
            if (targetEnemy.distance > rageAttackRange) {
                // Move closer to get in attack range
                return {
                    type: 'move',
                    data: { heroId: bot.id, targetX: targetEnemy.x, targetY: targetEnemy.y }
                };
            }
            // Within attack range, stay in place and let auto-attack handle it
            return null;
        } else {
            // No nearby enemies, check for nearby turrets first
            const nearbyEnemyTurret = this.findNearbyEnemyTurret(bot, state);
            if (nearbyEnemyTurret) {
                return {
                    type: 'move',
                    data: { heroId: bot.id, targetX: nearbyEnemyTurret.x, targetY: nearbyEnemyTurret.y }
                };
            } else {
                // Move toward enemy base to find targets
                const targetPosition = this.getEnemyCradlePosition(bot.team);
                return {
                    type: 'move',
                    data: { heroId: bot.id, targetX: targetPosition.x, targetY: targetPosition.y }
                };
            }
        }
    }

    private generateDefensiveMovement(bot: any, state: SharedGameState): GameCommand | null {
        // When not in rage mode, position aggressively for auto-attack opportunities
        const allEnemies = this.findAllEnemies(bot, state);
        
        if (allEnemies.length === 0) {
            // No enemies, check for nearby turrets first
            const nearbyEnemyTurret = this.findNearbyEnemyTurret(bot, state);
            if (nearbyEnemyTurret) {
                return {
                    type: 'move',
                    data: { heroId: bot.id, targetX: nearbyEnemyTurret.x, targetY: nearbyEnemyTurret.y }
                };
            } else {
                // Move toward enemy base to find targets
                const targetPosition = this.getEnemyCradlePosition(bot.team);
                return {
                    type: 'move',
                    data: { heroId: bot.id, targetX: targetPosition.x, targetY: targetPosition.y }
                };
            }
        }

        // Find enemies that are safe to approach (not too many attackers)
        const safeEnemies = allEnemies.filter(enemy => {
            const attackers = this.countEnemiesAttackingPosition(enemy.x, enemy.y, state, bot);
            return attackers <= 1; // Only approach if max 1 enemy can attack us
        });

        if (safeEnemies.length === 0) {
            // All positions are too dangerous, fall back to safe position
            const allCombatants = Array.from(state.combatants.values());
            const retreatPosition = CombatantUtils.getDefensiveRetreatPosition(bot, allCombatants, this.gameplayConfig);
            return {
                type: 'move',
                data: { 
                    heroId: bot.id, 
                    targetX: retreatPosition.x, 
                    targetY: retreatPosition.y 
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




    private getEnemyCradlePosition(team: string): { x: number, y: number } {
        return CombatantUtils.getEnemyCradlePosition(team, this.gameplayConfig);
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

    private findNearbyEnemyTurret(bot: any, state: SharedGameState): any | null {
        const allCombatants = Array.from(state.combatants.values());
        return CombatantUtils.findNearbyEnemyTurret(bot, allCombatants, 150);
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

    private updateBotHealingState(bot: any, state: SharedGameState): void {
        const botId = bot.id;
        const currentTime = state.gameTime;
        
        // Initialize healing state if not exists
        if (!this.botHealingState.has(botId)) {
            this.botHealingState.set(botId, { isHealing: false, lastDamageTime: 0 });
        }
        
        const healingState = this.botHealingState.get(botId)!;
        
        // Check if bot was recently damaged (within last 2 seconds)
        // This is a simple heuristic - in a real game you'd track actual damage events
        const timeSinceLastDamage = currentTime - healingState.lastDamageTime;
        const wasRecentlyDamaged = timeSinceLastDamage < 2000; // 2 seconds
        
        // Update healing state based on health percentage and damage
        const healthPercent = (bot.health / bot.maxHealth) * 100;
        
        if (healthPercent <= 33) {
            // Start healing if health drops to 33% or below
            healingState.isHealing = true;
        } else if (healthPercent >= 70) {
            // Stop healing if health reaches 70% or above
            healingState.isHealing = false;
        } else if (wasRecentlyDamaged && healingState.isHealing && healthPercent > 33) {
            // Stop healing if we were recently damaged (healing interrupted) - but only if above critical health
            healingState.isHealing = false;
        }
        
        // Update last damage time (simplified - assumes any health decrease is damage)
        // In a real implementation, you'd track actual damage events from the game state
        const previousHealth = healingState.lastKnownHealth || bot.health;
        if (bot.health < previousHealth) {
            healingState.lastDamageTime = currentTime;
        }
        healingState.lastKnownHealth = bot.health;
    }

    private shouldHeal(bot: any, state: SharedGameState): boolean {
        const healingState = this.botHealingState.get(bot.id);
        return healingState ? healingState.isHealing : false;
    }
}
