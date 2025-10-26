import { findClearPath } from '../collisions/CollisionUtils';
import { CombatantUtils } from '../combatants/CombatantUtils';

const COLLISION_AVOIDANCE_ENABLED = true;

export function applyBotCollisionAvoidance(
    bot: any, 
    targetX: number, 
    targetY: number, 
    allCombatants: any[], 
    allObstacles: any[],
    gameplayConfig: any
): { x: number, y: number } {
    if (!COLLISION_AVOIDANCE_ENABLED) {
        return { x: targetX, y: targetY };
    }
    
    if (!bot.getMoveSpeed || !bot.size) {
        return { x: targetX, y: targetY };
    }
    
    const obstacles = allObstacles.filter(obs => obs.blocksMovement);
    const filteredCombatants = allCombatants.filter((combatant: any) => {
        if (combatant.health <= 0) return false;
        if (combatant.effects?.some((effect: any) => effect.type === 'nocollision')) return false;
        return combatant.id !== bot.id;
    });
    
    return findClearPath(
        bot.x,
        bot.y,
        targetX,
        targetY,
        bot.getMoveSpeed(),
        bot.size,
        obstacles,
        filteredCombatants,
        bot.id,
        gameplayConfig
    );
}

