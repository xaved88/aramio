import { GameState } from '../../schema/GameState';
import { ControllerId, CombatantId } from '../../../shared/types/CombatantTypes';

export interface GameAction {
    type: string;
    payload?: any;
}

export interface SetupGameAction extends GameAction {
    type: 'SETUP_GAME';
}

export interface SpawnPlayerAction extends GameAction {
    type: 'SPAWN_PLAYER';
    payload: {
        playerId: ControllerId;
        team: 'blue' | 'red';
        x?: number;
        y?: number;
        abilityType?: string;
    };
}

export interface RemovePlayerAction extends GameAction {
    type: 'REMOVE_PLAYER';
    payload: {
        playerId: ControllerId;
    };
}

export interface MoveHeroAction extends GameAction {
    type: 'MOVE_HERO';
    payload: {
        heroId: CombatantId;
        targetX: number;
        targetY: number;
    };
}

export interface UpdateGameAction extends GameAction {
    type: 'UPDATE_GAME';
    payload: {
        deltaTime: number;
    };
}

export interface EndGameAction extends GameAction {
    type: 'END_GAME';
    payload: {
        winningTeam: 'blue' | 'red';
    };
}

export type GameActionTypes = 
    | SetupGameAction 
    | SpawnPlayerAction 
    | RemovePlayerAction 
    | MoveHeroAction 
    | UpdateGameAction 
    | EndGameAction;

export interface StateMachineResult {
    newState: GameState;
    events?: any[]; // For any side effects that need to be handled by the room
} 
