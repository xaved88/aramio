import { Projectile } from '../../schema/Projectiles';
import { Obstacle } from '../../schema/Obstacles';
import { HITBOX_TYPES } from '../../../shared/types/ObstacleTypes';

/**
 * Check if a projectile collides with any obstacles
 * Currently returns false (stub for future raycasting implementation)
 */
export function checkProjectileObstacleCollision(projectile: Projectile, obstacles: Obstacle[]): boolean {
    // TODO: Implement proper raycasting for projectile-obstacle collision
    // For now, projectiles pass through obstacles
    return false;
}
