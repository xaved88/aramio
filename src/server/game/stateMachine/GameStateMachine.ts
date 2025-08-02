import { GameState } from '../../schema/GameState';
import { GameActionTypes, StateMachineResult } from './types';
import { handleSetupGame } from './actions/setupGame';
import { handleSpawnPlayer } from './actions/spawnPlayer';
import { handleRemovePlayer } from './actions/removePlayer';
import { handleMovePlayer } from './actions/movePlayer';
import { handleUpdateGame } from './actions/updateGame';
import { handleEndGame } from './actions/endGame';

/**
 * Pure state machine that processes game actions and returns new states
 */
export class GameStateMachine {
    
    /**
     * Processes an action and returns a new game state
     * @param currentState The current game state
     * @param action The action to process
     * @returns The new game state and any events
     */
    static processAction(currentState: GameState, action: GameActionTypes): StateMachineResult {
        switch (action.type) {
            case 'SETUP_GAME':
                return handleSetupGame(currentState, action);
                
            case 'SPAWN_PLAYER':
                return handleSpawnPlayer(currentState, action);
                
            case 'REMOVE_PLAYER':
                return handleRemovePlayer(currentState, action);
                
            case 'MOVE_PLAYER':
                return handleMovePlayer(currentState, action);
                
            case 'UPDATE_GAME':
                return handleUpdateGame(currentState, action);
                
            case 'END_GAME':
                return handleEndGame(currentState, action);
                
            default:
                // Return unchanged state for unknown actions
                return { newState: currentState };
        }
    }
} 