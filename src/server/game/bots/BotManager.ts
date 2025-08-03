import { GameState } from '../../schema/GameState';
import { SimpletonBotStrategy } from './strategies/SimpletonBotStrategy';
import { SharedGameState } from '../../../shared/types/GameStateTypes';
import { convertToSharedGameState } from '../../../shared/utils/StateConverter';

export interface BotCommand {
    type: 'move' | 'useAbility';
    data: any;
    clientId: string;
}

export class BotManager {
    private strategies: Map<string, any> = new Map();

    constructor() {
        // Register bot strategies
        this.strategies.set('bot-simpleton', new SimpletonBotStrategy());
    }

    /**
     * Process all bots and generate commands for them
     */
    processBots(state: GameState): BotCommand[] {
        const commands: BotCommand[] = [];
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