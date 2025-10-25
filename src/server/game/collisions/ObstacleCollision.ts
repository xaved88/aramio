import { GameState } from '../../schema/GameState';
import { Obstacle } from '../../schema/Obstacles';
import { Combatant } from '../../schema/Combatants';
import { CombatantUtils } from '../combatants/CombatantUtils';
import { GameplayConfig } from '../../config/ConfigProvider';
import { HITBOX_TYPES } from '../../../shared/types/ObstacleTypes';
import { circleRotatedRectangleIntersection, circleRectangleIntersection } from './CollisionUtils';

/**
 * Handles collision detection and resolution between combatants and obstacles
 */
export function checkObstacleCollisions(state: GameState, gameplayConfig: GameplayConfig): void {
    const allCombatants = Array.from(state.combatants.values());
    const allObstacles = Array.from(state.obstacles.values());
    
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
    
    // Check each combatant against each obstacle
    collisionCombatants.forEach(combatant => {
        allObstacles.forEach(obstacle => {
            if (!obstacle.blocksMovement) return;
            
            if (checkCombatantObstacleCollision(combatant, obstacle)) {
                resolveCombatantObstacleCollision(combatant, obstacle);
            }
        });
    });
}

/**
 * Check if a combatant is colliding with an obstacle
 */
function checkCombatantObstacleCollision(combatant: Combatant, obstacle: Obstacle): boolean {
    const combatantRadius = combatant.size;
    
    switch (obstacle.hitboxType) {
        case HITBOX_TYPES.RECTANGLE:
            if (obstacle.width && obstacle.height) {
                if (obstacle.rotation && obstacle.rotation !== 0) {
                    return circleRotatedRectangleIntersection(
                        combatant.x, combatant.y, combatantRadius,
                        obstacle.x, obstacle.y, obstacle.width, obstacle.height, obstacle.rotation
                    );
                } else {
                    return circleRectangleIntersection(
                        combatant.x, combatant.y, combatantRadius,
                        obstacle.x, obstacle.y, obstacle.width, obstacle.height
                    );
                }
            }
            return false;
            
        case HITBOX_TYPES.CIRCLE:
            if (obstacle.radius) {
                const dx = combatant.x - obstacle.x;
                const dy = combatant.y - obstacle.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                return distance < (combatantRadius + obstacle.radius);
            }
            return false;
            
        default:
            return false;
    }
}

/**
 * Resolve collision between a combatant and an obstacle
 * Similar to structure collision - push combatant away
 */
function resolveCombatantObstacleCollision(combatant: Combatant, obstacle: Obstacle): void {
    let pushX = 0;
    let pushY = 0;
    
    switch (obstacle.hitboxType) {
        case HITBOX_TYPES.RECTANGLE:
            if (obstacle.width && obstacle.height) {
                const halfWidth = obstacle.width / 2;
                const halfHeight = obstacle.height / 2;
                
                // Calculate closest point on rectangle to combatant
                let closestX = Math.max(obstacle.x - halfWidth, Math.min(obstacle.x + halfWidth, combatant.x));
                let closestY = Math.max(obstacle.y - halfHeight, Math.min(obstacle.y + halfHeight, combatant.y));
                
                // If obstacle is rotated, transform coordinates
                if (obstacle.rotation && obstacle.rotation !== 0) {
                    const cos = Math.cos(obstacle.rotation);
                    const sin = Math.sin(obstacle.rotation);
                    
                    // Transform combatant position to obstacle's local space
                    const localX = (combatant.x - obstacle.x) * cos + (combatant.y - obstacle.y) * sin;
                    const localY = -(combatant.x - obstacle.x) * sin + (combatant.y - obstacle.y) * cos;
                    
                    // Find closest point in local space
                    const localClosestX = Math.max(-halfWidth, Math.min(halfWidth, localX));
                    const localClosestY = Math.max(-halfHeight, Math.min(halfHeight, localY));
                    
                    // Transform back to world space
                    closestX = obstacle.x + localClosestX * cos - localClosestY * sin;
                    closestY = obstacle.y + localClosestX * sin + localClosestY * cos;
                }
                
                // Calculate push direction
                const dx = combatant.x - closestX;
                const dy = combatant.y - closestY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance > 0) {
                    // Calculate how much the combatant is overlapping with the rectangle
                    const combatantRadius = combatant.size;
                    const overlap = combatantRadius - distance;
                    
                    if (overlap > 0) {
                        // Push the combatant away by just the overlap amount
                        const pushRatio = overlap / distance;
                        pushX = dx * pushRatio;
                        pushY = dy * pushRatio;
                    }
                }
            }
            break;
            
        case HITBOX_TYPES.CIRCLE:
            if (obstacle.radius) {
                const dx = combatant.x - obstacle.x;
                const dy = combatant.y - obstacle.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance > 0) {
                    // Calculate how much the combatant is overlapping with the circle
                    const combatantRadius = combatant.size;
                    const minSeparation = combatantRadius + obstacle.radius;
                    const overlap = minSeparation - distance;
                    
                    if (overlap > 0) {
                        // Push the combatant away by just the overlap amount
                        const pushRatio = overlap / distance;
                        pushX = dx * pushRatio;
                        pushY = dy * pushRatio;
                    }
                }
            }
            break;
    }
    
    // Apply push
    combatant.x += pushX;
    combatant.y += pushY;
}
