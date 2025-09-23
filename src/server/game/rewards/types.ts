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
    ability_stat: string; // Ability-specific stats like 'range'
    modifier: RewardModifier;
}

export interface RewardDefinition {
    type: 'stat' | 'ability' | 'ability_stat';
    stats?: StatRewardConfig[];
    abilityType?: string;
    stat?: string;
    ability_stat?: string;
    modifier?: RewardModifier;
}

export interface ChestReward {
    id: string;
    weight: number;
}

export interface ChestDefinition {
    rewards: ChestReward[];
}
