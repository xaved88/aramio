import { SharedGameState } from '../../../../shared/types/GameStateTypes';
import { GameCommand } from '../../../../shared/types/GameCommands';
import { GAMEPLAY_CONFIG } from '../../../../Config';

/**
 * HookshotBotStrategy - A specialized bot behavior for heroes with Hookshot ability
 * 
 * This strategy focuses on positioning behind teammates and using Hookshot to catch
 * enemy heroes at optimal range. The bot prioritizes low-health targets and will
 * stay to fight for 3 seconds after landing a Hookshot before returning to backline
 * positioning.
 * 
 * Key behaviors:
 * - Positions behind teammates (closer to own base than at least 1 teammate)
 * - Only targets enemy heroes (ignores minions)
 * - Uses Hookshot when off cooldown and good targets are available
 * - Stays in place to fight hooked enemies for 3 seconds
 * - Retreats when targeted by defensive structures
 */
export class HookshotBotStrategy {

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

        // Find all enemies
        const allEnemies = this.findAllEnemies(bot, state);
        
        if (allEnemies.length > 0) {
            // Check if it's time to use Hookshot
            if (this.shouldUseHookshot(bot, state)) {
                const hookshotTarget = this.selectHookshotTarget(allEnemies, bot, state);
                if (hookshotTarget) {
                    commands.push({
                        type: 'useAbility',
                        data: { heroId: bot.id, x: hookshotTarget.x, y: hookshotTarget.y }
                    });
                }
            }
        }

        // Check if we recently used Hookshot and should stay to fight
        if (this.shouldStayToFight(bot, state)) {
            // Stay in place to fight the target we just hooked
            // No movement command needed
        } else {
            // Position behind teammates for optimal Hookshot opportunities
            const targetPosition = this.getOptimalPosition(bot, state);
            commands.push({
                type: 'move',
                data: { heroId: bot.id, targetX: targetPosition.x, targetY: targetPosition.y }
            });
        }

        return commands;
    }

    private shouldUseHookshot(bot: any, state: SharedGameState): boolean {
        const currentTime = state.gameTime;
        const lastUsedTime = bot.ability.lastUsedTime;
        const baseCooldown = bot.ability.cooldown;

        // If never used, fire immediately
        if (lastUsedTime === 0) {
            return true;
        }

        // Calculate time since last use
        const timeSinceLastUse = currentTime - lastUsedTime;
        return timeSinceLastUse >= baseCooldown;
    }

    private selectHookshotTarget(enemies: any[], bot: any, state: SharedGameState): any {
        // Filter to only hero enemies at good Hookshot range
        const hookshotCandidates = enemies.filter(enemy => {
            // Only target heroes
            if (enemy.type !== 'hero') {
                return false;
            }
            

            
            // Don't hookshot enemies that are too far (outside Hookshot range)
            const hookshotRange = bot.ability.range;
            
            if (enemy.distance > hookshotRange) {
                return false;
            }

            return true;
        });

        if (hookshotCandidates.length === 0) {
            return null;
        }

        // Score candidates based on health (lower health = easier to kill)
        const scoredCandidates = hookshotCandidates.map(enemy => {
            let score = 0;
            
            // Higher score for lower health enemies (easier to kill)
            score += (100 - enemy.health) * 2;
            
            return { ...enemy, score };
        });

        // Return the highest scoring candidate
        return scoredCandidates.sort((a, b) => b.score - a.score)[0];
    }

    private getOptimalPosition(bot: any, state: SharedGameState): { x: number, y: number } {
        // Find teammates
        const teammates = this.findTeammates(bot, state);
        
        if (teammates.length === 0) {
            // No teammates, fall back to safe position near base
            return this.getSafeRetreatPosition(bot, state);
        }

        // Find the teammate closest to the enemy base
        const teammateClosestToEnemy = teammates.reduce((closest, teammate) => {
            const closestDistance = this.getDistanceToBase(closest, this.getEnemyTeam(bot.team));
            const teammateDistance = this.getDistanceToBase(teammate, this.getEnemyTeam(bot.team));
            return teammateDistance < closestDistance ? teammate : closest;
        });

        // Always position behind the teammate (closer to our base)
        // Don't check if bot is "in front" - just always position correctly

        // Move to position behind teammate
        const directionToOurBase = this.getDirectionToBase(bot, bot.team);
        const offsetDistance = 50; // Stay 50 pixels behind teammate
        
        // Calculate new position behind teammate
        const newX = teammateClosestToEnemy.x + (directionToOurBase.x * offsetDistance);
        const newY = teammateClosestToEnemy.y + (directionToOurBase.y * offsetDistance);
        
        return { x: newX, y: newY };
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

    private findBestHookshotTarget(bot: any, state: SharedGameState): any | null {
        let bestTarget: any = null;
        let bestScore = -1;

        state.combatants.forEach((enemy: any) => {
            // Skip if not an enemy or if dead/respawning
            if (enemy.team === bot.team || enemy.health <= 0 || enemy.state === 'respawning') {
                return;
            }

            // Skip minions - only target heroes
            if (enemy.type !== 'hero') {
                return;
            }

            // Calculate target score
            let score = 0;
            
            // Health bonus: lower health = higher score (easier to kill)
            score += (100 - enemy.health) * 2;

            if (score > bestScore) {
                bestScore = score;
                bestTarget = enemy;
            }
        });

        return bestTarget;
    }

    private findEnemiesInRange(bot: any, state: SharedGameState): any[] {
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

            // Check if in attack range (accounting for combatant size)
            if (distance <= bot.attackRadius + combatant.size) {
                enemies.push({ ...combatant, distance });
            }
        });

        // Sort by distance (closest first)
        return enemies.sort((a, b) => a.distance - b.distance);
    }



    private shouldStayToFight(bot: any, state: SharedGameState): boolean {
        const currentTime = state.gameTime;
        const lastUsedTime = bot.ability.lastUsedTime;
        
        // If we never used Hookshot, don't stay to fight
        if (lastUsedTime === 0) {
            return false;
        }
        
        // Check if we used Hookshot recently (within the last 2 seconds)
        const timeSinceHookshot = currentTime - lastUsedTime;
        const hookshotRecoveryTime = 3000; // 3 seconds to recover from Hookshot
        
        if (timeSinceHookshot > hookshotRecoveryTime) {
            return false;
        }
        
        // Check if there are enemies nearby that we could be fighting
        const enemiesInRange = this.findEnemiesInRange(bot, state);
        return enemiesInRange.length > 0;
    }
}
