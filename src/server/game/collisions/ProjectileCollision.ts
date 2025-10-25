import { Projectile } from '../../schema/Projectiles';
import { Obstacle } from '../../schema/Obstacles';
import { HITBOX_TYPES } from '../../../shared/types/ObstacleTypes';
import { PROJECTILE_TYPES } from '../../../shared/types/CombatantTypes';
import { lineSegmentIntersectsRectangle, lineSegmentIntersectsCircle } from './CollisionUtils';

const PROJECTILE_COLLISION_WITH_OBSTACLES = {
    [PROJECTILE_TYPES.DEFAULT]: true,
    [PROJECTILE_TYPES.SNIPER]: true,
    [PROJECTILE_TYPES.HOOK]: true,
    [PROJECTILE_TYPES.FIREBALL]: false,
    [PROJECTILE_TYPES.THORNDIVE]: false,
} as const;

/**
 * Check if a projectile collides with any obstacles using trajectory-based detection
 * @param projectile The projectile to check
 * @param obstacles Array of obstacles to check against
 * @param nextX The projectile's next X position
 * @param nextY The projectile's next Y position
 * @returns true if projectile trajectory intersects with any obstacle
 */
export function checkProjectileObstacleCollision(
    projectile: Projectile, 
    obstacles: Obstacle[],
    nextX: number,
    nextY: number
): boolean {
    // Check if this projectile type collides with obstacles
    if (!PROJECTILE_COLLISION_WITH_OBSTACLES[projectile.type as keyof typeof PROJECTILE_COLLISION_WITH_OBSTACLES]) {
        return false;
    }
    
    // Check trajectory line segment against each obstacle
    for (const obstacle of obstacles) {
        if (!obstacle.blocksProjectiles) continue;
        
        let intersects = false;
        
        switch (obstacle.hitboxType) {
            case HITBOX_TYPES.RECTANGLE:
                if (obstacle.width && obstacle.height) {
                    intersects = lineSegmentIntersectsRectangle(
                        projectile.x, projectile.y, nextX, nextY,
                        obstacle.x, obstacle.y, obstacle.width, obstacle.height, obstacle.rotation || 0
                    );
                }
                break;
                
            case HITBOX_TYPES.CIRCLE:
                if (obstacle.radius) {
                    intersects = lineSegmentIntersectsCircle(
                        projectile.x, projectile.y, nextX, nextY,
                        obstacle.x, obstacle.y, obstacle.radius
                    );
                }
                break;
        }
        
        if (intersects) {
            return true;
        }
    }
    
    return false;
}
