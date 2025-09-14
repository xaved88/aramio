import { GameState } from '../../../schema/GameState';
import { EndGameAction, StateMachineResult } from '../types';
import { GameplayConfig } from '../../../config/ConfigProvider';

export function handleEndGame(state: GameState, action: EndGameAction, gameplayConfig: GameplayConfig): StateMachineResult {
    state.gamePhase = 'finished';
    
    return { newState: state };
} 
