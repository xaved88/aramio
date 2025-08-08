import { GameState, Hero, RoundStats } from '../../../schema/GameState';
import { SpawnPlayerAction, StateMachineResult } from '../types';
import { GAMEPLAY_CONFIG } from '../../../../Config';
import { COMBATANT_TYPES } from '../../../../shared/types/CombatantTypes';
import { AbilityFactory } from '../../abilities/AbilityFactory';

export function handleSpawnPlayer(state: GameState, action: SpawnPlayerAction): StateMachineResult {
    const { playerId, team, x, y, abilityType = 'default' } = action.payload;
    
    const hero = new Hero();
    hero.id = `hero-${Date.now()}-${Math.random()}`;
    hero.type = COMBATANT_TYPES.HERO;
    hero.team = team;
    hero.controller = playerId; // client ID becomes the controller
    
    // Handle optional coordinates
    if (x !== undefined && y !== undefined) {
        hero.x = x;
        hero.y = y;
    } else {
        // Default spawn near cradle
        if (team === 'blue') {
            hero.x = GAMEPLAY_CONFIG.CRADLE_POSITIONS.BLUE.x + GAMEPLAY_CONFIG.PLAYER_SPAWN_OFFSET;
            hero.y = GAMEPLAY_CONFIG.CRADLE_POSITIONS.BLUE.y - GAMEPLAY_CONFIG.PLAYER_SPAWN_OFFSET;
        } else {
            hero.x = GAMEPLAY_CONFIG.CRADLE_POSITIONS.RED.x - GAMEPLAY_CONFIG.PLAYER_SPAWN_OFFSET;
            hero.y = GAMEPLAY_CONFIG.CRADLE_POSITIONS.RED.y + GAMEPLAY_CONFIG.PLAYER_SPAWN_OFFSET;
        }
    }
    
    hero.health = GAMEPLAY_CONFIG.COMBAT.HERO.HEALTH;
    hero.maxHealth = GAMEPLAY_CONFIG.COMBAT.HERO.HEALTH;
    hero.attackRadius = GAMEPLAY_CONFIG.COMBAT.HERO.ATTACK_RADIUS;
    hero.attackStrength = GAMEPLAY_CONFIG.COMBAT.HERO.ATTACK_STRENGTH;
    hero.attackSpeed = GAMEPLAY_CONFIG.COMBAT.HERO.ATTACK_SPEED;
    hero.size = GAMEPLAY_CONFIG.COMBAT.HERO.SIZE;
    hero.windUp = GAMEPLAY_CONFIG.COMBAT.HERO.WIND_UP;
    hero.attackReadyAt = 0;
    hero.controller = playerId;
    hero.experience = 0;
    hero.level = 1;
    hero.lastAttackTime = 0;
    hero.state = 'alive';
    hero.respawnTime = 0;
    hero.respawnDuration = GAMEPLAY_CONFIG.COMBAT.HERO.RESPAWN_TIME_MS;
    
    // Initialize round stats
    hero.roundStats = new RoundStats();
    hero.roundStats.totalExperience = 0;
    hero.roundStats.minionKills = 0;
    hero.roundStats.heroKills = 0;
    hero.roundStats.turretKills = 0;
    hero.roundStats.damageTaken = 0;
    hero.roundStats.damageDealt = 0;
    
    // Initialize ability
    hero.ability = AbilityFactory.create(abilityType);
    
    // Add hero to state
    state.combatants.set(hero.id, hero);
    
    return { newState: state };
} 
