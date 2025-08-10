import { GameState } from '../../../schema/GameState';
import { Hero } from '../../../schema/Combatants';
import { RoundStats } from '../../../schema/Events';
import { SpawnPlayerAction, StateMachineResult } from '../types';
import { GAMEPLAY_CONFIG } from '../../../../Config';
import { COMBATANT_TYPES } from '../../../../shared/types/CombatantTypes';
import { AbilityFactory } from '../../abilities/AbilityFactory';

export function handleSpawnPlayer(state: GameState, action: SpawnPlayerAction): StateMachineResult {
    const { playerId, team, x, y, abilityType = 'default' } = action.payload;
    
    const hero = new Hero();
    hero.id = `hero-${state.gameTime}-${Math.random()}`;
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
    
    // Get hero config based on ability type
    const heroConfig = GAMEPLAY_CONFIG.COMBAT.HEROES[abilityType as keyof typeof GAMEPLAY_CONFIG.COMBAT.HEROES] || GAMEPLAY_CONFIG.COMBAT.HEROES.default;
    
    hero.health = heroConfig.HEALTH;
    hero.maxHealth = heroConfig.HEALTH;
    hero.attackRadius = heroConfig.ATTACK_RADIUS;
    hero.attackStrength = heroConfig.ATTACK_STRENGTH;
    hero.attackSpeed = heroConfig.ATTACK_SPEED;
    hero.size = heroConfig.SIZE;
    hero.windUp = heroConfig.WIND_UP;
    hero.moveSpeed = GAMEPLAY_CONFIG.PLAYER_MOVE_SPEED;
    hero.bulletArmor = (heroConfig as any).BULLET_ARMOR || 0;
    hero.abilityArmor = (heroConfig as any).ABILITY_ARMOR || 0;
    hero.attackReadyAt = 0;
    hero.controller = playerId;
    hero.experience = 0;
    hero.level = 1;
    hero.lastAttackTime = 0;
    hero.state = 'alive';
    hero.respawnTime = 0;
    hero.respawnDuration = heroConfig.RESPAWN_TIME_MS;
    
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
