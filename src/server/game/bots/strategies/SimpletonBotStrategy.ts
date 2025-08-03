import { SharedGameState } from '../../../../shared/types/GameStateTypes';
import { BotCommand } from '../BotManager';
import { GAMEPLAY_CONFIG } from '../../../../Config';

export class SimpletonBotStrategy {
    generateCommands(bot: any, state: SharedGameState): BotCommand[] {
        const commands: BotCommand[] = [];

        // Skip if bot is dead or respawning
        if (bot.health <= 0 || bot.state === 'respawning') {
            return commands;
        }

        // Find enemies in attack range
        const enemiesInRange = this.findEnemiesInRange(bot, state);
        
        if (enemiesInRange.length > 0) {
            // Stay in place to attack (combat system handles basic attacks automatically)
            // Occasionally use ability (20% chance)
            if (Math.random() < 0.2) {
                const closestEnemy = enemiesInRange[0];
                commands.push({
                    type: 'useAbility',
                    data: { x: closestEnemy.x, y: closestEnemy.y },
                    clientId: bot.controller
                });
            }
        } else {
            // Move toward enemy cradle
            const targetPosition = this.getEnemyCradlePosition(bot.team);
            commands.push({
                type: 'move',
                data: { targetX: targetPosition.x, targetY: targetPosition.y },
                clientId: bot.controller
            });
        }

        return commands;
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
        if (team === 'blue') {
            return GAMEPLAY_CONFIG.CRADLE_POSITIONS.RED;
        } else {
            return GAMEPLAY_CONFIG.CRADLE_POSITIONS.BLUE;
        }
    }
} 