import { GameState } from '../../../schema/GameState';
import { Hero } from '../../../schema/Combatants';
import { CombatantEffect } from '../../../schema/Effects';
import { RoundStats } from '../../../schema/Events';
import { SpawnPlayerAction, StateMachineResult } from '../types';
import { COMBATANT_TYPES } from '../../../../shared/types/CombatantTypes';
import { AbilityFactory } from '../../abilities/AbilityFactory';
import { ArraySchema } from '@colyseus/schema';
import { calculateXPForLevel } from '../../../../shared/utils/XPUtils';
import { grantExperience } from './updateGame';
import { GameplayConfig } from '../../../config/ConfigProvider';

export function handleSpawnPlayer(state: GameState, action: SpawnPlayerAction, gameplayConfig: GameplayConfig): StateMachineResult {
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
        // Default spawn at first spawn position for team
        if (team === 'blue') {
            hero.x = gameplayConfig.HERO_SPAWN_POSITIONS.BLUE[0].x;
            hero.y = gameplayConfig.HERO_SPAWN_POSITIONS.BLUE[0].y;
        } else {
            hero.x = gameplayConfig.HERO_SPAWN_POSITIONS.RED[0].x;
            hero.y = gameplayConfig.HERO_SPAWN_POSITIONS.RED[0].y;
        }
    }
    
    // Get hero config based on ability type
    const heroConfig = gameplayConfig.COMBAT.HEROES[abilityType as keyof typeof gameplayConfig.COMBAT.HEROES] || gameplayConfig.COMBAT.HEROES.default;
    
    hero.health = heroConfig.HEALTH;
    hero.maxHealth = heroConfig.HEALTH;
    hero.attackRadius = heroConfig.ATTACK_RADIUS;
    hero.attackStrength = heroConfig.ATTACK_STRENGTH;
    hero.attackSpeed = heroConfig.ATTACK_SPEED;
    hero.size = heroConfig.SIZE;
    hero.windUp = heroConfig.WIND_UP;
    hero.moveSpeed = gameplayConfig.HERO_MOVE_SPEED;
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
    hero.lastDamageTime = 0; // Initialize last damage time
    
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
    
    // Initialize level rewards
    hero.levelRewards = new ArraySchema<string>();
    
    // Initialize rewards for choice
    hero.rewardsForChoice = new ArraySchema<string>();
    
    // Initialize permanent effects
    hero.permanentEffects = new ArraySchema<CombatantEffect>();
    
    // Grant starting XP if STARTING_LEVEL > 1
    if (gameplayConfig.DEBUG.STARTING_LEVEL > 1) {
        const startingXP = calculateXPForLevel(gameplayConfig.DEBUG.STARTING_LEVEL);
        // Use the normal XP granting system instead of direct assignment
        grantExperience(hero, startingXP, state, hero.x, hero.y, 'starting_level', gameplayConfig);
    }
    
    // Add hero to state
    state.combatants.set(hero.id, hero);
    
    return { newState: state };
} 
