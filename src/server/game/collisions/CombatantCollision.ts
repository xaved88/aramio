import { GameState } from '../../schema/GameState';
import { Combatant } from '../../schema/Combatants';
import { COMBATANT_TYPES } from '../../../shared/types/CombatantTypes';
import { CombatantUtils } from '../combatants/CombatantUtils';
import { GameplayConfig } from '../../config/ConfigProvider';

/**
 * Handles collision detection and resolution between combatants
 */
export function handleCombatantCollisions(state: GameState, gameplayConfig: GameplayConfig): void {
    const allCombatants = Array.from(state.combatants.values());
    
    // Filter out combatants with nocollision effects for performance
    const collisionCombatants = allCombatants.filter(combatant => {
        if (!CombatantUtils.isCombatantAlive(combatant)) return false;
        
        // Check if combatant has nocollision effect
        if (combatant.effects && combatant.effects.length > 0) {
            const hasNoCollision = combatant.effects.some(effect => effect.type === 'nocollision');
            if (hasNoCollision) return false;
        }
        
        return true;
    });
    
    // Check each pair of combatants for collisions
    for (let i = 0; i < collisionCombatants.length; i++) {
        for (let j = i + 1; j < collisionCombatants.length; j++) {
            const combatant1 = collisionCombatants[i];
            const combatant2 = collisionCombatants[j];
            
            // Calculate distance between centers
            const distance = CombatantUtils.getDistance(combatant1, combatant2);
            const collisionThreshold = (combatant1.size + combatant2.size) * gameplayConfig.COMBAT.COLLISION_THRESHOLD_MULTIPLIER;
            
            // Check if they're colliding
            if (distance < collisionThreshold) {
                resolveCombatantCollision(combatant1, combatant2, distance, collisionThreshold);
            }
        }
    }
}

function resolveCombatantCollision(combatant1: any, combatant2: any, distance: number, collisionThreshold: number): void {
    const isStructure1 = combatant1.type === COMBATANT_TYPES.CRADLE || combatant1.type === COMBATANT_TYPES.TURRET;
    const isStructure2 = combatant2.type === COMBATANT_TYPES.CRADLE || combatant2.type === COMBATANT_TYPES.TURRET;
    
    // If both are structures, ignore collision
    if (isStructure1 && isStructure2) {
        return;
    }
    
    // Calculate how much they're overlapping
    const overlap = collisionThreshold - distance;
    
    // Calculate direction vector from combatant1 to combatant2
    const dx = combatant2.x - combatant1.x;
    const dy = combatant2.y - combatant1.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    
    // Handle zero length (combatants at exact same position) to prevent NaN
    if (length === 0) {
        // Use a small random offset to separate them
        const offsetX = (Math.random() - 0.5) * 4;
        const offsetY = (Math.random() - 0.5) * 4;
        combatant1.x += offsetX;
        combatant1.y += offsetY;
        combatant2.x -= offsetX;
        combatant2.y -= offsetY;
        return;
    }
    
    // Normalize direction vector
    const dirX = dx / length;
    const dirY = dy / length;
    
    if (isStructure1 && !isStructure2) {
        // Structure vs unit: move unit away the full distance
        combatant2.x += dirX * overlap;
        combatant2.y += dirY * overlap;
    } else if (!isStructure1 && isStructure2) {
        // Unit vs structure: move unit away the full distance
        combatant1.x -= dirX * overlap;
        combatant1.y -= dirY * overlap;
    } else {
        // Unit vs unit: move proportionally based on size (larger units move less)
        const totalSize = combatant1.size + combatant2.size;
        const moveRatio1 = combatant2.size / totalSize; // Larger unit moves less
        const moveRatio2 = combatant1.size / totalSize; // Smaller unit moves more
        
        combatant1.x -= dirX * overlap * moveRatio1;
        combatant1.y -= dirY * overlap * moveRatio1;
        combatant2.x += dirX * overlap * moveRatio2;
        combatant2.y += dirY * overlap * moveRatio2;
    }
}
