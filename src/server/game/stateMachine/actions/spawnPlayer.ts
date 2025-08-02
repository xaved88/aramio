import { GameState, Player } from '../../../schema/GameState';
import { SpawnPlayerAction, StateMachineResult } from '../types';
import { GAMEPLAY_CONFIG } from '../../../../Config';
import { COMBATANT_TYPES } from '../../../../shared/types/CombatantTypes';
import { deepCopyGameState } from '../utils/stateCopyUtils';

export function handleSpawnPlayer(state: GameState, action: SpawnPlayerAction): StateMachineResult {
    const newState = deepCopyGameState(state);
    
    // Create new player
    const player = new Player();
    player.id = action.payload.playerId;
    player.type = COMBATANT_TYPES.PLAYER;
    player.team = action.payload.team;
    
    // Spawn player near their team's cradle
    if (player.team === 'blue') {
        player.x = GAMEPLAY_CONFIG.CRADLE_POSITIONS.BLUE.x + GAMEPLAY_CONFIG.PLAYER_SPAWN_OFFSET;
        player.y = GAMEPLAY_CONFIG.CRADLE_POSITIONS.BLUE.y - GAMEPLAY_CONFIG.PLAYER_SPAWN_OFFSET;
    } else {
        player.x = GAMEPLAY_CONFIG.CRADLE_POSITIONS.RED.x - GAMEPLAY_CONFIG.PLAYER_SPAWN_OFFSET;
        player.y = GAMEPLAY_CONFIG.CRADLE_POSITIONS.RED.y + GAMEPLAY_CONFIG.PLAYER_SPAWN_OFFSET;
    }
    
    player.health = GAMEPLAY_CONFIG.COMBAT.PLAYER.HEALTH;
    player.maxHealth = GAMEPLAY_CONFIG.COMBAT.PLAYER.HEALTH;
    player.attackRadius = GAMEPLAY_CONFIG.COMBAT.PLAYER.ATTACK_RADIUS;
    player.attackStrength = GAMEPLAY_CONFIG.COMBAT.PLAYER.ATTACK_STRENGTH;
    player.attackSpeed = GAMEPLAY_CONFIG.COMBAT.PLAYER.ATTACK_SPEED;
    player.respawnDuration = GAMEPLAY_CONFIG.COMBAT.PLAYER.RESPAWN_TIME_MS;
    player.experience = 0;
    player.level = 1;
    player.lastAttackTime = 0;
    player.state = 'alive';
    player.respawnTime = 0;
    
    newState.combatants.set(player.id, player);
    
    return { newState };
} 