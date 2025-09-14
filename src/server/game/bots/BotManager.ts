import { GameState } from '../../schema/GameState';
import { SimpletonBotStrategy } from './strategies/SimpletonBotStrategy';
import { HookshotBotStrategy } from './strategies/HookshotBotStrategy';
import { MercenaryBotStrategy } from './strategies/MercenaryBotStrategy';
import { convertToSharedGameState } from '../../../shared/utils/StateConverter';
import { GameCommand } from '../../../shared/types/GameCommands';
import { GameplayConfig } from '../../config/ConfigProvider';

export class BotManager {
    private strategies: Map<string, any> = new Map();
    private gameplayConfig: GameplayConfig;

    constructor(gameplayConfig: GameplayConfig) {
        this.gameplayConfig = gameplayConfig;
        // Register bot strategies
        this.strategies.set('bot-simpleton', new SimpletonBotStrategy(gameplayConfig));
        this.strategies.set('bot-hookshot', new HookshotBotStrategy(gameplayConfig));
        this.strategies.set('bot-mercenary', new MercenaryBotStrategy(gameplayConfig));
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
                // Dynamically determine strategy based on current ability
                const abilityType = combatant.ability?.type || 'default';
                const strategy = this.getStrategyForAbility(abilityType);

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
     * Get the appropriate strategy for a given ability type
     * This is the single source of truth for bot strategy selection
     */
    private getStrategyForAbility(abilityType: string) {
        const strategyName = this.selectBotStrategyForAbility(abilityType);
        return this.strategies.get(strategyName);
    }

    /**
     * Selects the appropriate bot strategy name based on ability type
     * This is the centralized strategy selection logic
     */
    public selectBotStrategyForAbility(abilityType: string): string {
        switch (abilityType) {
            case 'hookshot':
                return 'bot-hookshot';
            case 'mercenary':
                return 'bot-mercenary';
            default:
                return 'bot-simpleton';
        }
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