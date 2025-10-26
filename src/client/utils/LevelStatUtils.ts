import { GAMEPLAY_CONFIG } from '../../GameConfig';

/**
 * Utility functions for calculating level-based stat multipliers
 */

export interface LevelStatMultipliers {
    health: number;
    attackStrength: number;
    attackSpeed: number;
    attackRadius: number;
    abilityPower: number;
}

/**
 * Calculates cumulative stat multipliers based on level
 * Uses multiplicative scaling: baseMultiplier ^ (level - 1)
 * Only includes stats that are actually boosted by level in the game
 * 
 * @param level The current level
 * @returns Object containing multipliers for each stat type
 */
export function calculateLevelStatMultipliers(level: number): LevelStatMultipliers {
    // Get scaling factors from existing EXPERIENCE config
    const expConfig = GAMEPLAY_CONFIG.EXPERIENCE;
    
    const multipliers: LevelStatMultipliers = {
        health: Math.pow(1 + expConfig.STAT_BOOST_PERCENTAGE, level - 1),
        attackStrength: Math.pow(1 + expConfig.STAT_BOOST_PERCENTAGE, level - 1),
        attackSpeed: Math.pow(1 + expConfig.STAT_BOOST_PERCENTAGE, level - 1),
        attackRadius: Math.pow(1 + expConfig.RANGE_BOOST_PERCENTAGE, level - 1),
        abilityPower: Math.pow(1 + expConfig.ABILITY_POWER_BOOST_PERCENTAGE, level - 1)
    };

    return multipliers;
}

/**
 * Formats a multiplier as a multiplication factor
 * @param multiplier The multiplier value
 * @returns Formatted multiplication string (e.g., "×1.15", "×2.50", "×100")
 */
export function formatMultiplierAsFactor(multiplier: number): string {
    // For multipliers 100 and above, don't show decimals
    if (multiplier >= 100) {
        return `×${Math.round(multiplier)}`;
    }
    // For multipliers below 100, show 2 decimal places
    return `×${multiplier.toFixed(2)}`;
}

/**
 * Gets a display name for a stat type
 * @param statType The stat type
 * @returns Human-readable display name
 */
export function getStatDisplayName(statType: keyof LevelStatMultipliers): string {
    const displayNames: Record<keyof LevelStatMultipliers, string> = {
        health: 'Health',
        attackStrength: 'Damage',
        attackSpeed: 'Attack Speed',
        attackRadius: 'Attack Range',
        abilityPower: 'Ability Power'
    };
    return displayNames[statType];
}
