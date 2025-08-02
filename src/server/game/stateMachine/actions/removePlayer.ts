import { GameState } from '../../../schema/GameState';
import { RemovePlayerAction, StateMachineResult } from '../types';

export function handleRemovePlayer(state: GameState, action: RemovePlayerAction): StateMachineResult {
    // Remove the specified player
    state.combatants.delete(action.payload.playerId);
    
    return { newState: state };
} 