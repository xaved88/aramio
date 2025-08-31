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

export interface GameChooseRewardCommand {
    type: 'choose_reward';
    data: {
        heroId: CombatantId;
        rewardId: string;
    };
}

export type GameCommand = GameMoveCommand | GameUseAbilityCommand | GameChooseRewardCommand; 