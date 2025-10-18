import { IBotBehavior } from './IBotBehavior';
import { GameCommand } from '../../../../shared/types/GameCommands';
import { SharedGameState } from '../../../../shared/types/GameStateTypes';
import { GameState } from '../../../schema/GameState';
import { GameplayConfig } from '../../../config/ConfigProvider';
import { SimpletonBotStrategy } from '../strategies/SimpletonBotStrategy';
import { HookshotBotStrategy } from '../strategies/HookshotBotStrategy';
import { MercenaryBotStrategy } from '../strategies/MercenaryBotStrategy';
import { BotRewardSelector } from '../BotRewardSelector';

export class OriginalBotBehavior implements IBotBehavior {
    private strategies: Map<string, any> = new Map();

    constructor(gameplayConfig: GameplayConfig) {
        // Register bot strategies
        this.strategies.set('bot-simpleton', new SimpletonBotStrategy(gameplayConfig));
        this.strategies.set('bot-hookshot', new HookshotBotStrategy(gameplayConfig));
        this.strategies.set('bot-mercenary', new MercenaryBotStrategy(gameplayConfig));
    }

    generateActionCommands(bot: any, state: SharedGameState, gameplayConfig: GameplayConfig): GameCommand[] {
        const commands: GameCommand[] = [];

        // Skip if bot is dead or respawning
        if (bot.health <= 0 || bot.state === 'respawning') {
            return commands;
        }

        // Dynamically determine strategy based on current ability
        const abilityType = bot.ability?.type || 'default';
        const strategy = this.getStrategyForAbility(abilityType);

        if (strategy) {
            const botCommands = strategy.generateCommands(bot, state);
            commands.push(...botCommands);
        }

        return commands;
    }

    selectReward(bot: any, state: GameState, gameplayConfig: GameplayConfig): string {
        return BotRewardSelector.selectBestReward(bot, state, gameplayConfig);
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
    private selectBotStrategyForAbility(abilityType: string): string {
        switch (abilityType) {
            case 'hookshot':
                return 'bot-hookshot';
            case 'mercenary':
                return 'bot-mercenary';
            default:
                return 'bot-simpleton';
        }
    }
}
