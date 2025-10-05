import { GameState } from '../../../schema/GameState';
import { Combatant, Hero } from '../../../schema/Combatants';
import { SetupGameAction, StateMachineResult } from '../types';
import { COMBATANT_TYPES } from '../../../../shared/types/CombatantTypes';
import { GameplayConfig } from '../../../config/ConfigProvider';
import { resetBotNames } from './spawnPlayer';

export function handleSetupGame(state: GameState, action: SetupGameAction, gameplayConfig: GameplayConfig): StateMachineResult {
    // Reset bot names for new game
    resetBotNames();
    
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
    blueCradle.x = gameplayConfig.CRADLE_POSITIONS.BLUE.x;
    blueCradle.y = gameplayConfig.CRADLE_POSITIONS.BLUE.y;
    blueCradle.team = 'blue';
    blueCradle.health = gameplayConfig.COMBAT.CRADLE.HEALTH;
    blueCradle.maxHealth = gameplayConfig.COMBAT.CRADLE.HEALTH;
    blueCradle.attackRadius = gameplayConfig.COMBAT.CRADLE.ATTACK_RADIUS;
    blueCradle.attackStrength = gameplayConfig.COMBAT.CRADLE.ATTACK_STRENGTH;
    blueCradle.attackSpeed = gameplayConfig.COMBAT.CRADLE.ATTACK_SPEED;
    blueCradle.windUp = gameplayConfig.COMBAT.CRADLE.WIND_UP;
    blueCradle.attackReadyAt = 0; // Initialize to 0 (no wind-up in progress)
    blueCradle.size = gameplayConfig.COMBAT.CRADLE.SIZE;
    blueCradle.lastAttackTime = 0;
    blueCradle.moveSpeed = 0; // Cradles don't move
    blueCradle.bulletArmor = 0;
    blueCradle.abilityArmor = 0;
    state.combatants.set(blueCradle.id, blueCradle);
    
    // Create red cradle (top right)
    const redCradle = new Combatant();
    redCradle.id = 'red-cradle';
    redCradle.type = COMBATANT_TYPES.CRADLE;
    redCradle.x = gameplayConfig.CRADLE_POSITIONS.RED.x;
    redCradle.y = gameplayConfig.CRADLE_POSITIONS.RED.y;
    redCradle.team = 'red';
    redCradle.health = gameplayConfig.COMBAT.CRADLE.HEALTH;
    redCradle.maxHealth = gameplayConfig.COMBAT.CRADLE.HEALTH;
    redCradle.attackRadius = gameplayConfig.COMBAT.CRADLE.ATTACK_RADIUS;
    redCradle.attackStrength = gameplayConfig.COMBAT.CRADLE.ATTACK_STRENGTH;
    redCradle.attackSpeed = gameplayConfig.COMBAT.CRADLE.ATTACK_SPEED;
    redCradle.windUp = gameplayConfig.COMBAT.CRADLE.WIND_UP;
    redCradle.attackReadyAt = 0; // Initialize to 0 (no wind-up in progress)
    redCradle.size = gameplayConfig.COMBAT.CRADLE.SIZE;
    redCradle.lastAttackTime = 0;
    redCradle.moveSpeed = 0; // Cradles don't move
    redCradle.bulletArmor = 0;
    redCradle.abilityArmor = 0;
    state.combatants.set(redCradle.id, redCradle);
    
    // Create blue turrets
    gameplayConfig.TURRET_POSITIONS.BLUE.forEach((position: any, index: number) => {
        const blueTurret = new Combatant();
        blueTurret.id = `blue-turret-${index + 1}`;
        blueTurret.type = COMBATANT_TYPES.TURRET;
        blueTurret.x = position.x;
        blueTurret.y = position.y;
        blueTurret.team = 'blue';
        blueTurret.health = gameplayConfig.COMBAT.TURRET.HEALTH;
        blueTurret.maxHealth = gameplayConfig.COMBAT.TURRET.HEALTH;
        blueTurret.attackRadius = gameplayConfig.COMBAT.TURRET.ATTACK_RADIUS;
        blueTurret.attackStrength = gameplayConfig.COMBAT.TURRET.ATTACK_STRENGTH;
        blueTurret.attackSpeed = gameplayConfig.COMBAT.TURRET.ATTACK_SPEED;
        blueTurret.windUp = gameplayConfig.COMBAT.TURRET.WIND_UP;
        blueTurret.attackReadyAt = 0; // Initialize to 0 (no wind-up in progress)
        blueTurret.size = gameplayConfig.COMBAT.TURRET.SIZE;
        blueTurret.lastAttackTime = 0;
        blueTurret.moveSpeed = 0; // Turrets don't move
        blueTurret.bulletArmor = 0;
        blueTurret.abilityArmor = 0;
        state.combatants.set(blueTurret.id, blueTurret);
    });
    
    // Create red turrets
    gameplayConfig.TURRET_POSITIONS.RED.forEach((position: any, index: number) => {
        const redTurret = new Combatant();
        redTurret.id = `red-turret-${index + 1}`;
        redTurret.type = COMBATANT_TYPES.TURRET;
        redTurret.x = position.x;
        redTurret.y = position.y;
        redTurret.team = 'red';
        redTurret.health = gameplayConfig.COMBAT.TURRET.HEALTH;
        redTurret.maxHealth = gameplayConfig.COMBAT.TURRET.HEALTH;
        redTurret.attackRadius = gameplayConfig.COMBAT.TURRET.ATTACK_RADIUS;
        redTurret.attackStrength = gameplayConfig.COMBAT.TURRET.ATTACK_STRENGTH;
        redTurret.attackSpeed = gameplayConfig.COMBAT.TURRET.ATTACK_SPEED;
        redTurret.windUp = gameplayConfig.COMBAT.TURRET.WIND_UP;
        redTurret.attackReadyAt = 0; // Initialize to 0 (no wind-up in progress)
        redTurret.size = gameplayConfig.COMBAT.TURRET.SIZE;
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
