import { GameState } from '../../../schema/GameState';
import { EndGameAction, StateMachineResult } from '../types';
import { deepCopyGameState } from '../utils/stateCopyUtils';

export function handleEndGame(state: GameState, action: EndGameAction): StateMachineResult {
    const newState = deepCopyGameState(state);
    newState.gamePhase = 'finished';
    
    return { newState };
} 