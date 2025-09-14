/**
 * Calculates the total XP needed to reach a specific level
 * @param targetLevel The level to calculate XP for
 * @param levelUpMultiplier The multiplier used for XP calculation per level
 * @returns The total XP needed to reach that level
 */
export function calculateXPForLevel(targetLevel: number, levelUpMultiplier: number): number {
    if (targetLevel <= 1) return 0;
    
    let totalXP = 0;
    for (let level = 1; level < targetLevel; level++) {
        totalXP += level * levelUpMultiplier;
    }
    return totalXP;
}


