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

export interface AbilityReward {
    type: 'ability';
    abilityType: string;
}

export interface AbilityStatReward {
    type: 'ability_stat';
    stats: StatRewardConfig[]; // Same structure as base stats
}

export interface RewardDefinition {
    type: 'stat' | 'ability' | 'ability_stat';
    stats?: StatRewardConfig[];
    abilityType?: string;
}

export interface ChestReward {
    id: string;
    weight: number;
}

export interface ChestDefinition {
    rewards: ChestReward[];
}
