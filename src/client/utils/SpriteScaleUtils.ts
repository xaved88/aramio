import { Combatant, COMBATANT_TYPES, isHeroCombatant } from '../../shared/types/CombatantTypes';
import { CLIENT_CONFIG } from '../../ClientConfig';

/**
 * Gets the sprite scale multiplier for a combatant.
 * This is used for visual scaling that doesn't affect hitboxes.
 * For heroes, this returns the configured scale based on ability type.
 * For other entities, returns 1.0 (no additional scaling).
 */
export function getSpriteScale(combatant: Combatant): number {
    if (combatant.type === COMBATANT_TYPES.HERO && isHeroCombatant(combatant)) {
        const abilityType = combatant.ability?.type || 'default';
        return CLIENT_CONFIG.HERO_SPRITE_SCALES[abilityType] || 1.0;
    }
    return 1.0;
}

