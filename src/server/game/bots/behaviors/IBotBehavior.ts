import { GameCommand } from '../../../../shared/types/GameCommands';
import { SharedGameState } from '../../../../shared/types/GameStateTypes';
import { GameState } from '../../../schema/GameState';
import { GameplayConfig } from '../../../config/ConfigProvider';

export interface IBotBehavior {
    /**
     * Generate action commands for a bot (movement, ability use, etc.)
     */
    generateActionCommands(bot: any, state: SharedGameState, gameplayConfig: GameplayConfig): GameCommand[];
    
    /**
     * Select a reward for a bot when leveling up
     */
    selectReward(bot: any, state: GameState, gameplayConfig: GameplayConfig): string;
}
