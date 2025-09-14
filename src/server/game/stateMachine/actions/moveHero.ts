import { GameState } from '../../../schema/GameState';
import { Hero } from '../../../schema/Combatants';
import { MoveHeroAction, StateMachineResult } from '../types';
import { GAMEPLAY_CONFIG } from '../../../../GameConfig';
import { COMBATANT_TYPES } from '../../../../shared/types/CombatantTypes';
import { getMinX, getMaxX, getMinY, getMaxY } from '../../../../shared/utils/GameBounds';

export function handleMoveHero(state: GameState, action: MoveHeroAction): StateMachineResult {
    // Find hero by ID
    const hero = state.combatants.get(action.payload.heroId) as Hero;
    
    if (hero && hero.type === COMBATANT_TYPES.HERO) {
        // Prevent respawning heroes from moving
        if (hero.state === 'respawning') {
            return { newState: state };
        }
        
        const targetX = action.payload.targetX;
        const targetY = action.payload.targetY;
        
        // Calculate direction vector
        const dx = targetX - hero.x;
        const dy = targetY - hero.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // If we're close enough, don't move
        if (distance < GAMEPLAY_CONFIG.HERO_STOP_DISTANCE) {
            return { newState: state };
        }
        
        // Normalize direction and apply speed
        const normalizedDx = dx / distance;
        const normalizedDy = dy / distance;
        
        // Calculate new position using modified move speed
        const moveSpeed = hero.getMoveSpeed();
        const newX = hero.x + normalizedDx * moveSpeed;
        const newY = hero.y + normalizedDy * moveSpeed;
        
        // Clamp to game bounds
        hero.x = Math.max(getMinX(), Math.min(getMaxX(), newX));
        hero.y = Math.max(getMinY(), Math.min(getMaxY(), newY));
    }
    
    return { newState: state };
} 