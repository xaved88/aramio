import { SharedGameState } from '../../../../shared/types/GameStateTypes';
import { GameCommand } from '../../../../shared/types/GameCommands';
import { GAMEPLAY_CONFIG } from '../../../../Config';

export class SimpletonBotStrategy {

    generateCommands(bot: any, state: SharedGameState): GameCommand[] {
        const commands: GameCommand[] = [];

        // Skip if bot is dead or respawning
        if (bot.health <= 0 || bot.state === 'respawning') {
            return commands;
        }

        // Find all enemies (not just in range)
        const allEnemies = this.findAllEnemies(bot, state);
        
        if (allEnemies.length > 0) {
            // Check if it's time to use ability based on deterministic cooldown
            if (this.shouldUseAbility(bot)) {
                const targetEnemy = this.selectTargetEnemy(allEnemies);
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
            // Move toward enemy cradle
            const targetPosition = this.getEnemyCradlePosition(bot.team);
            commands.push({
                type: 'move',
                data: { heroId: bot.id, targetX: targetPosition.x, targetY: targetPosition.y }
            });
        }

        return commands;
    }

    private shouldUseAbility(bot: any): boolean {
        const currentTime = Date.now();
        const lastUsedTime = bot.ability.lastUsedTime;
        const baseCooldown = bot.ability.cooldown;

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
        return GAMEPLAY_CONFIG.BOTS.ABILITY_COOLDOWN_MULTIPLIER.MIN + 
               (randomValue * (GAMEPLAY_CONFIG.BOTS.ABILITY_COOLDOWN_MULTIPLIER.MAX - GAMEPLAY_CONFIG.BOTS.ABILITY_COOLDOWN_MULTIPLIER.MIN));
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
        
        state.combatants.forEach((combatant: any) => {
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
        
        if (targetingStrategy < 0.3) {
            // 30% chance: target nearest enemy
            return targetPool.sort((a, b) => a.distance - b.distance)[0];
        } else if (targetingStrategy < 0.8) {
            // 50% chance: target lowest health enemy (increased from 30%)
            return targetPool.sort((a, b) => a.health - b.health)[0];
        } else {
            // 20% chance: target random enemy (decreased from 30%)
            return targetPool[Math.floor(Math.random() * targetPool.length)];
        }
    }

    private findEnemiesInRange(bot: any, state: SharedGameState): any[] {
        const enemies: any[] = [];
        
        state.combatants.forEach((combatant: any) => {
            // Skip allies and dead entities
            if (combatant.team === bot.team || combatant.health <= 0) {
                return;
            }

            // Calculate distance
            const dx = combatant.x - bot.x;
            const dy = combatant.y - bot.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Check if in attack range
            if (distance <= bot.attackRadius) {
                enemies.push({ ...combatant, distance });
            }
        });

        // Sort by distance (closest first)
        return enemies.sort((a, b) => a.distance - b.distance);
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
} 