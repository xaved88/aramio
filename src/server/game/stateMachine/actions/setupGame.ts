import { GameState } from '../../../schema/GameState';
import { Combatant } from '../../../schema/Combatants';
import { SetupGameAction, StateMachineResult } from '../types';
import { GAMEPLAY_CONFIG } from '../../../../Config';
import { COMBATANT_TYPES } from '../../../../shared/types/CombatantTypes';

export function handleSetupGame(state: GameState, action: SetupGameAction): StateMachineResult {
    // Clear existing state
    state.combatants.clear();
    state.attackEvents.clear();
    state.projectiles.clear();
    state.gameTime = 0;
    state.gamePhase = 'playing';
    state.winningTeam = '';
    state.gameEndTime = 0;
    state.currentWave = 0;
    state.warriorSpawnTimes.clear();
    state.archerSpawned.clear();
    
    // Create blue cradle (bottom left)
    const blueCradle = new Combatant();
    blueCradle.id = 'blue-cradle';
    blueCradle.type = COMBATANT_TYPES.CRADLE;
    blueCradle.x = GAMEPLAY_CONFIG.CRADLE_POSITIONS.BLUE.x;
    blueCradle.y = GAMEPLAY_CONFIG.CRADLE_POSITIONS.BLUE.y;
    blueCradle.team = 'blue';
    blueCradle.health = GAMEPLAY_CONFIG.COMBAT.CRADLE.HEALTH;
    blueCradle.maxHealth = GAMEPLAY_CONFIG.COMBAT.CRADLE.HEALTH;
    blueCradle.attackRadius = GAMEPLAY_CONFIG.COMBAT.CRADLE.ATTACK_RADIUS;
    blueCradle.attackStrength = GAMEPLAY_CONFIG.COMBAT.CRADLE.ATTACK_STRENGTH;
    blueCradle.attackSpeed = GAMEPLAY_CONFIG.COMBAT.CRADLE.ATTACK_SPEED;
    blueCradle.windUp = GAMEPLAY_CONFIG.COMBAT.CRADLE.WIND_UP;
    blueCradle.attackReadyAt = 0; // Initialize to 0 (no wind-up in progress)
    blueCradle.size = GAMEPLAY_CONFIG.COMBAT.CRADLE.SIZE;
    blueCradle.lastAttackTime = 0;
    blueCradle.moveSpeed = 0; // Cradles don't move
    blueCradle.bulletArmor = 0;
    blueCradle.abilityArmor = 0;
    state.combatants.set(blueCradle.id, blueCradle);
    
    // Create red cradle (top right)
    const redCradle = new Combatant();
    redCradle.id = 'red-cradle';
    redCradle.type = COMBATANT_TYPES.CRADLE;
    redCradle.x = GAMEPLAY_CONFIG.CRADLE_POSITIONS.RED.x;
    redCradle.y = GAMEPLAY_CONFIG.CRADLE_POSITIONS.RED.y;
    redCradle.team = 'red';
    redCradle.health = GAMEPLAY_CONFIG.COMBAT.CRADLE.HEALTH;
    redCradle.maxHealth = GAMEPLAY_CONFIG.COMBAT.CRADLE.HEALTH;
    redCradle.attackRadius = GAMEPLAY_CONFIG.COMBAT.CRADLE.ATTACK_RADIUS;
    redCradle.attackStrength = GAMEPLAY_CONFIG.COMBAT.CRADLE.ATTACK_STRENGTH;
    redCradle.attackSpeed = GAMEPLAY_CONFIG.COMBAT.CRADLE.ATTACK_SPEED;
    redCradle.windUp = GAMEPLAY_CONFIG.COMBAT.CRADLE.WIND_UP;
    redCradle.attackReadyAt = 0; // Initialize to 0 (no wind-up in progress)
    redCradle.size = GAMEPLAY_CONFIG.COMBAT.CRADLE.SIZE;
    redCradle.lastAttackTime = 0;
    redCradle.moveSpeed = 0; // Cradles don't move
    redCradle.bulletArmor = 0;
    redCradle.abilityArmor = 0;
    state.combatants.set(redCradle.id, redCradle);
    
    // Create blue turrets
    GAMEPLAY_CONFIG.TURRET_POSITIONS.BLUE.forEach((position, index) => {
        const blueTurret = new Combatant();
        blueTurret.id = `blue-turret-${index + 1}`;
        blueTurret.type = COMBATANT_TYPES.TURRET;
        blueTurret.x = position.x;
        blueTurret.y = position.y;
        blueTurret.team = 'blue';
        blueTurret.health = GAMEPLAY_CONFIG.COMBAT.TURRET.HEALTH;
        blueTurret.maxHealth = GAMEPLAY_CONFIG.COMBAT.TURRET.HEALTH;
        blueTurret.attackRadius = GAMEPLAY_CONFIG.COMBAT.TURRET.ATTACK_RADIUS;
        blueTurret.attackStrength = GAMEPLAY_CONFIG.COMBAT.TURRET.ATTACK_STRENGTH;
        blueTurret.attackSpeed = GAMEPLAY_CONFIG.COMBAT.TURRET.ATTACK_SPEED;
        blueTurret.windUp = GAMEPLAY_CONFIG.COMBAT.TURRET.WIND_UP;
        blueTurret.attackReadyAt = 0; // Initialize to 0 (no wind-up in progress)
        blueTurret.size = GAMEPLAY_CONFIG.COMBAT.TURRET.SIZE;
        blueTurret.lastAttackTime = 0;
        blueTurret.moveSpeed = 0; // Turrets don't move
        blueTurret.bulletArmor = 0;
        blueTurret.abilityArmor = 0;
        state.combatants.set(blueTurret.id, blueTurret);
    });
    
    // Create red turrets
    GAMEPLAY_CONFIG.TURRET_POSITIONS.RED.forEach((position, index) => {
        const redTurret = new Combatant();
        redTurret.id = `red-turret-${index + 1}`;
        redTurret.type = COMBATANT_TYPES.TURRET;
        redTurret.x = position.x;
        redTurret.y = position.y;
        redTurret.team = 'red';
        redTurret.health = GAMEPLAY_CONFIG.COMBAT.TURRET.HEALTH;
        redTurret.maxHealth = GAMEPLAY_CONFIG.COMBAT.TURRET.HEALTH;
        redTurret.attackRadius = GAMEPLAY_CONFIG.COMBAT.TURRET.ATTACK_RADIUS;
        redTurret.attackStrength = GAMEPLAY_CONFIG.COMBAT.TURRET.ATTACK_STRENGTH;
        redTurret.attackSpeed = GAMEPLAY_CONFIG.COMBAT.TURRET.ATTACK_SPEED;
        redTurret.windUp = GAMEPLAY_CONFIG.COMBAT.TURRET.WIND_UP;
        redTurret.attackReadyAt = 0; // Initialize to 0 (no wind-up in progress)
        redTurret.size = GAMEPLAY_CONFIG.COMBAT.TURRET.SIZE;
        redTurret.lastAttackTime = 0;
        redTurret.moveSpeed = 0; // Turrets don't move
        redTurret.bulletArmor = 0;
        redTurret.abilityArmor = 0;
        state.combatants.set(redTurret.id, redTurret);
    });
    
    // Initialize currentWave to 0 (minions will spawn via waves)
    state.currentWave = 0;
    
    return { newState: state };
} 
