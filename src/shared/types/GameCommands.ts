import { CombatantId } from './CombatantTypes';

export interface GameMoveCommand {
    type: 'move';
    data: {
        heroId: CombatantId;
        targetX: number;
        targetY: number;
    };
}

export interface GameUseAbilityCommand {
    type: 'useAbility';
    data: {
        heroId: CombatantId;
        x: number;
        y: number;
    };
}

export type GameCommand = GameMoveCommand | GameUseAbilityCommand; 