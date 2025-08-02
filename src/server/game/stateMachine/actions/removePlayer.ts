import { GameState } from '../../../schema/GameState';
import { RemovePlayerAction, StateMachineResult } from '../types';
import { deepCopyGameState } from '../utils/stateCopyUtils';

export function handleRemovePlayer(state: GameState, action: RemovePlayerAction): StateMachineResult {
    const newState = deepCopyGameState(state);
    
    // Remove the specified player
    newState.combatants.delete(action.payload.playerId);
    
    return { newState };
} 