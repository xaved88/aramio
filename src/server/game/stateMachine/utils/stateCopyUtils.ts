import { GameState, Combatant, Player } from '../../../schema/GameState';
import { COMBATANT_TYPES } from '../../../../shared/types/CombatantTypes';

/**
 * Deep copies a combatant to ensure proper state management
 * @param combatant The combatant to copy
 * @returns A new combatant instance with all properties copied
 */
export function deepCopyCombatant(combatant: Combatant): Combatant {
    let newCombatant: Combatant;
    
    // Create the correct type of combatant
    if (combatant.type === COMBATANT_TYPES.PLAYER) {
        newCombatant = new Player();
    } else {
        newCombatant = new Combatant();
    }
    
    // Copy base properties
    newCombatant.id = combatant.id;
    newCombatant.type = combatant.type;
    newCombatant.x = combatant.x;
    newCombatant.y = combatant.y;
    newCombatant.team = combatant.team;
    newCombatant.health = combatant.health;
    newCombatant.maxHealth = combatant.maxHealth;
    newCombatant.attackRadius = combatant.attackRadius;
    newCombatant.attackStrength = combatant.attackStrength;
    newCombatant.attackSpeed = combatant.attackSpeed;
    newCombatant.lastAttackTime = combatant.lastAttackTime;
    
    // If it's a player, copy player-specific properties
    if (combatant.type === COMBATANT_TYPES.PLAYER) {
        const player = combatant as Player;
        const newPlayer = newCombatant as Player;
        newPlayer.state = player.state;
        newPlayer.respawnTime = player.respawnTime;
        newPlayer.respawnDuration = player.respawnDuration;
        newPlayer.experience = player.experience;
        newPlayer.level = player.level;
    }
    
    return newCombatant;
}

/**
 * Deep copies a game state to ensure proper state management
 * @param state The game state to copy
 * @returns A new game state with all combatants and events copied
 */
export function deepCopyGameState(state: GameState): GameState {
    const newState = new GameState();
    newState.gameTime = state.gameTime;
    newState.gamePhase = state.gamePhase;
    
    // Copy all existing combatants
    state.combatants.forEach((combatant, id) => {
        const newCombatant = deepCopyCombatant(combatant);
        newState.combatants.set(id, newCombatant);
    });
    
    // Copy attack events
    state.attackEvents.forEach(event => {
        newState.attackEvents.push(event);
    });
    
    return newState;
} 