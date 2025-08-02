import { GameState, Combatant } from '../../../schema/GameState';
import { SetupGameAction, StateMachineResult } from '../types';
import { GAMEPLAY_CONFIG } from '../../../../Config';
import { COMBATANT_TYPES } from '../../../../shared/types/CombatantTypes';

export function handleSetupGame(state: GameState, action: SetupGameAction): StateMachineResult {
    const newState = new GameState();
    newState.gameTime = 0;
    newState.gamePhase = 'playing';
    
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
    blueCradle.lastAttackTime = 0;
    newState.combatants.set(blueCradle.id, blueCradle);
    
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
    redCradle.lastAttackTime = 0;
    newState.combatants.set(redCradle.id, redCradle);
    
    // Create blue turret
    const blueTurret = new Combatant();
    blueTurret.id = 'blue-turret';
    blueTurret.type = COMBATANT_TYPES.TURRET;
    blueTurret.x = GAMEPLAY_CONFIG.TURRET_POSITIONS.BLUE.x;
    blueTurret.y = GAMEPLAY_CONFIG.TURRET_POSITIONS.BLUE.y;
    blueTurret.team = 'blue';
    blueTurret.health = GAMEPLAY_CONFIG.COMBAT.TURRET.HEALTH;
    blueTurret.maxHealth = GAMEPLAY_CONFIG.COMBAT.TURRET.HEALTH;
    blueTurret.attackRadius = GAMEPLAY_CONFIG.COMBAT.TURRET.ATTACK_RADIUS;
    blueTurret.attackStrength = GAMEPLAY_CONFIG.COMBAT.TURRET.ATTACK_STRENGTH;
    blueTurret.attackSpeed = GAMEPLAY_CONFIG.COMBAT.TURRET.ATTACK_SPEED;
    blueTurret.lastAttackTime = 0;
    newState.combatants.set(blueTurret.id, blueTurret);
    
    // Create red turret
    const redTurret = new Combatant();
    redTurret.id = 'red-turret';
    redTurret.type = COMBATANT_TYPES.TURRET;
    redTurret.x = GAMEPLAY_CONFIG.TURRET_POSITIONS.RED.x;
    redTurret.y = GAMEPLAY_CONFIG.TURRET_POSITIONS.RED.y;
    redTurret.team = 'red';
    redTurret.health = GAMEPLAY_CONFIG.COMBAT.TURRET.HEALTH;
    redTurret.maxHealth = GAMEPLAY_CONFIG.COMBAT.TURRET.HEALTH;
    redTurret.attackRadius = GAMEPLAY_CONFIG.COMBAT.TURRET.ATTACK_RADIUS;
    redTurret.attackStrength = GAMEPLAY_CONFIG.COMBAT.TURRET.ATTACK_STRENGTH;
    redTurret.attackSpeed = GAMEPLAY_CONFIG.COMBAT.TURRET.ATTACK_SPEED;
    redTurret.lastAttackTime = 0;
    newState.combatants.set(redTurret.id, redTurret);
    
    return { newState };
} 