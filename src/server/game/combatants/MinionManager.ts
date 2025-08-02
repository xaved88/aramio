import { GameState, Minion } from '../../schema/GameState';
import { GAMEPLAY_CONFIG } from '../../../Config';
import { COMBATANT_TYPES } from '../../../shared/types/CombatantTypes';
import { CombatantUtils } from './CombatantUtils';

export class MinionManager {
    static moveMinions(state: GameState): void {
        const allCombatants = Array.from(state.combatants.values());
        
        allCombatants.forEach(combatant => {
            if (combatant.type !== COMBATANT_TYPES.MINION) return;
            if (!CombatantUtils.isCombatantAlive(combatant)) return;
            
            const minion = combatant as Minion;
            this.moveMinion(minion, allCombatants);
        });
    }
    
    private static moveMinion(minion: Minion, allCombatants: any[]): void {
        // Check if minion has enemies in attack range
        const enemiesInRange = allCombatants.filter(target => {
            if (!CombatantUtils.isCombatantAlive(target)) return false;
            if (!CombatantUtils.areOpposingTeams(minion, target)) return false;
            return CombatantUtils.isInRange(minion, target, minion.attackRadius);
        });
        
        // If enemies in range, stand still
        if (enemiesInRange.length > 0) {
            return;
        }
        
        // Otherwise, move towards enemy cradle
        const enemyCradle = this.findEnemyCradle(minion.team, allCombatants);
        if (!enemyCradle) return;
        
        this.moveTowardsTarget(minion, enemyCradle.x, enemyCradle.y);
    }
    
    private static findEnemyCradle(minionTeam: string, allCombatants: any[]): any | null {
        const enemyTeam = minionTeam === 'blue' ? 'red' : 'blue';
        return allCombatants.find(combatant => 
            combatant.type === COMBATANT_TYPES.CRADLE && 
            combatant.team === enemyTeam &&
            CombatantUtils.isCombatantAlive(combatant)
        ) || null;
    }
    
    private static moveTowardsTarget(minion: Minion, targetX: number, targetY: number): void {
        // Calculate direction vector
        const dx = targetX - minion.x;
        const dy = targetY - minion.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // If we're close enough, don't move
        if (distance < GAMEPLAY_CONFIG.PLAYER_STOP_DISTANCE) {
            return;
        }
        
        // Normalize direction and apply speed
        const normalizedDx = dx / distance;
        const normalizedDy = dy / distance;
        
        // Calculate new position
        const newX = minion.x + normalizedDx * GAMEPLAY_CONFIG.MINION_MOVE_SPEED;
        const newY = minion.y + normalizedDy * GAMEPLAY_CONFIG.MINION_MOVE_SPEED;
        
        // Clamp to game bounds
        minion.x = Math.max(GAMEPLAY_CONFIG.GAME_BOUNDS.MIN_X, Math.min(GAMEPLAY_CONFIG.GAME_BOUNDS.MAX_X, newX));
        minion.y = Math.max(GAMEPLAY_CONFIG.GAME_BOUNDS.MIN_Y, Math.min(GAMEPLAY_CONFIG.GAME_BOUNDS.MAX_Y, newY));
    }
} 