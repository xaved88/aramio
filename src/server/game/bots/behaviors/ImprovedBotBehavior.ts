import { IBotBehavior } from './IBotBehavior';
import { GameCommand } from '../../../../shared/types/GameCommands';
import { SharedGameState } from '../../../../shared/types/GameStateTypes';
import { GameState } from '../../../schema/GameState';
import { GameplayConfig } from '../../../config/ConfigProvider';

export class ImprovedBotBehavior implements IBotBehavior {
    generateActionCommands(bot: any, state: SharedGameState, gameplayConfig: GameplayConfig): GameCommand[] {
        const commands: GameCommand[] = [];

        // Skip if bot is dead or respawning
        if (bot.health <= 0 || bot.state === 'respawning') {
            return commands;
        }

        // Simple improved behavior: rush directly to enemy cradle
        const enemyCradlePosition = this.getEnemyCradlePosition(bot.team, gameplayConfig);
        
        commands.push({
            type: 'move',
            data: { heroId: bot.id, targetX: enemyCradlePosition.x, targetY: enemyCradlePosition.y }
        });

        return commands;
    }

    selectReward(bot: any, state: GameState, gameplayConfig: GameplayConfig): string {
        // Simple improved behavior: pick the first available reward
        const availableRewards = Array.from(bot.rewardsForChoice) as string[];
        
        if (availableRewards.length === 0) {
            return '';
        }

        return availableRewards[0];
    }

    private getEnemyCradlePosition(team: string, gameplayConfig: GameplayConfig): { x: number, y: number } {
        // Return the enemy team's cradle position
        return team === 'blue' 
            ? gameplayConfig.CRADLE_POSITIONS.RED 
            : gameplayConfig.CRADLE_POSITIONS.BLUE;
    }
}
