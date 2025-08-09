import { StatType, StatOperator } from '../types/CombatantTypes';

/**
 * Applies stat modification effects to a base stat value.
 * This logic is shared between server-side getters and client-side conversion.
 */
export function applyStatModifications(
    statType: StatType, 
    baseStat: number, 
    effects: any[]
): number {
    let modifiedValue = baseStat;

    // Find all StatModEffects for this stat type
    const statModEffects = effects.filter(effect => 
        effect.type === 'statmod' && (effect as any).stat === statType
    );

    // Apply each effect
    for (const effect of statModEffects) {
        const statModEffect = effect as any; // We know it's a StatModEffect
        switch (statModEffect.operator as StatOperator) {
            case 'relative':
                modifiedValue += statModEffect.amount;
                break;
            case 'absolute':
                modifiedValue = statModEffect.amount;
                break;
            case 'percent':
                modifiedValue *= statModEffect.amount;
                break;
        }
    }

    // Allow negative values for armor stats (they amplify damage)
    if (statType === 'bulletArmor' || statType === 'abilityArmor') {
        return modifiedValue;
    }
    return Math.max(0, modifiedValue); // Ensure non-negative values for other stats
}
