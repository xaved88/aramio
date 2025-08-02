import { MinionManager } from '../MinionManager';
import { GameState, Minion, Combatant } from '../../../schema/GameState';
import { GAMEPLAY_CONFIG } from '../../../../Config';
import { COMBATANT_TYPES, MINION_TYPES } from '../../../../shared/types/CombatantTypes';

describe('MinionManager', () => {
    let gameState: GameState;
    let blueMinion: Minion;
    let redMinion: Minion;
    let blueCradle: Combatant;
    let redCradle: Combatant;
    let bluePlayer: Combatant;

    beforeEach(() => {
        gameState = new GameState();
        
        // Create blue minion
        blueMinion = new Minion();
        blueMinion.id = 'blue-minion-1';
        blueMinion.type = COMBATANT_TYPES.MINION;
        blueMinion.team = 'blue';
        blueMinion.x = 100;
        blueMinion.y = 100;
        blueMinion.health = 8;
        blueMinion.maxHealth = 8;
        blueMinion.attackRadius = 40;
        blueMinion.attackStrength = 15;
        blueMinion.attackSpeed = 0.8;
        blueMinion.lastAttackTime = 0;
        blueMinion.minionType = 'warrior';
        
        // Create red minion
        redMinion = new Minion();
        redMinion.id = 'red-minion-1';
        redMinion.type = COMBATANT_TYPES.MINION;
        redMinion.team = 'red';
        redMinion.x = 500;
        redMinion.y = 500;
        redMinion.health = 8;
        redMinion.maxHealth = 8;
        redMinion.attackRadius = 40;
        redMinion.attackStrength = 15;
        redMinion.attackSpeed = 0.8;
        redMinion.lastAttackTime = 0;
        redMinion.minionType = 'warrior';
        
        // Create blue cradle
        blueCradle = new Combatant();
        blueCradle.id = 'blue-cradle';
        blueCradle.type = COMBATANT_TYPES.CRADLE;
        blueCradle.team = 'blue';
        blueCradle.x = GAMEPLAY_CONFIG.CRADLE_POSITIONS.BLUE.x;
        blueCradle.y = GAMEPLAY_CONFIG.CRADLE_POSITIONS.BLUE.y;
        blueCradle.health = 1000;
        blueCradle.maxHealth = 1000;
        blueCradle.attackRadius = 30;
        blueCradle.attackStrength = 40;
        blueCradle.attackSpeed = 0.3;
        blueCradle.lastAttackTime = 0;
        
        // Create red cradle
        redCradle = new Combatant();
        redCradle.id = 'red-cradle';
        redCradle.type = COMBATANT_TYPES.CRADLE;
        redCradle.team = 'red';
        redCradle.x = GAMEPLAY_CONFIG.CRADLE_POSITIONS.RED.x;
        redCradle.y = GAMEPLAY_CONFIG.CRADLE_POSITIONS.RED.y;
        redCradle.health = 1000;
        redCradle.maxHealth = 1000;
        redCradle.attackRadius = 30;
        redCradle.attackStrength = 40;
        redCradle.attackSpeed = 0.3;
        redCradle.lastAttackTime = 0;
        
        // Create blue player
        bluePlayer = new Combatant();
        bluePlayer.id = 'blue-player';
        bluePlayer.type = COMBATANT_TYPES.PLAYER;
        bluePlayer.team = 'blue';
        bluePlayer.x = 150;
        bluePlayer.y = 150;
        bluePlayer.health = 10;
        bluePlayer.maxHealth = 10;
        bluePlayer.attackRadius = 50;
        bluePlayer.attackStrength = 100;
        bluePlayer.attackSpeed = 1;
        bluePlayer.lastAttackTime = 0;
        
        // Add all combatants to game state
        gameState.combatants.set(blueMinion.id, blueMinion);
        gameState.combatants.set(redMinion.id, redMinion);
        gameState.combatants.set(blueCradle.id, blueCradle);
        gameState.combatants.set(redCradle.id, redCradle);
        gameState.combatants.set(bluePlayer.id, bluePlayer);
    });

    describe('moveMinions', () => {
        it('should not move dead minions', () => {
            blueMinion.health = 0;
            const originalX = blueMinion.x;
            const originalY = blueMinion.y;
            
            MinionManager.moveMinions(gameState);
            
            expect(blueMinion.x).toBe(originalX);
            expect(blueMinion.y).toBe(originalY);
        });

        it('should not move minions when enemies are in attack range', () => {
            // Place red player within blue minion's attack range
            const redPlayer = new Combatant();
            redPlayer.id = 'red-player';
            redPlayer.type = COMBATANT_TYPES.PLAYER;
            redPlayer.team = 'red';
            redPlayer.x = blueMinion.x + 20; // Within 40 radius
            redPlayer.y = blueMinion.y + 20;
            redPlayer.health = 10;
            redPlayer.maxHealth = 10;
            redPlayer.attackRadius = 50;
            redPlayer.attackStrength = 100;
            redPlayer.attackSpeed = 1;
            redPlayer.lastAttackTime = 0;
            
            gameState.combatants.set(redPlayer.id, redPlayer);
            
            const originalX = blueMinion.x;
            const originalY = blueMinion.y;
            
            MinionManager.moveMinions(gameState);
            
            expect(blueMinion.x).toBe(originalX);
            expect(blueMinion.y).toBe(originalY);
        });

        it('should move minions towards enemy cradle when no enemies in range', () => {
            const originalX = blueMinion.x;
            const originalY = blueMinion.y;
            
            MinionManager.moveMinions(gameState);
            
            // Should move towards red cradle (top right)
            expect(blueMinion.x).toBeGreaterThan(originalX);
            expect(blueMinion.y).toBeLessThan(originalY);
        });

        it('should move red minions towards blue cradle', () => {
            const originalX = redMinion.x;
            const originalY = redMinion.y;
            
            MinionManager.moveMinions(gameState);
            
            // Should move towards blue cradle (bottom left)
            expect(redMinion.x).toBeLessThan(originalX);
            expect(redMinion.y).toBeGreaterThan(originalY);
        });

        it('should not move minions when enemy cradle is destroyed', () => {
            redCradle.health = 0; // Destroy red cradle
            
            const originalX = blueMinion.x;
            const originalY = blueMinion.y;
            
            MinionManager.moveMinions(gameState);
            
            expect(blueMinion.x).toBe(originalX);
            expect(blueMinion.y).toBe(originalY);
        });

        it('should respect game bounds when moving', () => {
            // Place blue minion at edge of bounds
            blueMinion.x = GAMEPLAY_CONFIG.GAME_BOUNDS.MIN_X;
            blueMinion.y = GAMEPLAY_CONFIG.GAME_BOUNDS.MIN_Y;
            
            MinionManager.moveMinions(gameState);
            
            expect(blueMinion.x).toBeGreaterThanOrEqual(GAMEPLAY_CONFIG.GAME_BOUNDS.MIN_X);
            expect(blueMinion.y).toBeGreaterThanOrEqual(GAMEPLAY_CONFIG.GAME_BOUNDS.MIN_Y);
            expect(blueMinion.x).toBeLessThanOrEqual(GAMEPLAY_CONFIG.GAME_BOUNDS.MAX_X);
            expect(blueMinion.y).toBeLessThanOrEqual(GAMEPLAY_CONFIG.GAME_BOUNDS.MAX_Y);
        });

        it('should not move when close to target', () => {
            // Place blue minion very close to red cradle
            blueMinion.x = redCradle.x + GAMEPLAY_CONFIG.PLAYER_STOP_DISTANCE - 1;
            blueMinion.y = redCradle.y + GAMEPLAY_CONFIG.PLAYER_STOP_DISTANCE - 1;
            
            const originalX = blueMinion.x;
            const originalY = blueMinion.y;
            
            MinionManager.moveMinions(gameState);
            
            expect(blueMinion.x).toBe(originalX);
            expect(blueMinion.y).toBe(originalY);
        });
    });

    describe('spawnMinionWave', () => {
        it('should spawn correct number of minions for each team', () => {
            const initialMinionCount = gameState.combatants.size;
            
            MinionManager.spawnMinionWave(gameState);
            
            // Should spawn 2 warriors + 2 archers for each team = 8 total new minions
            const expectedNewMinions = (GAMEPLAY_CONFIG.MINION_SPAWNING.WARRIORS_PER_WAVE + GAMEPLAY_CONFIG.MINION_SPAWNING.ARCHERS_PER_WAVE) * 2;
            expect(gameState.combatants.size).toBe(initialMinionCount + expectedNewMinions);
        });

        it('should spawn minions near their respective cradles', () => {
            // Clear existing minions to test only new spawns
            const existingMinions = Array.from(gameState.combatants.values()).filter(c => c.type === COMBATANT_TYPES.MINION);
            existingMinions.forEach(minion => gameState.combatants.delete(minion.id));
            
            MinionManager.spawnMinionWave(gameState);
            
            const blueMinions = Array.from(gameState.combatants.values()).filter(c => 
                c.type === COMBATANT_TYPES.MINION && c.team === 'blue'
            );
            const redMinions = Array.from(gameState.combatants.values()).filter(c => 
                c.type === COMBATANT_TYPES.MINION && c.team === 'red'
            );
            
            // Check blue minions are near blue cradle
            blueMinions.forEach(minion => {
                const distance = Math.sqrt(
                    Math.pow(minion.x - GAMEPLAY_CONFIG.CRADLE_POSITIONS.BLUE.x, 2) +
                    Math.pow(minion.y - GAMEPLAY_CONFIG.CRADLE_POSITIONS.BLUE.y, 2)
                );
                expect(distance).toBeLessThanOrEqual(GAMEPLAY_CONFIG.MINION_SPAWNING.SPAWN_RADIUS);
            });
            
            // Check red minions are near red cradle
            redMinions.forEach(minion => {
                const distance = Math.sqrt(
                    Math.pow(minion.x - GAMEPLAY_CONFIG.CRADLE_POSITIONS.RED.x, 2) +
                    Math.pow(minion.y - GAMEPLAY_CONFIG.CRADLE_POSITIONS.RED.y, 2)
                );
                expect(distance).toBeLessThanOrEqual(GAMEPLAY_CONFIG.MINION_SPAWNING.SPAWN_RADIUS);
            });
        });

        it('should spawn both warrior and archer minions', () => {
            // Clear existing minions to test only new spawns
            const existingMinions = Array.from(gameState.combatants.values()).filter(c => c.type === COMBATANT_TYPES.MINION);
            existingMinions.forEach(minion => gameState.combatants.delete(minion.id));
            
            MinionManager.spawnMinionWave(gameState);
            
            const blueMinions = Array.from(gameState.combatants.values()).filter(c => 
                c.type === COMBATANT_TYPES.MINION && c.team === 'blue'
            ) as Minion[];
            const redMinions = Array.from(gameState.combatants.values()).filter(c => 
                c.type === COMBATANT_TYPES.MINION && c.team === 'red'
            ) as Minion[];
            
            const blueWarriors = blueMinions.filter(m => m.minionType === MINION_TYPES.WARRIOR);
            const blueArchers = blueMinions.filter(m => m.minionType === MINION_TYPES.ARCHER);
            const redWarriors = redMinions.filter(m => m.minionType === MINION_TYPES.WARRIOR);
            const redArchers = redMinions.filter(m => m.minionType === MINION_TYPES.ARCHER);
            
            expect(blueWarriors.length).toBe(GAMEPLAY_CONFIG.MINION_SPAWNING.WARRIORS_PER_WAVE);
            expect(blueArchers.length).toBe(GAMEPLAY_CONFIG.MINION_SPAWNING.ARCHERS_PER_WAVE);
            expect(redWarriors.length).toBe(GAMEPLAY_CONFIG.MINION_SPAWNING.WARRIORS_PER_WAVE);
            expect(redArchers.length).toBe(GAMEPLAY_CONFIG.MINION_SPAWNING.ARCHERS_PER_WAVE);
        });

        it('should spawn minions with correct stats based on type', () => {
            // Clear existing minions to test only new spawns
            const existingMinions = Array.from(gameState.combatants.values()).filter(c => c.type === COMBATANT_TYPES.MINION);
            existingMinions.forEach(minion => gameState.combatants.delete(minion.id));
            
            MinionManager.spawnMinionWave(gameState);
            
            const blueMinions = Array.from(gameState.combatants.values()).filter(c => 
                c.type === COMBATANT_TYPES.MINION && c.team === 'blue'
            ) as Minion[];
            
            const warrior = blueMinions.find(m => m.minionType === MINION_TYPES.WARRIOR);
            const archer = blueMinions.find(m => m.minionType === MINION_TYPES.ARCHER);
            
            expect(warrior?.health).toBe(GAMEPLAY_CONFIG.COMBAT.MINION.WARRIOR.HEALTH);
            expect(warrior?.attackRadius).toBe(GAMEPLAY_CONFIG.COMBAT.MINION.WARRIOR.ATTACK_RADIUS);
            expect(warrior?.attackStrength).toBe(GAMEPLAY_CONFIG.COMBAT.MINION.WARRIOR.ATTACK_STRENGTH);
            expect(warrior?.attackSpeed).toBe(GAMEPLAY_CONFIG.COMBAT.MINION.WARRIOR.ATTACK_SPEED);
            
            expect(archer?.health).toBe(GAMEPLAY_CONFIG.COMBAT.MINION.ARCHER.HEALTH);
            expect(archer?.attackRadius).toBe(GAMEPLAY_CONFIG.COMBAT.MINION.ARCHER.ATTACK_RADIUS);
            expect(archer?.attackStrength).toBe(GAMEPLAY_CONFIG.COMBAT.MINION.ARCHER.ATTACK_STRENGTH);
            expect(archer?.attackSpeed).toBe(GAMEPLAY_CONFIG.COMBAT.MINION.ARCHER.ATTACK_SPEED);
        });
    });

    describe('checkAndSpawnWave', () => {
        it('should not spawn waves before first wave delay', () => {
            gameState.gameTime = GAMEPLAY_CONFIG.MINION_SPAWNING.FIRST_WAVE_DELAY_MS - 100;
            const initialMinionCount = gameState.combatants.size;
            
            MinionManager.checkAndSpawnWave(gameState);
            
            expect(gameState.combatants.size).toBe(initialMinionCount);
            expect(gameState.currentWave).toBe(0);
        });

        it('should spawn first wave after delay', () => {
            gameState.gameTime = GAMEPLAY_CONFIG.MINION_SPAWNING.FIRST_WAVE_DELAY_MS + 100;
            const initialMinionCount = gameState.combatants.size;
            
            MinionManager.checkAndSpawnWave(gameState);
            
            const expectedNewMinions = (GAMEPLAY_CONFIG.MINION_SPAWNING.WARRIORS_PER_WAVE + GAMEPLAY_CONFIG.MINION_SPAWNING.ARCHERS_PER_WAVE) * 2;
            expect(gameState.combatants.size).toBe(initialMinionCount + expectedNewMinions);
            expect(gameState.currentWave).toBe(1);
        });

        it('should spawn multiple waves over time', () => {
            gameState.gameTime = GAMEPLAY_CONFIG.MINION_SPAWNING.FIRST_WAVE_DELAY_MS + GAMEPLAY_CONFIG.MINION_SPAWNING.WAVE_INTERVAL_MS * 2 + 100;
            const initialMinionCount = gameState.combatants.size;
            
            MinionManager.checkAndSpawnWave(gameState);
            
            const expectedNewMinions = (GAMEPLAY_CONFIG.MINION_SPAWNING.WARRIORS_PER_WAVE + GAMEPLAY_CONFIG.MINION_SPAWNING.ARCHERS_PER_WAVE) * 2 * 3; // 3 waves
            expect(gameState.combatants.size).toBe(initialMinionCount + expectedNewMinions);
            expect(gameState.currentWave).toBe(3);
        });

        it('should not spawn duplicate waves', () => {
            gameState.gameTime = GAMEPLAY_CONFIG.MINION_SPAWNING.FIRST_WAVE_DELAY_MS + 100;
            gameState.currentWave = 1; // Already spawned first wave
            
            const initialMinionCount = gameState.combatants.size;
            
            MinionManager.checkAndSpawnWave(gameState);
            
            expect(gameState.combatants.size).toBe(initialMinionCount);
            expect(gameState.currentWave).toBe(1);
        });
    });
}); 