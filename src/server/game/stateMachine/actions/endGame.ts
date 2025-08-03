import { GameState } from '../../../schema/GameState';
import { EndGameAction, StateMachineResult } from '../types';

export function handleEndGame(state: GameState, action: EndGameAction): StateMachineResult {
    state.gamePhase = 'finished';
    
    return { newState: state };
} 
