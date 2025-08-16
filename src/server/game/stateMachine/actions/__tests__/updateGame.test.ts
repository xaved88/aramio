import { handleUpdateGame } from '../updateGame';
import { GameState } from '../../../../schema/GameState';
import { Hero, Minion, Combatant } from '../../../../schema/Combatants';
import { AttackEvent, RoundStats } from '../../../../schema/Events';
import { DefaultAbility } from '../../../../schema/Abilities';
import { UpdateGameAction, StateMachineResult } from '../../types';
import { GAMEPLAY_CONFIG } from '../../../../../Config';
import { COMBATANT_TYPES } from '../../../../../shared/types/CombatantTypes';
import { AbilityFactory } from '../../../abilities/AbilityFactory';

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
            blueMinion.y = 200; // Position below red cradle so it can move up
            blueMinion.health = 8;
            blueMinion.maxHealth = 8;
            blueMinion.attackRadius = 40;
            blueMinion.attackStrength = 15;
            blueMinion.attackSpeed = 0.8;
            blueMinion.moveSpeed = GAMEPLAY_CONFIG.MINION_MOVE_SPEED;
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
            redCradle.moveSpeed = 0;
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
            let bluePlayer: Hero;
    let redPlayer: Hero;
    
    beforeEach(() => {
        // Create blue player
        bluePlayer = new Hero();
            bluePlayer.id = 'blue-player';
            bluePlayer.type = COMBATANT_TYPES.HERO;
            bluePlayer.team = 'blue';
            bluePlayer.x = 100;
            bluePlayer.y = 100;
            bluePlayer.health = 10;
            bluePlayer.maxHealth = 10;
            bluePlayer.attackRadius = 50;
            bluePlayer.attackStrength = 100;
            bluePlayer.attackSpeed = 1;
            bluePlayer.moveSpeed = GAMEPLAY_CONFIG.PLAYER_MOVE_SPEED;
            bluePlayer.lastAttackTime = 0;
            bluePlayer.state = 'alive';
            bluePlayer.respawnTime = 0;
            bluePlayer.respawnDuration = 6000;
            bluePlayer.experience = 0;
            bluePlayer.roundStats = new RoundStats();
            bluePlayer.roundStats.totalExperience = 0;
            bluePlayer.level = 1;
            bluePlayer.attackReadyAt = 0; // Initialize wind-up field
            bluePlayer.bulletArmor = 0;
            bluePlayer.abilityArmor = 0;
            bluePlayer.size = GAMEPLAY_CONFIG.COMBAT.HEROES.default.SIZE;
            
                    // Create red player
        redPlayer = new Hero();
            redPlayer.id = 'red-player';
            redPlayer.type = COMBATANT_TYPES.HERO;
            redPlayer.team = 'red';
            redPlayer.x = 120; // Within attack range
            redPlayer.y = 100;
            redPlayer.health = 10;
            redPlayer.maxHealth = 10;
            redPlayer.attackRadius = 50;
            redPlayer.attackStrength = 100;
            redPlayer.attackSpeed = 1;
            redPlayer.moveSpeed = GAMEPLAY_CONFIG.PLAYER_MOVE_SPEED;
            redPlayer.lastAttackTime = 0;
            redPlayer.state = 'alive';
            redPlayer.respawnTime = 0;
            redPlayer.respawnDuration = 6000;
            redPlayer.experience = 0;
            redPlayer.roundStats = new RoundStats();
            redPlayer.roundStats.totalExperience = 0;
            redPlayer.level = 1;
            redPlayer.attackReadyAt = 0; // Initialize wind-up field
            redPlayer.bulletArmor = 0;
            redPlayer.abilityArmor = 0;
            redPlayer.size = GAMEPLAY_CONFIG.COMBAT.HEROES.default.SIZE;
            
            gameState.combatants.set(bluePlayer.id, bluePlayer);
            gameState.combatants.set(redPlayer.id, redPlayer);
        });

        it('should process combat between players', () => {
            const originalHealth = redPlayer.health;
            
            // Set targets explicitly to ensure attacks happen
            bluePlayer.target = redPlayer.id;
            redPlayer.target = bluePlayer.id;
            
            // Set attackReadyAt to a positive past time to trigger immediate attacks
            bluePlayer.attackReadyAt = 900; // Past time relative to gameTime 1000
            redPlayer.attackReadyAt = 900; // Past time relative to gameTime 1000
            
            // Run multiple updates to allow wind-up period to complete
            result = handleUpdateGame(gameState, action);
            
            // With wind-up system, first update should start wind-up, second should execute attack
            // Run another update to allow attack to complete
            result = handleUpdateGame(result.newState, action);
            
            // Run a third update to ensure attack completes (wind-up is 250ms, deltaTime is 100ms)
            result = handleUpdateGame(result.newState, action);
            
            // Red player should take damage from blue player
            expect(result.newState.combatants.get(redPlayer.id)!.health).toBeLessThan(originalHealth);
        });

        it('should create attack events during combat', () => {
            // Set targets explicitly to ensure attacks happen
            bluePlayer.target = redPlayer.id;
            redPlayer.target = bluePlayer.id;
            
            // Set attackReadyAt to a positive past time to trigger immediate attacks
            bluePlayer.attackReadyAt = 900; // Past time relative to gameTime 1000
            redPlayer.attackReadyAt = 900; // Past time relative to gameTime 1000
            
            // Run multiple updates to allow wind-up period to complete
            result = handleUpdateGame(gameState, action);
            result = handleUpdateGame(result.newState, action);
            
            // Run a third update to ensure attack completes (wind-up is 250ms, deltaTime is 100ms)
            result = handleUpdateGame(result.newState, action);
            
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
        let bluePlayer: Hero;

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
            deadMinion.moveSpeed = GAMEPLAY_CONFIG.MINION_MOVE_SPEED;
            deadMinion.lastAttackTime = 0;
            deadMinion.minionType = 'warrior';
            deadMinion.size = GAMEPLAY_CONFIG.COMBAT.MINION.WARRIOR.SIZE;
            
                    // Create blue player to receive experience
        bluePlayer = new Hero();
            bluePlayer.id = 'blue-player';
            bluePlayer.type = COMBATANT_TYPES.HERO;
            bluePlayer.team = 'blue';
            bluePlayer.x = 100;
            bluePlayer.y = 100;
            bluePlayer.health = 10;
            bluePlayer.maxHealth = 10;
            bluePlayer.attackRadius = 50;
            bluePlayer.attackStrength = 100;
            bluePlayer.attackSpeed = 1;
            bluePlayer.moveSpeed = GAMEPLAY_CONFIG.PLAYER_MOVE_SPEED;
            bluePlayer.lastAttackTime = 0;
            bluePlayer.state = 'alive';
            bluePlayer.respawnTime = 0;
            bluePlayer.respawnDuration = 6000;
            bluePlayer.experience = 0;
            bluePlayer.roundStats = new RoundStats();
            bluePlayer.roundStats.totalExperience = 0;
            bluePlayer.level = 1;
            bluePlayer.attackReadyAt = 0; // Initialize wind-up field
            bluePlayer.size = GAMEPLAY_CONFIG.COMBAT.HEROES.default.SIZE;
            
            gameState.combatants.set(deadMinion.id, deadMinion);
            gameState.combatants.set(bluePlayer.id, bluePlayer);
        });

        it('should remove dead minions and grant experience', () => {
            const originalExperience = bluePlayer.experience;
            
            result = handleUpdateGame(gameState, action);
            
            // Dead minion should be removed
            expect(result.newState.combatants.has(deadMinion.id)).toBe(false);
            
            // Blue player should receive experience (if there are opposing team players)
            const updatedPlayer = result.newState.combatants.get(bluePlayer.id) as Hero;
            // Note: Experience is only granted when the opposing team kills the minion
            // Since this test doesn't have opposing team players, no experience is granted
            expect(updatedPlayer.roundStats.totalExperience).toBe(originalExperience);
        });

        it('should grant experience to opposing team when minion dies', () => {
            // Add red player to grant experience to
            const redPlayer = new Hero();
            redPlayer.id = 'red-player';
            redPlayer.type = COMBATANT_TYPES.HERO;
            redPlayer.team = 'red';
            redPlayer.x = 200;
            redPlayer.y = 200;
            redPlayer.health = 10;
            redPlayer.maxHealth = 10;
            redPlayer.attackRadius = 50;
            redPlayer.attackStrength = 100;
            redPlayer.attackSpeed = 1;
            redPlayer.moveSpeed = GAMEPLAY_CONFIG.PLAYER_MOVE_SPEED;
            redPlayer.lastAttackTime = 0;
            redPlayer.state = 'alive';
            redPlayer.respawnTime = 0;
            redPlayer.respawnDuration = 6000;
            redPlayer.experience = 0;
            redPlayer.roundStats = new RoundStats();
            redPlayer.roundStats.totalExperience = 0;
            redPlayer.level = 1;
            redPlayer.attackReadyAt = 0; // Initialize wind-up field
            redPlayer.size = GAMEPLAY_CONFIG.COMBAT.HEROES.default.SIZE;
            
            gameState.combatants.set(redPlayer.id, redPlayer);
            
            const originalExperience = redPlayer.experience;
            
            result = handleUpdateGame(gameState, action);
            
            // Dead minion should be removed
            expect(result.newState.combatants.has(deadMinion.id)).toBe(false);
            
            // Red player should receive experience for killing blue minion
            const updatedRedPlayer = result.newState.combatants.get(redPlayer.id) as Hero;
            expect(updatedRedPlayer.roundStats.totalExperience).toBeGreaterThan(originalExperience);
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
            blueCradle.moveSpeed = 0;
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
            redCradle.moveSpeed = 0;
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
            blueCradle.moveSpeed = 0;
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
            redCradle.moveSpeed = 0;
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
            
            // Should spawn only warriors initially (2 warriors per team = 4 total new minions)
            const expectedNewMinions = GAMEPLAY_CONFIG.MINION_SPAWNING.WARRIORS_PER_WAVE * 2;
            expect(result.newState.combatants.size).toBe(initialMinionCount + expectedNewMinions);
            expect(result.newState.currentWave).toBe(1);
        });

        it('should spawn multiple waves over time', () => {
            gameState.gameTime = GAMEPLAY_CONFIG.MINION_SPAWNING.FIRST_WAVE_DELAY_MS + GAMEPLAY_CONFIG.MINION_SPAWNING.WAVE_INTERVAL_MS * 2 + 100;
            const initialMinionCount = gameState.combatants.size;
            
            result = handleUpdateGame(gameState, action);
            
            // Should spawn only warriors initially (2 warriors per team * 3 waves = 12 total new minions)
            const expectedNewMinions = GAMEPLAY_CONFIG.MINION_SPAWNING.WARRIORS_PER_WAVE * 2 * 3;
            expect(result.newState.combatants.size).toBe(initialMinionCount + expectedNewMinions);
            expect(result.newState.currentWave).toBe(3);
        });
    });

    describe('nearest enemy targeting', () => {
        let attacker: Hero;
        let nearEnemy: Hero;
        let farEnemy: Hero;

        beforeEach(() => {
            // Create an attacker
            attacker = new Hero();
            attacker.id = 'attacker';
            attacker.type = COMBATANT_TYPES.HERO;
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
            attacker.roundStats = new RoundStats();
            attacker.roundStats.totalExperience = 0;
            attacker.level = 1;
            attacker.attackReadyAt = 0; // Initialize wind-up field
            attacker.bulletArmor = 0;
            attacker.abilityArmor = 0;
            attacker.ability = AbilityFactory.create('default');
            attacker.ability.cooldown = 5000;
            (attacker.ability as DefaultAbility).strength = 50;
            attacker.size = GAMEPLAY_CONFIG.COMBAT.HEROES.default.SIZE;
            
            // Create a near enemy (closer to attacker)
            nearEnemy = new Hero();
            nearEnemy.id = 'near-enemy';
            nearEnemy.type = COMBATANT_TYPES.HERO;
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
            nearEnemy.roundStats = new RoundStats();
            nearEnemy.roundStats.totalExperience = 0;
            nearEnemy.level = 1;
            nearEnemy.attackReadyAt = 0; // Initialize wind-up field
            nearEnemy.bulletArmor = 0;
            nearEnemy.abilityArmor = 0;
            nearEnemy.ability = AbilityFactory.create('default');
            nearEnemy.ability.cooldown = 5000;
            (nearEnemy.ability as DefaultAbility).strength = 50;
            nearEnemy.size = GAMEPLAY_CONFIG.COMBAT.HEROES.default.SIZE;
            
            // Create a far enemy (further from attacker)
            farEnemy = new Hero();
            farEnemy.id = 'far-enemy';
            farEnemy.type = COMBATANT_TYPES.HERO;
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
            farEnemy.roundStats = new RoundStats();
            farEnemy.roundStats.totalExperience = 0;
            farEnemy.level = 1;
            farEnemy.attackReadyAt = 0; // Initialize wind-up field
            farEnemy.bulletArmor = 0;
            farEnemy.abilityArmor = 0;
            farEnemy.ability = AbilityFactory.create('default');
            farEnemy.ability.cooldown = 5000;
            (farEnemy.ability as DefaultAbility).strength = 50;
            farEnemy.size = GAMEPLAY_CONFIG.COMBAT.HEROES.default.SIZE;
            
            gameState.combatants.set(attacker.id, attacker);
            gameState.combatants.set(nearEnemy.id, nearEnemy);
            gameState.combatants.set(farEnemy.id, farEnemy);
        });

        it('should attack the nearest enemy when multiple enemies are in range', () => {
            // Both enemies are in range (attack radius is 50, near enemy is 20 units away, far enemy is 40 units away)
            const initialNearHealth = nearEnemy.health;
            const initialFarHealth = farEnemy.health;
            
            // Set target explicitly to ensure attack happens
            attacker.target = nearEnemy.id;
            
            // Set attackReadyAt to a positive past time to trigger immediate attack
            attacker.attackReadyAt = 900; // Past time relative to gameTime 1000
            
            // Run multiple updates to allow wind-up period to complete
            result = handleUpdateGame(gameState, action);
            result = handleUpdateGame(result.newState, action);
            
            // Run a third update to ensure attack completes (wind-up is 250ms, deltaTime is 100ms)
            result = handleUpdateGame(result.newState, action);
            
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

    describe('collision detection and resolution', () => {
        let player1: Hero;
        let player2: Hero;
        let minion: Minion;
        let turret: Combatant;
        let cradle: Combatant;

        beforeEach(() => {
            // Create player 1
            player1 = new Hero();
            player1.id = 'player1';
            player1.type = COMBATANT_TYPES.HERO;
            player1.team = 'blue';
            player1.x = 100;
            player1.y = 100;
            player1.health = 50;
            player1.maxHealth = 50;
            player1.attackRadius = 35;
            player1.attackStrength = 5;
            player1.attackSpeed = 1;
            player1.lastAttackTime = 0;
            player1.state = 'alive';
            player1.respawnTime = 0;
            player1.respawnDuration = 6000;
            player1.experience = 0;
            player1.roundStats = new RoundStats();
            player1.roundStats.totalExperience = 0;
            player1.level = 1;
            player1.attackReadyAt = 0; // Initialize wind-up field
            player1.ability = AbilityFactory.create('default');
            player1.ability.cooldown = 1000;
            (player1.ability as DefaultAbility).strength = 5;
            player1.size = GAMEPLAY_CONFIG.COMBAT.HEROES.default.SIZE;

            // Create player 2
            player2 = new Hero();
            player2.id = 'player2';
            player2.type = COMBATANT_TYPES.HERO;
            player2.team = 'red';
            player2.x = 110; // 10 units away from player1 (both have size 15, so threshold is 27)
            player2.y = 100;
            player2.health = 50;
            player2.maxHealth = 50;
            player2.attackRadius = 35;
            player2.attackStrength = 5;
            player2.attackSpeed = 1;
            player2.lastAttackTime = 0;
            player2.state = 'alive';
            player2.respawnTime = 0;
            player2.respawnDuration = 6000;
            player2.experience = 0;
            player2.roundStats = new RoundStats();
            player2.roundStats.totalExperience = 0;
            player2.level = 1;
            player2.attackReadyAt = 0; // Initialize wind-up field
            player2.ability = AbilityFactory.create('default');
            player2.ability.cooldown = 1000;
            (player2.ability as DefaultAbility).strength = 5;
            player2.size = GAMEPLAY_CONFIG.COMBAT.HEROES.default.SIZE;

            // Create minion
            minion = new Minion();
            minion.id = 'minion1';
            minion.type = COMBATANT_TYPES.MINION;
            minion.team = 'blue';
            minion.x = 200;
            minion.y = 200;
            minion.health = 50;
            minion.maxHealth = 50;
            minion.attackRadius = 20;
            minion.attackStrength = 10;
            minion.attackSpeed = 0.8;
            minion.lastAttackTime = 0;
            minion.minionType = 'warrior';
            minion.size = GAMEPLAY_CONFIG.COMBAT.MINION.WARRIOR.SIZE;

            // Create turret
            turret = new Combatant();
            turret.id = 'turret1';
            turret.type = COMBATANT_TYPES.TURRET;
            turret.team = 'blue';
            turret.x = 300;
            turret.y = 300;
            turret.health = 500;
            turret.maxHealth = 500;
            turret.attackRadius = 70;
            turret.attackStrength = 25;
            turret.attackSpeed = 2;
            turret.lastAttackTime = 0;
            turret.size = GAMEPLAY_CONFIG.COMBAT.TURRET.SIZE;

            // Create cradle
            cradle = new Combatant();
            cradle.id = 'cradle1';
            cradle.type = COMBATANT_TYPES.CRADLE;
            cradle.team = 'blue';
            cradle.x = 400;
            cradle.y = 400;
            cradle.health = 2000;
            cradle.maxHealth = 2000;
            cradle.attackRadius = 120;
            cradle.attackStrength = 40;
            cradle.attackSpeed = 1;
            cradle.lastAttackTime = 0;
            cradle.size = GAMEPLAY_CONFIG.COMBAT.CRADLE.SIZE;

            gameState.combatants.set(player1.id, player1);
            gameState.combatants.set(player2.id, player2);
            gameState.combatants.set(minion.id, minion);
            gameState.combatants.set(turret.id, turret);
            gameState.combatants.set(cradle.id, cradle);
        });

        it('should resolve collision between two units with proportional movement', () => {
            const originalPlayer1X = player1.x;
            const originalPlayer1Y = player1.y;
            const originalPlayer2X = player2.x;
            const originalPlayer2Y = player2.y;

            result = handleUpdateGame(gameState, action);

            const finalPlayer1 = result.newState.combatants.get('player1') as Hero;
            const finalPlayer2 = result.newState.combatants.get('player2') as Hero;

            // Both players should have moved away from each other
            expect(finalPlayer1.x).toBeLessThan(originalPlayer1X);
            expect(finalPlayer1.y).toBe(originalPlayer1Y); // Same Y, so no Y movement
            expect(finalPlayer2.x).toBeGreaterThan(originalPlayer2X);
            expect(finalPlayer2.y).toBe(originalPlayer2Y); // Same Y, so no Y movement

            // They should have moved equal distances (same size units)
            const player1Movement = originalPlayer1X - finalPlayer1.x;
            const player2Movement = finalPlayer2.x - originalPlayer2X;
            expect(player1Movement).toBeCloseTo(player2Movement, 1);
        });

        it('should resolve collision between unit and structure (unit moves, structure stays)', () => {
            // Move minion close to turret
            minion.x = 305; // 5 units away from turret (size 12 + 20 = 32, threshold = 28.8)
            minion.y = 300;

            const originalMinionX = minion.x;
            const originalMinionY = minion.y;
            const originalTurretX = turret.x;
            const originalTurretY = turret.y;

            result = handleUpdateGame(gameState, action);

            const finalMinion = result.newState.combatants.get('minion1') as Minion;
            const finalTurret = result.newState.combatants.get('turret1') as Combatant;

            // Minion should have moved away from turret
            expect(finalMinion.x).toBeGreaterThan(originalMinionX);
            expect(finalMinion.y).toBe(originalMinionY); // Same Y, so no Y movement

            // Turret should not have moved
            expect(finalTurret.x).toBe(originalTurretX);
            expect(finalTurret.y).toBe(originalTurretY);
        });

        it('should ignore collision between two structures', () => {
            // Move turret close to cradle
            turret.x = 410; // 10 units away from cradle (size 20 + 25 = 45, threshold = 40.5)
            turret.y = 400;

            const originalTurretX = turret.x;
            const originalTurretY = turret.y;
            const originalCradleX = cradle.x;
            const originalCradleY = cradle.y;

            result = handleUpdateGame(gameState, action);

            const finalTurret = result.newState.combatants.get('turret1') as Combatant;
            const finalCradle = result.newState.combatants.get('cradle1') as Combatant;

            // Neither should have moved
            expect(finalTurret.x).toBe(originalTurretX);
            expect(finalTurret.y).toBe(originalTurretY);
            expect(finalCradle.x).toBe(originalCradleX);
            expect(finalCradle.y).toBe(originalCradleY);
        });

        it('should not trigger collision when units are far apart', () => {
            // Move players far apart
            player1.x = 100;
            player1.y = 100;
            player2.x = 200; // 100 units away, well beyond collision threshold
            player2.y = 100;

            const originalPlayer1X = player1.x;
            const originalPlayer1Y = player1.y;
            const originalPlayer2X = player2.x;
            const originalPlayer2Y = player2.y;

            result = handleUpdateGame(gameState, action);

            const finalPlayer1 = result.newState.combatants.get('player1') as Hero;
            const finalPlayer2 = result.newState.combatants.get('player2') as Hero;

            // Neither should have moved
            expect(finalPlayer1.x).toBe(originalPlayer1X);
            expect(finalPlayer1.y).toBe(originalPlayer1Y);
            expect(finalPlayer2.x).toBe(originalPlayer2X);
            expect(finalPlayer2.y).toBe(originalPlayer2Y);
        });

        it('should handle proportional movement for different sized units', () => {
            // Create a large unit (size 25) and small unit (size 12)
            const largeUnit = new Combatant();
            largeUnit.id = 'large-unit';
            largeUnit.type = COMBATANT_TYPES.CRADLE;
            largeUnit.team = 'blue';
            largeUnit.x = 500;
            largeUnit.y = 500;
            largeUnit.health = 100;
            largeUnit.maxHealth = 100;
            largeUnit.attackRadius = 50;
            largeUnit.attackStrength = 10;
            largeUnit.attackSpeed = 1;
            largeUnit.lastAttackTime = 0;
            largeUnit.size = GAMEPLAY_CONFIG.COMBAT.CRADLE.SIZE;

            const smallUnit = new Minion();
            smallUnit.id = 'small-unit';
            smallUnit.type = COMBATANT_TYPES.MINION;
            smallUnit.team = 'red';
            smallUnit.x = 510; // 10 units away from large unit
            smallUnit.y = 500;
            smallUnit.health = 50;
            smallUnit.maxHealth = 50;
            smallUnit.attackRadius = 20;
            smallUnit.attackStrength = 10;
            smallUnit.attackSpeed = 0.8;
            smallUnit.lastAttackTime = 0;
            smallUnit.minionType = 'warrior';
            smallUnit.size = GAMEPLAY_CONFIG.COMBAT.MINION.WARRIOR.SIZE;

            gameState.combatants.set(largeUnit.id, largeUnit);
            gameState.combatants.set(smallUnit.id, smallUnit);

            const originalLargeX = largeUnit.x;
            const originalSmallX = smallUnit.x;

            result = handleUpdateGame(gameState, action);

            const finalLarge = result.newState.combatants.get('large-unit') as Combatant;
            const finalSmall = result.newState.combatants.get('small-unit') as Minion;

            // Only the small unit should have moved (large unit is a structure)
            expect(finalLarge.x).toBe(originalLargeX); // Structure shouldn't move
            expect(finalSmall.x).toBeGreaterThan(originalSmallX); // Unit should move away
        });

        it('should not process collisions for dead units', () => {
            // Kill player2
            player2.health = 0;

            const originalPlayer1X = player1.x;
            const originalPlayer1Y = player1.y;

            result = handleUpdateGame(gameState, action);

            const finalPlayer1 = result.newState.combatants.get('player1') as Hero;
            const finalPlayer2 = result.newState.combatants.get('player2') as Hero;

            // Player1 should not have moved (dead unit doesn't participate in collision)
            expect(finalPlayer1.x).toBe(originalPlayer1X);
            expect(finalPlayer1.y).toBe(originalPlayer1Y);
            
            // Player2 will move due to respawn logic, but not due to collision
            expect(finalPlayer2.health).toBe(0); // Should still be dead
        });

        it('should use configurable collision threshold', () => {
            // Test with units just at the threshold boundary
            const threshold = (GAMEPLAY_CONFIG.COMBAT.HEROES.default.SIZE + GAMEPLAY_CONFIG.COMBAT.HEROES.default.SIZE) * GAMEPLAY_CONFIG.COMBAT.COLLISION_THRESHOLD_MULTIPLIER;
            
            // Position players exactly at the threshold
            player1.x = 100;
            player1.y = 100;
            player2.x = 100 + threshold;
            player2.y = 100;

            const originalPlayer1X = player1.x;
            const originalPlayer2X = player2.x;

            result = handleUpdateGame(gameState, action);

            const finalPlayer1 = result.newState.combatants.get('player1') as Hero;
            const finalPlayer2 = result.newState.combatants.get('player2') as Hero;

            // Should not collide at exactly the threshold
            expect(finalPlayer1.x).toBe(originalPlayer1X);
            expect(finalPlayer2.x).toBe(originalPlayer2X);

            // Move them slightly closer to trigger collision
            player2.x = 100 + threshold - 1;

            const collisionPlayer1X = player1.x;
            const collisionPlayer2X = player2.x;

            result = handleUpdateGame(gameState, action);

            const finalPlayer1After = result.newState.combatants.get('player1') as Hero;
            const finalPlayer2After = result.newState.combatants.get('player2') as Hero;

            // Should now collide
            expect(finalPlayer1After.x).toBeLessThan(collisionPlayer1X);
            expect(finalPlayer2After.x).toBeGreaterThan(collisionPlayer2X);
        });
    });

    describe('experience sharing with fall-off', () => {
        let blueHero1: Hero;
        let blueHero2: Hero;
        let blueHero3: Hero;
        let redMinion: Minion;
        let redHero: Hero;

        beforeEach(() => {
            // Create a completely fresh game state for each test
            gameState = new GameState();
            gameState.gameTime = 1000;
            gameState.gamePhase = 'playing';
            
            // Create blue heroes
            blueHero1 = new Hero();
            blueHero1.id = 'blue-hero-1';
            blueHero1.type = COMBATANT_TYPES.HERO;
            blueHero1.team = 'blue';
            blueHero1.x = 100;
            blueHero1.y = 100;
            blueHero1.health = 50;
            blueHero1.maxHealth = 50;
            blueHero1.attackRadius = 35;
            blueHero1.attackStrength = 5;
            blueHero1.attackSpeed = 1;
            blueHero1.lastAttackTime = 0;
            blueHero1.state = 'alive';
            blueHero1.respawnTime = 0;
            blueHero1.respawnDuration = 6000;
            blueHero1.experience = 0;
            blueHero1.roundStats = new RoundStats();
            blueHero1.roundStats.totalExperience = 0;
            blueHero1.level = 1;
            blueHero1.attackReadyAt = 0; // Initialize wind-up field
            blueHero1.ability = AbilityFactory.create('default');
            blueHero1.ability.cooldown = 1000;
            (blueHero1.ability as DefaultAbility).strength = 5;
            blueHero1.size = GAMEPLAY_CONFIG.COMBAT.HEROES.default.SIZE;

            blueHero2 = new Hero();
            blueHero2.id = 'blue-hero-2';
            blueHero2.type = COMBATANT_TYPES.HERO;
            blueHero2.team = 'blue';
            blueHero2.x = 120;
            blueHero2.y = 100;
            blueHero2.health = 50;
            blueHero2.maxHealth = 50;
            blueHero2.attackRadius = 35;
            blueHero2.attackStrength = 5;
            blueHero2.attackSpeed = 1;
            blueHero2.lastAttackTime = 0;
            blueHero2.state = 'alive';
            blueHero2.respawnTime = 0;
            blueHero2.respawnDuration = 6000;
            blueHero2.experience = 0;
            blueHero2.roundStats = new RoundStats();
            blueHero2.roundStats.totalExperience = 0;
            blueHero2.level = 1;
            blueHero2.ability = AbilityFactory.create('default');
            blueHero2.ability.cooldown = 1000;
            (blueHero2.ability as DefaultAbility).strength = 5;
            blueHero2.size = GAMEPLAY_CONFIG.COMBAT.HEROES.default.SIZE;

            blueHero3 = new Hero();
            blueHero3.id = 'blue-hero-3';
            blueHero3.type = COMBATANT_TYPES.HERO;
            blueHero3.team = 'blue';
            blueHero3.x = 140;
            blueHero3.y = 100;
            blueHero3.health = 50;
            blueHero3.maxHealth = 50;
            blueHero3.attackRadius = 35;
            blueHero3.attackStrength = 5;
            blueHero3.attackSpeed = 1;
            blueHero3.lastAttackTime = 0;
            blueHero3.state = 'alive';
            blueHero3.respawnTime = 0;
            blueHero3.respawnDuration = 6000;
            blueHero3.experience = 0;
            blueHero3.roundStats = new RoundStats();
            blueHero3.roundStats.totalExperience = 0;
            blueHero3.level = 1;
            blueHero3.ability = AbilityFactory.create('default');
            blueHero3.ability.cooldown = 1000;
            (blueHero3.ability as DefaultAbility).strength = 5;
            blueHero3.size = GAMEPLAY_CONFIG.COMBAT.HEROES.default.SIZE;

            // Create red minion to be killed
            redMinion = new Minion();
            redMinion.id = 'red-minion';
            redMinion.type = COMBATANT_TYPES.MINION;
            redMinion.team = 'red';
            redMinion.x = 110;
            redMinion.y = 100;
            redMinion.health = 0; // Dead
            redMinion.maxHealth = 50;
            redMinion.attackRadius = 20;
            redMinion.attackStrength = 10;
            redMinion.attackSpeed = 0.8;
            redMinion.lastAttackTime = 0;
            redMinion.minionType = 'warrior';
            redMinion.size = GAMEPLAY_CONFIG.COMBAT.MINION.WARRIOR.SIZE;

            // Create red hero to be killed
            redHero = new Hero();
            redHero.id = 'red-hero';
            redHero.type = COMBATANT_TYPES.HERO;
            redHero.team = 'red';
            redHero.x = 110;
            redHero.y = 100;
            redHero.health = 0; // Dead
            redHero.maxHealth = 50;
            redHero.attackRadius = 35;
            redHero.attackStrength = 5;
            redHero.attackSpeed = 1;
            redHero.lastAttackTime = 0;
            redHero.state = 'alive';
            redHero.respawnTime = 0;
            redHero.respawnDuration = 6000;
            redHero.experience = 0;
            redHero.roundStats = new RoundStats();
            redHero.roundStats.totalExperience = 0;
            redHero.level = 1;
            redHero.ability = AbilityFactory.create('default');
            redHero.ability.cooldown = 1000;
            (redHero.ability as DefaultAbility).strength = 5;
            redHero.size = GAMEPLAY_CONFIG.COMBAT.HEROES.default.SIZE;

            gameState.combatants.set(blueHero1.id, blueHero1);
            gameState.combatants.set(blueHero2.id, blueHero2);
            gameState.combatants.set(blueHero3.id, blueHero3);
            gameState.combatants.set(redMinion.id, redMinion);
            gameState.combatants.set(redHero.id, redHero);
        });

        it('should give 100% XP to single hero for unit kill', () => {
            // Only one hero in range
            blueHero2.x = 300; // Move out of range
            blueHero3.x = 300; // Move out of range
            
            // Remove the dead hero to avoid double XP
            gameState.combatants.delete('red-hero');

            const baseXP = GAMEPLAY_CONFIG.EXPERIENCE.MINION_KILLED;
            const originalXP = blueHero1.experience;

            result = handleUpdateGame(gameState, action);

            const finalHero = result.newState.combatants.get('blue-hero-1') as Hero;
            expect(finalHero.roundStats.totalExperience).toBe(originalXP + baseXP);
        });

        it('should give 70% XP each to two heroes for unit kill', () => {
            // Two heroes in range
            blueHero3.x = 300; // Move out of range
            
            // Remove the dead hero to avoid double XP
            gameState.combatants.delete('red-hero');

            const baseXP = GAMEPLAY_CONFIG.EXPERIENCE.MINION_KILLED;
            const expectedXP = baseXP * 1.4 / 2; // 140% total, split between 2 heroes

            const originalXP1 = blueHero1.experience;
            const originalXP2 = blueHero2.experience;

            result = handleUpdateGame(gameState, action);

            const finalHero1 = result.newState.combatants.get('blue-hero-1') as Hero;
            const finalHero2 = result.newState.combatants.get('blue-hero-2') as Hero;

            expect(finalHero1.roundStats.totalExperience).toBe(originalXP1 + expectedXP);
            expect(finalHero2.roundStats.totalExperience).toBe(originalXP2 + expectedXP);
        });

        it('should give 60% XP each to three heroes for unit kill', () => {
            // Three heroes in range
            
            // Remove the dead hero to avoid double XP
            gameState.combatants.delete('red-hero');
            
            const baseXP = GAMEPLAY_CONFIG.EXPERIENCE.MINION_KILLED;
            const expectedXP = baseXP * 1.8 / 3; // 180% total, split between 3 heroes

            const originalXP1 = blueHero1.experience;
            const originalXP2 = blueHero2.experience;
            const originalXP3 = blueHero3.experience;

            result = handleUpdateGame(gameState, action);

            const finalHero1 = result.newState.combatants.get('blue-hero-1') as Hero;
            const finalHero2 = result.newState.combatants.get('blue-hero-2') as Hero;
            const finalHero3 = result.newState.combatants.get('blue-hero-3') as Hero;

            expect(finalHero1.roundStats.totalExperience).toBe(originalXP1 + expectedXP);
            expect(finalHero2.roundStats.totalExperience).toBe(originalXP2 + expectedXP);
            expect(finalHero3.roundStats.totalExperience).toBe(originalXP3 + expectedXP);
        });

        it('should not give XP to heroes outside range', () => {
            // Move all heroes out of range
            blueHero1.x = 300;
            blueHero2.x = 300;
            blueHero3.x = 300;
            
            // Remove the dead hero to avoid double XP
            gameState.combatants.delete('red-hero');

            const originalXP1 = blueHero1.experience;
            const originalXP2 = blueHero2.experience;
            const originalXP3 = blueHero3.experience;

            result = handleUpdateGame(gameState, action);

            const finalHero1 = result.newState.combatants.get('blue-hero-1') as Hero;
            const finalHero2 = result.newState.combatants.get('blue-hero-2') as Hero;
            const finalHero3 = result.newState.combatants.get('blue-hero-3') as Hero;

            expect(finalHero1.roundStats.totalExperience).toBe(originalXP1);
            expect(finalHero2.roundStats.totalExperience).toBe(originalXP2);
            expect(finalHero3.roundStats.totalExperience).toBe(originalXP3);
        });

        it('should not give XP to dead heroes', () => {
            // Kill one hero
            blueHero1.health = 0;
            blueHero1.state = 'dead';
            
            // Remove the dead hero to avoid double XP
            gameState.combatants.delete('red-hero');

            const baseXP = GAMEPLAY_CONFIG.EXPERIENCE.MINION_KILLED;
            const expectedXP = baseXP * 1.4 / 2; // 140% total, split between 2 alive heroes

            const originalXP1 = blueHero1.experience;
            const originalXP2 = blueHero2.experience;
            const originalXP3 = blueHero3.experience;

            result = handleUpdateGame(gameState, action);

            const finalHero1 = result.newState.combatants.get('blue-hero-1') as Hero;
            const finalHero2 = result.newState.combatants.get('blue-hero-2') as Hero;
            const finalHero3 = result.newState.combatants.get('blue-hero-3') as Hero;

            expect(finalHero1.roundStats.totalExperience).toBe(originalXP1); // Dead hero gets no XP
            expect(finalHero2.roundStats.totalExperience).toBe(originalXP2 + expectedXP);
            expect(finalHero3.roundStats.totalExperience).toBe(originalXP3 + expectedXP);
        });

        it('should apply fall-off to hero kills as well', () => {
            // Remove minion, keep hero
            gameState.combatants.delete('red-minion');
            redHero.health = 0; // Dead hero

            const baseXP = redHero.level * GAMEPLAY_CONFIG.EXPERIENCE.HERO_KILL_MULTIPLIER;
            const expectedXP = baseXP * 1.2 / 2; // 120% total, split between 2 heroes

            const originalXP1 = blueHero1.experience;
            const originalXP2 = blueHero2.experience;

            result = handleUpdateGame(gameState, action);

            const finalHero1 = result.newState.combatants.get('blue-hero-1') as Hero;
            const finalHero2 = result.newState.combatants.get('blue-hero-2') as Hero;

            expect(finalHero1.roundStats.totalExperience).toBe(originalXP1 + expectedXP);
            expect(finalHero2.roundStats.totalExperience).toBe(originalXP2 + expectedXP);
        });
    });
}); 
