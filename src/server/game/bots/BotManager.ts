import { GameState } from '../../schema/GameState';
import { convertToSharedGameState } from '../../../shared/utils/StateConverter';
import { GameCommand } from '../../../shared/types/GameCommands';
import { GameplayConfig } from '../../config/ConfigProvider';
import { IBotBehavior } from './behaviors/IBotBehavior';
import { OriginalBotBehavior } from './behaviors/OriginalBotBehavior';
import { ImprovedBotBehavior } from './behaviors/ImprovedBotBehavior';

export class BotManager {
    private behavior: IBotBehavior;
    private gameplayConfig: GameplayConfig;

    constructor(gameplayConfig: GameplayConfig) {
        this.gameplayConfig = gameplayConfig;
        
        // Select behavior based on config
        const behaviorType = gameplayConfig.BOTS.BOT_BEHAVIOR;
        switch (behaviorType) {
            case 'improved':
                this.behavior = new ImprovedBotBehavior();
                break;
            case 'original':
            default:
                this.behavior = new OriginalBotBehavior(gameplayConfig);
                break;
        }
    }

    /**
     * Process all bots and generate commands for them
     */
    processBots(state: GameState): GameCommand[] {
        const commands: GameCommand[] = [];
        const sharedState = convertToSharedGameState(state);

        // Find all bot-controlled heroes
        state.combatants.forEach((combatant: any) => {
            if (combatant.type === 'hero' && combatant.controller.startsWith('bot')) {
                // Delegate to behavior for action commands
                const actionCommands = this.behavior.generateActionCommands(combatant, sharedState, this.gameplayConfig);
                commands.push(...actionCommands);
                
                // Add reward claiming behavior for bots
                const rewardCommands = this.generateRewardCommands(combatant, state);
                commands.push(...rewardCommands);
            }
        });

        return commands;
    }

    /**
     * Generate reward claiming commands for bots
     */
    private generateRewardCommands(bot: any, state: GameState): GameCommand[] {
        const commands: GameCommand[] = [];
        
        // Check if bot has reward choices available
        if (bot.rewardsForChoice && bot.rewardsForChoice.length > 0) {
            // Delegate to behavior for reward selection
            const selectedRewardId = this.behavior.selectReward(bot, state, this.gameplayConfig);
            commands.push({
                type: 'choose_reward',
                data: {
                    heroId: bot.id,
                    rewardId: selectedRewardId
                }
            });
        }
        
        return commands;
    }

} 