import { GameState, Hero } from '../../../schema/GameState';
import { MovePlayerAction, StateMachineResult } from '../types';
import { GAMEPLAY_CONFIG } from '../../../../Config';
import { COMBATANT_TYPES } from '../../../../shared/types/CombatantTypes';

export function handleMovePlayer(state: GameState, action: MovePlayerAction): StateMachineResult {
    // Find hero by controller (client ID)
    let hero: Hero | undefined;
    state.combatants.forEach((combatant) => {
        if (combatant.type === COMBATANT_TYPES.HERO && (combatant as Hero).controller === action.payload.playerId) {
            hero = combatant as Hero;
        }
    });
    
    if (hero) {
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
        if (distance < GAMEPLAY_CONFIG.PLAYER_STOP_DISTANCE) {
            return { newState: state };
        }
        
        // Normalize direction and apply speed
        const normalizedDx = dx / distance;
        const normalizedDy = dy / distance;
        
        // Calculate new position
        const newX = hero.x + normalizedDx * GAMEPLAY_CONFIG.PLAYER_MOVE_SPEED;
        const newY = hero.y + normalizedDy * GAMEPLAY_CONFIG.PLAYER_MOVE_SPEED;
        
        // Clamp to game bounds
        hero.x = Math.max(GAMEPLAY_CONFIG.GAME_BOUNDS.MIN_X, Math.min(GAMEPLAY_CONFIG.GAME_BOUNDS.MAX_X, newX));
        hero.y = Math.max(GAMEPLAY_CONFIG.GAME_BOUNDS.MIN_Y, Math.min(GAMEPLAY_CONFIG.GAME_BOUNDS.MAX_Y, newY));
    }
    
    return { newState: state };
} 
