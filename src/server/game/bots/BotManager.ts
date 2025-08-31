import { GameState } from '../../schema/GameState';
import { SimpletonBotStrategy } from './strategies/SimpletonBotStrategy';
import { HookshotBotStrategy } from './strategies/HookshotBotStrategy';
import { MercenaryBotStrategy } from './strategies/MercenaryBotStrategy';
import { convertToSharedGameState } from '../../../shared/utils/StateConverter';
import { GameCommand } from '../../../shared/types/GameCommands';

export class BotManager {
    private strategies: Map<string, any> = new Map();

    constructor() {
        // Register bot strategies
        this.strategies.set('bot-simpleton', new SimpletonBotStrategy());
        this.strategies.set('bot-hookshot', new HookshotBotStrategy());
        this.strategies.set('bot-mercenary', new MercenaryBotStrategy());
    }

    /**
     * Process all bots and generate commands for them
     */
    processBots(state: GameState): GameCommand[] {
        const commands: GameCommand[] = [];
        const sharedState = convertToSharedGameState(state);

        // Find all bot-controlled heroes
        state.combatants.forEach((combatant: any) => {
            if (combatant.type === 'hero' && combatant.controller.startsWith('bot-')) {
                const strategy = this.strategies.get(combatant.controller);

                if (strategy) {
                    const botCommands = strategy.generateCommands(combatant, sharedState);
                    commands.push(...botCommands);
                }
                
                // Add reward claiming behavior for bots
                const rewardCommands = this.generateRewardCommands(combatant);
                commands.push(...rewardCommands);
            }
        });

        return commands;
    }

    /**
     * Generate reward claiming commands for bots
     */
    private generateRewardCommands(bot: any): GameCommand[] {
        const commands: GameCommand[] = [];
        
        // Check if bot has reward choices available
        if (bot.rewardsForChoice && bot.rewardsForChoice.length > 0) {
            // Bot always chooses the first reward option
            const firstRewardId = bot.rewardsForChoice[0];
            commands.push({
                type: 'choose_reward',
                data: {
                    heroId: bot.id,
                    rewardId: firstRewardId
                }
            });
        }
        
        return commands;
    }
} 