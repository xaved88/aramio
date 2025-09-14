import { GAMEPLAY_CONFIG } from '../../GameConfig';

/**
 * Calculates the total XP needed to reach a specific level
 * @param targetLevel The level to calculate XP for
 * @returns The total XP needed to reach that level
 */
export function calculateXPForLevel(targetLevel: number): number {
    if (targetLevel <= 1) return 0;
    
    let totalXP = 0;
    for (let level = 1; level < targetLevel; level++) {
        totalXP += level * GAMEPLAY_CONFIG.EXPERIENCE.LEVEL_UP_MULTIPLIER;
    }
    return totalXP;
}


