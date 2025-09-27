/**
 * Calculates the XP needed for a specific level using diminishing returns scaling
 * @param level The level to calculate XP for
 * @param gameplayConfig The gameplay configuration containing XP settings
 * @returns The XP needed for that specific level
 */
export function calculateXPForSpecificLevel(level: number, gameplayConfig: any): number {
    // Diminishing returns: each level's increase is smaller than the previous level's increase
    // Plus quadratic component for higher levels to make them more challenging
    const baseCost = gameplayConfig.EXPERIENCE.LEVEL_UP_BASE_COST;
    const increaseRate = gameplayConfig.EXPERIENCE.LEVEL_UP_INCREASE_RATE;
    const quadraticThreshold = gameplayConfig.EXPERIENCE.LEVEL_UP_QUADRATIC_THRESHOLD || 10;
    const quadraticMultiplier = gameplayConfig.EXPERIENCE.LEVEL_UP_QUADRATIC_MULTIPLIER || 5;
    
    const logCost = baseCost + (increaseRate * Math.log(level));
    const quadraticCost = level > quadraticThreshold ? (level - quadraticThreshold) * quadraticMultiplier : 0;
    const cost = logCost + quadraticCost;
    return Math.round(cost);
}


/**
 * Calculates the total XP needed to reach a specific level
 * @param targetLevel The level to calculate XP for
 * @param gameplayConfig The gameplay configuration containing XP settings
 * @returns The total XP needed to reach that level
 */
export function calculateXPForLevel(targetLevel: number, gameplayConfig: any): number {
    if (targetLevel <= 1) return 0;
    
    let totalXP = 0;
    for (let level = 1; level < targetLevel; level++) {
        totalXP += calculateXPForSpecificLevel(level, gameplayConfig);
    }
    return totalXP;
}


