import { SharedGameState } from '../../../../shared/types/GameStateTypes';
import { GameCommand } from '../../../../shared/types/GameCommands';
import { GameplayConfig } from '../../../config/ConfigProvider';
import { CombatantUtils } from '../../combatants/CombatantUtils';
import { applyBotCollisionAvoidance } from '../BotCollisionAvoidance';

export class SimpletonBotStrategy {
    private gameplayConfig: GameplayConfig;

    constructor(gameplayConfig: GameplayConfig) {
        this.gameplayConfig = gameplayConfig;
    }

    generateCommands(bot: any, state: SharedGameState): GameCommand[] {
        const commands: GameCommand[] = [];
        const allCombatants = Array.from(state.combatants.values());
        const allObstacles = state.obstacles ? Array.from(state.obstacles.values()) : [];

        // Skip if bot is dead or respawning
        if (bot.health <= 0 || bot.state === 'respawning') {
            return commands;
        }

        // Check if bot is being targeted by defensive structures
        if (this.isBeingTargetedByDefensiveStructure(bot, state)) {
            // Retreat to safe position
            const safePosition = this.getSafeRetreatPosition(bot, state);
            const adjustedSafePosition = applyBotCollisionAvoidance(bot, safePosition.x, safePosition.y, allCombatants, allObstacles, this.gameplayConfig);
            commands.push({
                type: 'move',
                data: { heroId: bot.id, targetX: adjustedSafePosition.x, targetY: adjustedSafePosition.y }
            });
            return commands;
        }

        // Check if we're outnumbered and should play defensively
        if (CombatantUtils.shouldPlayDefensively(bot, allCombatants, state.gameTime, this.gameplayConfig)) {
            // Retreat to nearest friendly structure for defensive positioning
            const retreatPosition = CombatantUtils.getDefensiveRetreatPosition(bot, allCombatants, this.gameplayConfig);
            const adjustedRetreatPosition = applyBotCollisionAvoidance(bot, retreatPosition.x, retreatPosition.y, allCombatants, allObstacles, this.gameplayConfig);
            commands.push({
                type: 'move',
                data: { heroId: bot.id, targetX: adjustedRetreatPosition.x, targetY: adjustedRetreatPosition.y }
            });
            return commands;
        }

        // Check if bot is standing in an enemy zone (e.g., pyromancer fire)
        const enemyZone = CombatantUtils.isInEnemyZone(bot, state.zones);
        if (enemyZone) {
            // Check if we have a good reason to stay (e.g., enemy is very low health and close)
            const lowHealthEnemyNearby = CombatantUtils.hasLowHealthEnemyNearby(bot, state);
            
            if (!lowHealthEnemyNearby) {
                // Get safe position away from zones using quickest escape route
                const safePosition = CombatantUtils.getSafePositionAwayFromZones(bot, state.zones, allCombatants);
                const adjustedSafePosition = applyBotCollisionAvoidance(bot, safePosition.x, safePosition.y, allCombatants, allObstacles, this.gameplayConfig);
                commands.push({
                    type: 'move',
                    data: { heroId: bot.id, targetX: adjustedSafePosition.x, targetY: adjustedSafePosition.y }
                });
                return commands;
            }
        }

        // Find all enemies (not just in range)
        const allEnemies = this.findAllEnemies(bot, state);
        
        if (allEnemies.length > 0) {
            // Check if it's time to use ability based on deterministic cooldown
            if (this.shouldUseAbility(bot, state)) {
                // Filter enemies to only those within ability range
                const enemiesInAbilityRange = this.findEnemiesInAbilityRange(allEnemies, bot);
                const targetEnemy = this.selectTargetEnemy(enemiesInAbilityRange);
                if (targetEnemy) {
                    commands.push({
                        type: 'useAbility',
                        data: { heroId: bot.id, x: targetEnemy.x, y: targetEnemy.y }
                    });
                }
            }
        }

        // Find enemies in attack range for movement decisions
        const enemiesInRange = this.findEnemiesInRange(bot, state);
        
        if (enemiesInRange.length > 0) {
            // Stay in place to attack (combat system handles basic attacks automatically)
            // No movement command needed
        } else {
            // Check if there's a nearby enemy turret to prioritize
            const nearbyEnemyTurret = this.findNearbyEnemyTurret(bot, state);
            if (nearbyEnemyTurret) {
                const adjustedTurretPosition = applyBotCollisionAvoidance(bot, nearbyEnemyTurret.x, nearbyEnemyTurret.y, allCombatants, allObstacles, this.gameplayConfig);
                commands.push({
                    type: 'move',
                    data: { heroId: bot.id, targetX: adjustedTurretPosition.x, targetY: adjustedTurretPosition.y }
                });
            } else {
                const targetPosition = this.getEnemyCradlePosition(bot.team);
                const adjustedCradlePosition = applyBotCollisionAvoidance(bot, targetPosition.x, targetPosition.y, allCombatants, allObstacles, this.gameplayConfig);
                commands.push({
                    type: 'move',
                    data: { heroId: bot.id, targetX: adjustedCradlePosition.x, targetY: adjustedCradlePosition.y }
                });
            }
        }

        return commands;
    }

