import { GameState } from '../../schema/GameState';
import { SimpletonBotStrategy } from './strategies/SimpletonBotStrategy';
import { HookshotBotStrategy } from './strategies/HookshotBotStrategy';
import { convertToSharedGameState } from '../../../shared/utils/StateConverter';
import { GameCommand } from '../../../shared/types/GameCommands';

export class BotManager {
    private strategies: Map<string, any> = new Map();

    constructor() {
        // Register bot strategies
        this.strategies.set('bot-simpleton', new SimpletonBotStrategy());
        this.strategies.set('bot-hookshot', new HookshotBotStrategy());
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
            }
        });

        return commands;
    }
} 