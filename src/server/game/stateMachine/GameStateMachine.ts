import { GameState } from '../../schema/GameState';
import { GameActionTypes, StateMachineResult } from './types';
import { handleSetupGame } from './actions/setupGame';
import { handleSpawnPlayer } from './actions/spawnPlayer';
import { handleRemovePlayer } from './actions/removePlayer';
import { handleMoveHero } from './actions/moveHero';
import { handleUpdateGame } from './actions/updateGame';
import { handleEndGame } from './actions/endGame';
import { GameplayConfig } from '../../config/ConfigProvider';


/**
 * Pure state machine that processes game actions and returns new states
 */
export class GameStateMachine {
    private gameplayConfig: GameplayConfig;

    constructor(gameplayConfig: GameplayConfig) {
        this.gameplayConfig = gameplayConfig;
    }
    
    /**
     * Processes an action and returns a new game state
     * @param currentState The current game state
     * @param action The action to process
     * @returns The new game state and any events
     */
    processAction(currentState: GameState, action: GameActionTypes): StateMachineResult {
        switch (action.type) {
            case 'SETUP_GAME':
                return handleSetupGame(currentState, action, this.gameplayConfig);
                
            case 'SPAWN_PLAYER':
                return handleSpawnPlayer(currentState, action, this.gameplayConfig);
                
            case 'REMOVE_PLAYER':
                return handleRemovePlayer(currentState, action, this.gameplayConfig);
                
            case 'MOVE_HERO':
                return handleMoveHero(currentState, action, this.gameplayConfig);
                
            case 'UPDATE_GAME':
                return handleUpdateGame(currentState, action, this.gameplayConfig);
                
            case 'END_GAME':
                return handleEndGame(currentState, action, this.gameplayConfig);
                

                
            default:
                // Return unchanged state for unknown actions
                return { newState: currentState };
        }
    }
} 
