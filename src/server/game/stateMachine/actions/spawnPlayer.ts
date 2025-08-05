import { GameState, Hero, Ability, RoundStats } from '../../../schema/GameState';
import { SpawnPlayerAction, StateMachineResult } from '../types';
import { GAMEPLAY_CONFIG } from '../../../../Config';
import { COMBATANT_TYPES } from '../../../../shared/types/CombatantTypes';

export function handleSpawnPlayer(state: GameState, action: SpawnPlayerAction): StateMachineResult {
    // Create new hero with generated ID
    const hero = new Hero();
    hero.id = `hero-${Date.now()}-${Math.random()}`;
    hero.type = COMBATANT_TYPES.HERO;
    hero.team = action.payload.team;
    hero.controller = action.payload.playerId; // client ID becomes the controller
    
    // Spawn hero at custom position or near their team's cradle
    if (action.payload.x !== undefined && action.payload.y !== undefined) {
        hero.x = action.payload.x;
        hero.y = action.payload.y;
    } else {
        // Default spawn near cradle
        if (hero.team === 'blue') {
            hero.x = GAMEPLAY_CONFIG.CRADLE_POSITIONS.BLUE.x + GAMEPLAY_CONFIG.PLAYER_SPAWN_OFFSET;
            hero.y = GAMEPLAY_CONFIG.CRADLE_POSITIONS.BLUE.y - GAMEPLAY_CONFIG.PLAYER_SPAWN_OFFSET;
        } else {
            hero.x = GAMEPLAY_CONFIG.CRADLE_POSITIONS.RED.x - GAMEPLAY_CONFIG.PLAYER_SPAWN_OFFSET;
            hero.y = GAMEPLAY_CONFIG.CRADLE_POSITIONS.RED.y + GAMEPLAY_CONFIG.PLAYER_SPAWN_OFFSET;
        }
    }
    
    hero.health = GAMEPLAY_CONFIG.COMBAT.PLAYER.HEALTH;
    hero.maxHealth = GAMEPLAY_CONFIG.COMBAT.PLAYER.HEALTH;
    hero.attackRadius = GAMEPLAY_CONFIG.COMBAT.PLAYER.ATTACK_RADIUS;
    hero.attackStrength = GAMEPLAY_CONFIG.COMBAT.PLAYER.ATTACK_STRENGTH;
    hero.attackSpeed = GAMEPLAY_CONFIG.COMBAT.PLAYER.ATTACK_SPEED;
    hero.windUp = GAMEPLAY_CONFIG.COMBAT.PLAYER.WIND_UP;
    hero.attackReadyAt = 0; // Initialize to 0 (no wind-up in progress)
    hero.respawnDuration = GAMEPLAY_CONFIG.COMBAT.PLAYER.RESPAWN_TIME_MS;
    hero.size = GAMEPLAY_CONFIG.COMBAT.PLAYER.SIZE;
    hero.experience = 0;
    hero.level = 1;
    hero.lastAttackTime = 0;
    hero.state = 'alive';
    hero.respawnTime = 0;
    
    // Initialize round stats
    hero.roundStats = new RoundStats();
    hero.roundStats.totalExperience = 0;
    hero.roundStats.minionKills = 0;
    hero.roundStats.heroKills = 0;
    hero.roundStats.turretKills = 0;
    hero.roundStats.damageTaken = 0;
    hero.roundStats.damageDealt = 0;
    
    // Initialize ability
    hero.ability = new Ability();
    hero.ability.type = GAMEPLAY_CONFIG.COMBAT.PLAYER.ABILITY.TYPE;
    hero.ability.cooldown = GAMEPLAY_CONFIG.COMBAT.PLAYER.ABILITY.COOLDOWN_MS;
    hero.ability.lastUsedTime = 0; // Start with 0, first use will be available
    hero.ability.strength = GAMEPLAY_CONFIG.COMBAT.PLAYER.ABILITY.STRENGTH;
    
    // Add hero to state
    state.combatants.set(hero.id, hero);
    
    return { newState: state };
} 