    private shouldUseAbility(bot: any, state: SharedGameState): boolean {
        const currentTime = state.gameTime;
        const lastUsedTime = bot.ability.lastUsedTime;
        const baseCooldown = bot.getAbilityCooldown();

        // If never used, fire immediately
        if (lastUsedTime === 0) {
            return true;
        }

        // Calculate time since last use
        const timeSinceLastUse = currentTime - lastUsedTime;

        // Generate deterministic multiplier based on bot ID and last use time
        const multiplier = this.getDeterministicCooldownMultiplier(bot.id, lastUsedTime);
        const targetCooldown = baseCooldown * multiplier;

        return timeSinceLastUse >= targetCooldown;
    }

    private getDeterministicCooldownMultiplier(botId: string, lastUsedTime: number): number {
        // Create a deterministic seed from bot ID and last use time
        const seed = this.hashCode(botId + lastUsedTime.toString());
        
        // Generate a value between 0 and 1
        const randomValue = (seed % 1000) / 1000;
        
        // Map to our min/max range
        return this.gameplayConfig.BOTS.ABILITY_COOLDOWN_MULTIPLIER.MIN + 
               (randomValue * (this.gameplayConfig.BOTS.ABILITY_COOLDOWN_MULTIPLIER.MAX - this.gameplayConfig.BOTS.ABILITY_COOLDOWN_MULTIPLIER.MIN));
    }

    private hashCode(str: string): number {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash);
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

    private selectTargetEnemy(enemies: any[]): any {
        // Separate heroes and minions
        const heroes = enemies.filter(enemy => enemy.type === 'hero');
        const minions = enemies.filter(enemy => enemy.type === 'minion');
        
        // Prioritize heroes, fallback to minions if no heroes
        const targetPool = heroes.length > 0 ? heroes : minions;
        
        if (targetPool.length === 0) {
            return null; // No valid targets
        }
        
        const targetingStrategy = Math.random();
        
        if (targetingStrategy < this.gameplayConfig.AI_BEHAVIOR.SIMPLETON.TARGET_NEAREST_CHANCE) {
            // Target nearest enemy
            return targetPool.sort((a, b) => a.distance - b.distance)[0];
        } else if (targetingStrategy < this.gameplayConfig.AI_BEHAVIOR.SIMPLETON.TARGET_LOW_HEALTH_CHANCE) {
            // Target lowest health enemy
            return targetPool.sort((a, b) => a.health - b.health)[0];
        } else {
            // Target random enemy
            return targetPool[Math.floor(Math.random() * targetPool.length)];
        }
    }

    private findEnemiesInAbilityRange(enemies: any[], bot: any): any[] {
        // Filter enemies to only those within ability range
        return enemies.filter(enemy => {
            const abilityRange = bot.getAbilityRange();
            return enemy.distance <= abilityRange;
        });
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
                ? this.gameplayConfig.CRADLE_POSITIONS.BLUE 
                : this.gameplayConfig.CRADLE_POSITIONS.RED;
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
        const retreatDistance = closestStructure.attackRadius + this.gameplayConfig.AI_BEHAVIOR.CRADLE_RETREAT_DISTANCE;
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
        return CombatantUtils.getEnemyCradlePosition(team, this.gameplayConfig);
    }

    private findNearbyEnemyTurret(bot: any, state: SharedGameState): any | null {
        const allCombatants = Array.from(state.combatants.values());
        return CombatantUtils.findNearbyEnemyTurret(bot, allCombatants, this.gameplayConfig.AI_BEHAVIOR.TURRET_DETECTION_RANGE);
    }


} 