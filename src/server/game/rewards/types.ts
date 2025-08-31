import { StatType, StatOperator } from '../../../shared/types/CombatantTypes';

export interface RewardModifier {
    type: 'flat' | 'percent';
    value: number;
}

export interface StatRewardConfig {
    stat: StatType;
    modifier: RewardModifier;
}

export interface StatReward {
    type: 'stat';
    stats: StatRewardConfig[];
}

export interface RewardDefinition {
    type: string;
    stats?: StatRewardConfig[];
}

export interface ChestReward {
    id: string;
    weight: number;
}

export interface ChestDefinition {
    rewards: ChestReward[];
}
