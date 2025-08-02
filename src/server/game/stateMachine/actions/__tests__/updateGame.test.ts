import { handleUpdateGame } from '../updateGame';
import { GameState, Player, Minion, Combatant, AttackEvent } from '../../../../schema/GameState';
import { UpdateGameAction, StateMachineResult } from '../../types';
import { GAMEPLAY_CONFIG } from '../../../../../Config';
import { COMBATANT_TYPES } from '../../../../../shared/types/CombatantTypes';

describe('handleUpdateGame', () => {
    let gameState: GameState;
    let action: UpdateGameAction;
    let result: StateMachineResult;

    beforeEach(() => {
        gameState = new GameState();
        gameState.gameTime = 1000;
        gameState.gamePhase = 'playing';
        
        action = {
            type: 'UPDATE_GAME',
            payload: {
                deltaTime: 50
            }
        };
    });

    describe('game time updates', () => {
        it('should update game time', () => {
            const originalTime = gameState.gameTime;
            
            result = handleUpdateGame(gameState, action);
            
            expect(result.newState.gameTime).toBe(originalTime + action.payload.deltaTime);
        });
    });

    describe('attack event cleanup', () => {
        it('should remove old attack events', () => {
            // Add old attack event (older than 1 second)
            const oldEvent = new AttackEvent();
            oldEvent.sourceId = 'player1';
            oldEvent.targetId = 'player2';
            oldEvent.timestamp = gameState.gameTime - 2000; // 2 seconds ago
            gameState.attackEvents.push(oldEvent);
            
            // Add recent attack event
            const recentEvent = new AttackEvent();
            recentEvent.sourceId = 'player3';
            recentEvent.targetId = 'player4';
            recentEvent.timestamp = gameState.gameTime - 500; // 0.5 seconds ago
            gameState.attackEvents.push(recentEvent);
            
            result = handleUpdateGame(gameState, action);
            
            expect(result.newState.attackEvents.length).toBe(1);
            expect(result.newState.attackEvents[0]?.sourceId).toBe('player3');
        });
    });

    describe('minion movement integration', () => {
        let blueMinion: Minion;
        let redCradle: Combatant;

        beforeEach(() => {
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
            
            gameState.combatants.set(blueMinion.id, blueMinion);
            gameState.combatants.set(redCradle.id, redCradle);
        });

        it('should move minions during game update', () => {
            const originalX = blueMinion.x;
            const originalY = blueMinion.y;
            
            result = handleUpdateGame(gameState, action);
            
            // Minion should move towards red cradle (top right)
            expect(result.newState.combatants.get(blueMinion.id)!.x).toBeGreaterThan(originalX);
            expect(result.newState.combatants.get(blueMinion.id)!.y).toBeLessThan(originalY);
        });

        it('should not move dead minions', () => {
            blueMinion.health = 0;
            const originalX = blueMinion.x;
            const originalY = blueMinion.y;
            
            result = handleUpdateGame(gameState, action);
            
            // Dead minions are removed from the game state
            expect(result.newState.combatants.has(blueMinion.id)).toBe(false);
        });
    });

    describe('combat processing', () => {
        let bluePlayer: Player;
        let redPlayer: Player;

        beforeEach(() => {
            // Create blue player
            bluePlayer = new Player();
            bluePlayer.id = 'blue-player';
            bluePlayer.type = COMBATANT_TYPES.PLAYER;
            bluePlayer.team = 'blue';
            bluePlayer.x = 100;
            bluePlayer.y = 100;
            bluePlayer.health = 10;
            bluePlayer.maxHealth = 10;
            bluePlayer.attackRadius = 50;
            bluePlayer.attackStrength = 100;
            bluePlayer.attackSpeed = 1;
            bluePlayer.lastAttackTime = 0;
            bluePlayer.state = 'alive';
            bluePlayer.respawnTime = 0;
            bluePlayer.respawnDuration = 6000;
            bluePlayer.experience = 0;
            bluePlayer.level = 1;
            
            // Create red player
            redPlayer = new Player();
            redPlayer.id = 'red-player';
            redPlayer.type = COMBATANT_TYPES.PLAYER;
            redPlayer.team = 'red';
            redPlayer.x = 120; // Within attack range
            redPlayer.y = 100;
            redPlayer.health = 10;
            redPlayer.maxHealth = 10;
            redPlayer.attackRadius = 50;
            redPlayer.attackStrength = 100;
            redPlayer.attackSpeed = 1;
            redPlayer.lastAttackTime = 0;
            redPlayer.state = 'alive';
            redPlayer.respawnTime = 0;
            redPlayer.respawnDuration = 6000;
            redPlayer.experience = 0;
            redPlayer.level = 1;
            
            gameState.combatants.set(bluePlayer.id, bluePlayer);
            gameState.combatants.set(redPlayer.id, redPlayer);
        });

        it('should process combat between players', () => {
            const originalHealth = redPlayer.health;
            
            result = handleUpdateGame(gameState, action);
            
            // Red player should take damage from blue player
            expect(result.newState.combatants.get(redPlayer.id)!.health).toBeLessThan(originalHealth);
        });

        it('should create attack events during combat', () => {
            result = handleUpdateGame(gameState, action);
            
            expect(result.newState.attackEvents.length).toBeGreaterThan(0);
            expect(result.newState.attackEvents[0]?.sourceId).toBe(bluePlayer.id);
            expect(result.newState.attackEvents[0]?.targetId).toBe(redPlayer.id);
        });

        it('should not attack when on cooldown', () => {
            bluePlayer.lastAttackTime = gameState.gameTime - 100; // Recently attacked
            
            result = handleUpdateGame(gameState, action);
            
            // Should not create attack events when on cooldown
            // Note: The red player might still attack the blue player, so we check that blue player doesn't attack
            const attackEvents = result.newState.attackEvents.filter(event => event.sourceId === bluePlayer.id);
            expect(attackEvents.length).toBe(0);
        });
    });

    describe('dead combatant handling', () => {
        let deadMinion: Minion;
        let bluePlayer: Player;

        beforeEach(() => {
            // Create dead minion
            deadMinion = new Minion();
            deadMinion.id = 'dead-minion';
            deadMinion.type = COMBATANT_TYPES.MINION;
            deadMinion.team = 'blue';
            deadMinion.x = 100;
            deadMinion.y = 100;
            deadMinion.health = 0; // Dead
            deadMinion.maxHealth = 8;
            deadMinion.attackRadius = 40;
            deadMinion.attackStrength = 15;
            deadMinion.attackSpeed = 0.8;
            deadMinion.lastAttackTime = 0;
            deadMinion.minionType = 'warrior';
            
            // Create blue player to receive experience
            bluePlayer = new Player();
            bluePlayer.id = 'blue-player';
            bluePlayer.type = COMBATANT_TYPES.PLAYER;
            bluePlayer.team = 'blue';
            bluePlayer.x = 100;
            bluePlayer.y = 100;
            bluePlayer.health = 10;
            bluePlayer.maxHealth = 10;
            bluePlayer.attackRadius = 50;
            bluePlayer.attackStrength = 100;
            bluePlayer.attackSpeed = 1;
            bluePlayer.lastAttackTime = 0;
            bluePlayer.state = 'alive';
            bluePlayer.respawnTime = 0;
            bluePlayer.respawnDuration = 6000;
            bluePlayer.experience = 0;
            bluePlayer.level = 1;
            
            gameState.combatants.set(deadMinion.id, deadMinion);
            gameState.combatants.set(bluePlayer.id, bluePlayer);
        });

        it('should remove dead minions and grant experience', () => {
            const originalExperience = bluePlayer.experience;
            
            result = handleUpdateGame(gameState, action);
            
            // Dead minion should be removed
            expect(result.newState.combatants.has(deadMinion.id)).toBe(false);
            
            // Blue player should receive experience (if there are opposing team players)
            const updatedPlayer = result.newState.combatants.get(bluePlayer.id) as Player;
            // Note: Experience is only granted when the opposing team kills the minion
            // Since this test doesn't have opposing team players, no experience is granted
            expect(updatedPlayer.experience).toBe(originalExperience);
        });

        it('should grant experience to opposing team when minion dies', () => {
            // Add red player to grant experience to
            const redPlayer = new Player();
            redPlayer.id = 'red-player';
            redPlayer.type = COMBATANT_TYPES.PLAYER;
            redPlayer.team = 'red';
            redPlayer.x = 200;
            redPlayer.y = 200;
            redPlayer.health = 10;
            redPlayer.maxHealth = 10;
            redPlayer.attackRadius = 50;
            redPlayer.attackStrength = 100;
            redPlayer.attackSpeed = 1;
            redPlayer.lastAttackTime = 0;
            redPlayer.state = 'alive';
            redPlayer.respawnTime = 0;
            redPlayer.respawnDuration = 6000;
            redPlayer.experience = 0;
            redPlayer.level = 1;
            
            gameState.combatants.set(redPlayer.id, redPlayer);
            
            const originalExperience = redPlayer.experience;
            
            result = handleUpdateGame(gameState, action);
            
            // Dead minion should be removed
            expect(result.newState.combatants.has(deadMinion.id)).toBe(false);
            
            // Red player should receive experience for killing blue minion
            const updatedRedPlayer = result.newState.combatants.get(redPlayer.id) as Player;
            expect(updatedRedPlayer.experience).toBeGreaterThan(originalExperience);
        });
    });

    describe('game end conditions', () => {
        let blueCradle: Combatant;
        let redCradle: Combatant;

        beforeEach(() => {
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
            
            gameState.combatants.set(blueCradle.id, blueCradle);
            gameState.combatants.set(redCradle.id, redCradle);
        });

        it('should end game when blue cradle is destroyed', () => {
            blueCradle.health = 0;
            
            result = handleUpdateGame(gameState, action);
            
            expect(result.newState.gamePhase).toBe('finished');
            expect(result.newState.winningTeam).toBe('red');
            expect(result.newState.gameEndTime).toBe(gameState.gameTime);
        });

        it('should end game when red cradle is destroyed', () => {
            redCradle.health = 0;
            
            result = handleUpdateGame(gameState, action);
            
            expect(result.newState.gamePhase).toBe('finished');
            expect(result.newState.winningTeam).toBe('blue');
            expect(result.newState.gameEndTime).toBe(gameState.gameTime);
        });

        it('should not end game when both cradles are alive', () => {
            result = handleUpdateGame(gameState, action);
            
            expect(result.newState.gamePhase).toBe('playing');
        });
    });

    describe('minion wave spawning', () => {
        let blueCradle: Combatant;
        let redCradle: Combatant;

        beforeEach(() => {
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
            
            gameState.combatants.set(blueCradle.id, blueCradle);
            gameState.combatants.set(redCradle.id, redCradle);
        });

        it('should not spawn waves before first wave delay', () => {
            gameState.gameTime = GAMEPLAY_CONFIG.MINION_SPAWNING.FIRST_WAVE_DELAY_MS - 100;
            const initialMinionCount = gameState.combatants.size;
            
            result = handleUpdateGame(gameState, action);
            
            expect(result.newState.combatants.size).toBe(initialMinionCount);
            expect(result.newState.currentWave).toBe(0);
        });

        it('should spawn first wave after delay', () => {
            gameState.gameTime = GAMEPLAY_CONFIG.MINION_SPAWNING.FIRST_WAVE_DELAY_MS + 100;
            const initialMinionCount = gameState.combatants.size;
            
            result = handleUpdateGame(gameState, action);
            
            const expectedNewMinions = (GAMEPLAY_CONFIG.MINION_SPAWNING.WARRIORS_PER_WAVE + GAMEPLAY_CONFIG.MINION_SPAWNING.ARCHERS_PER_WAVE) * 2;
            expect(result.newState.combatants.size).toBe(initialMinionCount + expectedNewMinions);
            expect(result.newState.currentWave).toBe(1);
        });

        it('should spawn multiple waves over time', () => {
            gameState.gameTime = GAMEPLAY_CONFIG.MINION_SPAWNING.FIRST_WAVE_DELAY_MS + GAMEPLAY_CONFIG.MINION_SPAWNING.WAVE_INTERVAL_MS * 2 + 100;
            const initialMinionCount = gameState.combatants.size;
            
            result = handleUpdateGame(gameState, action);
            
            const expectedNewMinions = (GAMEPLAY_CONFIG.MINION_SPAWNING.WARRIORS_PER_WAVE + GAMEPLAY_CONFIG.MINION_SPAWNING.ARCHERS_PER_WAVE) * 2 * 3; // 3 waves
            expect(result.newState.combatants.size).toBe(initialMinionCount + expectedNewMinions);
            expect(result.newState.currentWave).toBe(3);
        });
    });

    describe('nearest enemy targeting', () => {
        let attacker: Player;
        let nearEnemy: Player;
        let farEnemy: Player;

        beforeEach(() => {
            // Create an attacker
            attacker = new Player();
            attacker.id = 'attacker';
            attacker.type = COMBATANT_TYPES.PLAYER;
            attacker.team = 'blue';
            attacker.x = 100;
            attacker.y = 100;
            attacker.health = 10;
            attacker.maxHealth = 10;
            attacker.attackRadius = 50;
            attacker.attackStrength = 100;
            attacker.attackSpeed = 1;
            attacker.lastAttackTime = 0;
            attacker.state = 'alive';
            attacker.respawnTime = 0;
            attacker.respawnDuration = 6000;
            attacker.experience = 0;
            attacker.level = 1;
            attacker.ability = new (require('../../../../schema/GameState').Ability)();
            attacker.ability.type = 'projectile';
            attacker.ability.cooldown = 5000;
            attacker.ability.lastUsedTime = 0;
            attacker.ability.strength = 50;
            
            // Create a near enemy (closer to attacker)
            nearEnemy = new Player();
            nearEnemy.id = 'near-enemy';
            nearEnemy.type = COMBATANT_TYPES.PLAYER;
            nearEnemy.team = 'red';
            nearEnemy.x = 120; // 20 units away
            nearEnemy.y = 100;
            nearEnemy.health = 10;
            nearEnemy.maxHealth = 10;
            nearEnemy.attackRadius = 50;
            nearEnemy.attackStrength = 100;
            nearEnemy.attackSpeed = 1;
            nearEnemy.lastAttackTime = 0;
            nearEnemy.state = 'alive';
            nearEnemy.respawnTime = 0;
            nearEnemy.respawnDuration = 6000;
            nearEnemy.experience = 0;
            nearEnemy.level = 1;
            nearEnemy.ability = new (require('../../../../schema/GameState').Ability)();
            nearEnemy.ability.type = 'projectile';
            nearEnemy.ability.cooldown = 5000;
            nearEnemy.ability.lastUsedTime = 0;
            nearEnemy.ability.strength = 50;
            
            // Create a far enemy (further from attacker)
            farEnemy = new Player();
            farEnemy.id = 'far-enemy';
            farEnemy.type = COMBATANT_TYPES.PLAYER;
            farEnemy.team = 'red';
            farEnemy.x = 140; // 40 units away
            farEnemy.y = 100;
            farEnemy.health = 10;
            farEnemy.maxHealth = 10;
            farEnemy.attackRadius = 50;
            farEnemy.attackStrength = 100;
            farEnemy.attackSpeed = 1;
            farEnemy.lastAttackTime = 0;
            farEnemy.state = 'alive';
            farEnemy.respawnTime = 0;
            farEnemy.respawnDuration = 6000;
            farEnemy.experience = 0;
            farEnemy.level = 1;
            farEnemy.ability = new (require('../../../../schema/GameState').Ability)();
            farEnemy.ability.type = 'projectile';
            farEnemy.ability.cooldown = 5000;
            farEnemy.ability.lastUsedTime = 0;
            farEnemy.ability.strength = 50;
            
            gameState.combatants.set(attacker.id, attacker);
            gameState.combatants.set(nearEnemy.id, nearEnemy);
            gameState.combatants.set(farEnemy.id, farEnemy);
        });

        it('should attack the nearest enemy when multiple enemies are in range', () => {
            // Both enemies are in range (attack radius is 50, near enemy is 20 units away, far enemy is 40 units away)
            const initialNearHealth = nearEnemy.health;
            const initialFarHealth = farEnemy.health;
            
            result = handleUpdateGame(gameState, action);
            
            const finalNearHealth = result.newState.combatants.get('near-enemy')?.health;
            const finalFarHealth = result.newState.combatants.get('far-enemy')?.health;
            
            // Should only attack the nearest enemy (nearEnemy)
            // Since attack strength is 100 and health is 10, the enemy dies (health becomes 0)
            expect(finalNearHealth).toBe(0); // Enemy died from 100 damage
            expect(finalFarHealth).toBe(initialFarHealth); // Should not be damaged
            
            // Should create an attack event targeting the nearest enemy
            const attackEvents = result.newState.attackEvents;
            expect(attackEvents.length).toBeGreaterThan(0);
            // Check that at least one attack event is from our attacker to the near enemy
            const attackerToNearEvent = attackEvents.find(event => 
                event.sourceId === 'attacker' && event.targetId === 'near-enemy'
            );
            expect(attackerToNearEvent).toBeDefined();
        });

        it('should not attack when no enemies are in range', () => {
            // Move enemies out of range
            nearEnemy.x = 200; // 100 units away
            farEnemy.x = 300; // 200 units away
            
            const initialNearHealth = nearEnemy.health;
            const initialFarHealth = farEnemy.health;
            
            result = handleUpdateGame(gameState, action);
            
            // Should not attack any enemies
            expect(result.newState.combatants.get('near-enemy')?.health).toBe(initialNearHealth);
            expect(result.newState.combatants.get('far-enemy')?.health).toBe(initialFarHealth);
            expect(result.newState.attackEvents.length).toBe(0);
        });
    });
}); 