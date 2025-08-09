import { GameState } from '../../../schema/GameState';
import { Hero } from '../../../schema/Combatants';
import { DefaultAbility } from '../../../schema/Abilities';
import { GameStateMachine } from '../GameStateMachine';
import { COMBATANT_TYPES } from '../../../../shared/types/CombatantTypes';
import { GAMEPLAY_CONFIG } from '../../../../Config';

describe('GameStateMachine', () => {
    let initialState: GameState;

    beforeEach(() => {
        initialState = new GameState();
        initialState.gameTime = 0;
        initialState.gamePhase = 'playing';
    });

    describe('SETUP_GAME', () => {
        it('should initialize the game with cradles and turrets', () => {
            const result = GameStateMachine.processAction(initialState, { type: 'SETUP_GAME' });
            const newState = result.newState;

            // Check that game is in playing phase
            expect(newState.gamePhase).toBe('playing');
            expect(newState.gameTime).toBe(0);

            // Check that cradles are created
            const blueCradle = newState.combatants.get('blue-cradle');
            const redCradle = newState.combatants.get('red-cradle');
            
            expect(blueCradle).toBeDefined();
            expect(redCradle).toBeDefined();
            expect(blueCradle?.type).toBe(COMBATANT_TYPES.CRADLE);
            expect(redCradle?.type).toBe(COMBATANT_TYPES.CRADLE);
            expect(blueCradle?.team).toBe('blue');
            expect(redCradle?.team).toBe('red');

            // Check that turrets are created
            const blueTurret = newState.combatants.get('blue-turret');
            const redTurret = newState.combatants.get('red-turret');
            
            expect(blueTurret).toBeDefined();
            expect(redTurret).toBeDefined();
            expect(blueTurret?.type).toBe(COMBATANT_TYPES.TURRET);
            expect(redTurret?.type).toBe(COMBATANT_TYPES.TURRET);
        });
    });

    describe('SPAWN_PLAYER', () => {
        it('should spawn a player', () => {
            const result = GameStateMachine.processAction(initialState, {
                type: 'SPAWN_PLAYER',
                payload: { playerId: 'player1', team: 'blue' }
            });

            const newState = result.newState;
            expect(newState.combatants.size).toBe(1);
            
            // Find the hero by controller
            let hero: Hero | undefined;
            newState.combatants.forEach((combatant) => {
                if (combatant.type === COMBATANT_TYPES.HERO && (combatant as Hero).controller === 'player1') {
                    hero = combatant as Hero;
                }
            });
            
            expect(hero).toBeDefined();
            expect(hero?.team).toBe('blue');
            expect(hero?.health).toBe(GAMEPLAY_CONFIG.COMBAT.HEROES.default.HEALTH);
            expect(hero?.controller).toBe('player1');
        });

        it('should spawn multiple players', () => {
            const result1 = GameStateMachine.processAction(initialState, {
                type: 'SPAWN_PLAYER',
                payload: { playerId: 'player1', team: 'blue' }
            });

            const result2 = GameStateMachine.processAction(result1.newState, {
                type: 'SPAWN_PLAYER',
                payload: { playerId: 'player2', team: 'red' }
            });

            const newState = result2.newState;
            expect(newState.combatants.size).toBe(2);
            
            // Find heroes by controller
            let hero1: Hero | undefined;
            let hero2: Hero | undefined;
            newState.combatants.forEach((combatant) => {
                if (combatant.type === COMBATANT_TYPES.HERO) {
                    const hero = combatant as Hero;
                    if (hero.controller === 'player1') hero1 = hero;
                    if (hero.controller === 'player2') hero2 = hero;
                }
            });
            
            expect(hero1).toBeDefined();
            expect(hero2).toBeDefined();
            expect(hero1?.team).toBe('blue');
            expect(hero2?.team).toBe('red');
        });

        it('should preserve existing combatant types when spawning players', () => {
            // Setup game
            const setupResult = GameStateMachine.processAction(initialState, { type: 'SETUP_GAME' });
            
            // Spawn a player
            const result = GameStateMachine.processAction(setupResult.newState, {
                type: 'SPAWN_PLAYER',
                payload: { playerId: 'player1', team: 'blue' }
            });
            
            const newState = result.newState;
            
            // Verify that existing combatants still have correct types
            const blueCradle = newState.combatants.get('blue-cradle');
            const redCradle = newState.combatants.get('red-cradle');
            const blueTurret = newState.combatants.get('blue-turret');
            const redTurret = newState.combatants.get('red-turret');
            
            expect(blueCradle?.type).toBe(COMBATANT_TYPES.CRADLE);
            expect(redCradle?.type).toBe(COMBATANT_TYPES.CRADLE);
            expect(blueTurret?.type).toBe(COMBATANT_TYPES.TURRET);
            expect(redTurret?.type).toBe(COMBATANT_TYPES.TURRET);
        });
    });

    describe('UPDATE_GAME', () => {
        it('should advance game time and process combat', () => {
            // Setup game with players
            const setupResult = GameStateMachine.processAction(initialState, { type: 'SETUP_GAME' });
            const spawnResult = GameStateMachine.processAction(setupResult.newState, {
                type: 'SPAWN_PLAYER',
                payload: { playerId: 'player1', team: 'blue' }
            });
            
            // Update game with time delta
            const result = GameStateMachine.processAction(spawnResult.newState, {
                type: 'UPDATE_GAME',
                payload: { deltaTime: 100 }
            });
            
            const newState = result.newState;
            
            // Check that time advanced
            expect(newState.gameTime).toBe(100);
            
            // Check that attack events array exists (even if empty)
            expect(newState.attackEvents).toBeDefined();
        });

        it('should handle player death and respawn', () => {
            // Spawn a player
            const spawnResult = GameStateMachine.processAction(initialState, {
                type: 'SPAWN_PLAYER',
                payload: { playerId: 'player1', team: 'blue' }
            });
            
            // Find the hero by controller
            let hero: Hero | undefined;
            spawnResult.newState.combatants.forEach((combatant) => {
                if (combatant.type === COMBATANT_TYPES.HERO && (combatant as Hero).controller === 'player1') {
                    hero = combatant as Hero;
                }
            });
            
            // Kill the hero
            if (hero) {
                hero.health = 0;
            }
            
            // Update game to trigger respawn
            const result = GameStateMachine.processAction(spawnResult.newState, {
                type: 'UPDATE_GAME',
                payload: { deltaTime: 100 }
            });
            
            // Find the hero again by controller
            let updatedHero: Hero | undefined;
            result.newState.combatants.forEach((combatant) => {
                if (combatant.type === COMBATANT_TYPES.HERO && (combatant as Hero).controller === 'player1') {
                    updatedHero = combatant as Hero;
                }
            });
            
            // Hero should be respawning
            expect(updatedHero?.state).toBe('respawning');
            expect(updatedHero?.health).toBe(0);
        });

        it('should complete respawn after respawn time', () => {
            // Spawn a player
            const spawnResult = GameStateMachine.processAction(initialState, {
                type: 'SPAWN_PLAYER',
                payload: { playerId: 'player1', team: 'blue' }
            });
            
            // Find the hero by controller
            let hero: Hero | undefined;
            spawnResult.newState.combatants.forEach((combatant) => {
                if (combatant.type === COMBATANT_TYPES.HERO && (combatant as Hero).controller === 'player1') {
                    hero = combatant as Hero;
                }
            });
            
            // Kill the hero and start respawn
            if (hero) {
                hero.health = 0;
            }
            
            // Update game to trigger respawn
            const result1 = GameStateMachine.processAction(spawnResult.newState, {
                type: 'UPDATE_GAME',
                payload: { deltaTime: 100 }
            });
            
            // Find the hero again by controller
            let respawningHero: Hero | undefined;
            result1.newState.combatants.forEach((combatant) => {
                if (combatant.type === COMBATANT_TYPES.HERO && (combatant as Hero).controller === 'player1') {
                    respawningHero = combatant as Hero;
                }
            });
            
            // Set respawn time to be completed
            if (respawningHero) {
                respawningHero.respawnTime = result1.newState.gameTime - 100; // Respawn time in the past
            }
            
            // Update game to complete respawn
            const result2 = GameStateMachine.processAction(result1.newState, {
                type: 'UPDATE_GAME',
                payload: { deltaTime: 100 }
            });
            
            // Find the hero again by controller
            let updatedHero: Hero | undefined;
            result2.newState.combatants.forEach((combatant) => {
                if (combatant.type === COMBATANT_TYPES.HERO && (combatant as Hero).controller === 'player1') {
                    updatedHero = combatant as Hero;
                }
            });
            
            // Hero should be alive again with full health
            expect(updatedHero?.state).toBe('alive');
            expect(updatedHero?.health).toBe(updatedHero?.maxHealth);
        });

        it('should grant experience when turret is destroyed', () => {
            // Setup game with players
            const setupResult = GameStateMachine.processAction(initialState, { type: 'SETUP_GAME' });
            const spawnResult = GameStateMachine.processAction(setupResult.newState, {
                type: 'SPAWN_PLAYER',
                payload: { playerId: 'player1', team: 'blue' }
            });
            
            // Destroy a turret
            const redTurret = spawnResult.newState.combatants.get('red-turret');
            if (redTurret) {
                redTurret.health = 0; // Destroy the turret
            }
            
            // Update game - should grant experience to blue team
            const result = GameStateMachine.processAction(spawnResult.newState, {
                type: 'UPDATE_GAME',
                payload: { deltaTime: 100 }
            });
            
            const newState = result.newState;
            // Find the player by controller
            let player: Hero | undefined;
            newState.combatants.forEach((combatant) => {
                if (combatant.type === COMBATANT_TYPES.HERO && (combatant as Hero).controller === 'player1') {
                    player = combatant as Hero;
                }
            });
            
            // Player should have gained experience and leveled up
            // 50 experience granted, 15 needed for level 1, 30 needed for level 2, so 5 remaining
            expect(player?.roundStats.totalExperience).toBe(GAMEPLAY_CONFIG.EXPERIENCE.TOWER_DESTROYED);
            expect(player?.level).toBe(3); // Should have leveled up
        });

        it('should grant experience to players', () => {
            // Spawn a player
            const spawnResult = GameStateMachine.processAction(initialState, {
                type: 'SPAWN_PLAYER',
                payload: { playerId: 'player1', team: 'blue' }
            });
            
            // Find the hero by controller
            let hero: Hero | undefined;
            spawnResult.newState.combatants.forEach((combatant) => {
                if (combatant.type === COMBATANT_TYPES.HERO && (combatant as Hero).controller === 'player1') {
                    hero = combatant as Hero;
                }
            });
            
            // Manually grant experience by updating the hero directly
            if (hero) {
                hero.experience = 5; // Less than the 10 needed to level up
                hero.roundStats.totalExperience = 5;
            }
            
            // Update game to process the experience
            const result = GameStateMachine.processAction(spawnResult.newState, {
                type: 'UPDATE_GAME',
                payload: { deltaTime: 100 }
            });
            
            // Find the hero again by controller
            let updatedHero: Hero | undefined;
            result.newState.combatants.forEach((combatant) => {
                if (combatant.type === COMBATANT_TYPES.HERO && (combatant as Hero).controller === 'player1') {
                    updatedHero = combatant as Hero;
                }
            });
            
            // Hero should have gained experience
            expect(updatedHero?.roundStats.totalExperience).toBe(5);
        });

        it('should level up players when they gain enough experience', () => {
            // Spawn a player
            const spawnResult = GameStateMachine.processAction(initialState, {
                type: 'SPAWN_PLAYER',
                payload: { playerId: 'player1', team: 'blue' }
            });
            
            // Find the hero by controller
            let hero: Hero | undefined;
            spawnResult.newState.combatants.forEach((combatant) => {
                if (combatant.type === COMBATANT_TYPES.HERO && (combatant as Hero).controller === 'player1') {
                    hero = combatant as Hero;
                }
            });
            
            // Give hero enough experience to level up
            if (hero) {
                hero.experience = GAMEPLAY_CONFIG.EXPERIENCE.LEVEL_UP_MULTIPLIER; // Enough to level up
                hero.roundStats.totalExperience = GAMEPLAY_CONFIG.EXPERIENCE.LEVEL_UP_MULTIPLIER;
            }
            
            // Update game to trigger level up
            const result = GameStateMachine.processAction(spawnResult.newState, {
                type: 'UPDATE_GAME',
                payload: { deltaTime: 100 }
            });
            
            // Find the hero again by controller
            let updatedHero: Hero | undefined;
            result.newState.combatants.forEach((combatant) => {
                if (combatant.type === COMBATANT_TYPES.HERO && (combatant as Hero).controller === 'player1') {
                    updatedHero = combatant as Hero;
                }
            });
            
            // Hero should be level 2 with boosted stats
            expect(updatedHero?.level).toBe(2);
            expect(updatedHero?.roundStats.totalExperience).toBe(GAMEPLAY_CONFIG.EXPERIENCE.LEVEL_UP_MULTIPLIER); // Total experience should be preserved
            expect(updatedHero?.maxHealth).toBeGreaterThan(GAMEPLAY_CONFIG.COMBAT.HEROES.default.HEALTH);
            expect(updatedHero?.attackStrength).toBeGreaterThan(GAMEPLAY_CONFIG.COMBAT.HEROES.default.ATTACK_STRENGTH);
        });

        it('should preserve combatant types during game updates', () => {
            // Setup game with a player
            const setupResult = GameStateMachine.processAction(initialState, { type: 'SETUP_GAME' });
            const spawnResult = GameStateMachine.processAction(setupResult.newState, {
                type: 'SPAWN_PLAYER',
                payload: { playerId: 'player1', team: 'blue' }
            });
            
            // Update game multiple times
            let currentState = spawnResult.newState;
            for (let i = 0; i < 5; i++) {
                const result = GameStateMachine.processAction(currentState, {
                    type: 'UPDATE_GAME',
                    payload: { deltaTime: 100 }
                });
                currentState = result.newState;
            }
            
            // Verify that all combatants still have correct types
            const blueCradle = currentState.combatants.get('blue-cradle');
            const redCradle = currentState.combatants.get('red-cradle');
            const blueTurret = currentState.combatants.get('blue-turret');
            const redTurret = currentState.combatants.get('red-turret');
            // Find the player by controller
            let player: Hero | undefined;
            currentState.combatants.forEach((combatant) => {
                if (combatant.type === COMBATANT_TYPES.HERO && (combatant as Hero).controller === 'player1') {
                    player = combatant as Hero;
                }
            });
            
            expect(blueCradle?.type).toBe(COMBATANT_TYPES.CRADLE);
            expect(redCradle?.type).toBe(COMBATANT_TYPES.CRADLE);
            expect(blueTurret?.type).toBe(COMBATANT_TYPES.TURRET);
            expect(redTurret?.type).toBe(COMBATANT_TYPES.TURRET);
            expect(player?.type).toBe(COMBATANT_TYPES.HERO);
        });

        it('should debug experience grant issue', () => {
            // Setup game with players
            const setupResult = GameStateMachine.processAction(initialState, { type: 'SETUP_GAME' });
            const spawnResult = GameStateMachine.processAction(setupResult.newState, {
                type: 'SPAWN_PLAYER',
                payload: { playerId: 'player1', team: 'blue' }
            });
            
            // Destroy a turret
            const redTurret = spawnResult.newState.combatants.get('red-turret');
            if (redTurret) {
                redTurret.health = 0; // Destroy the turret
            }
            
            // Update game - should grant experience to blue team
            const result = GameStateMachine.processAction(spawnResult.newState, {
                type: 'UPDATE_GAME',
                payload: { deltaTime: 100 }
            });
            
            const newState = result.newState;
            // Find the player by controller
            let player: Hero | undefined;
            newState.combatants.forEach((combatant) => {
                if (combatant.type === COMBATANT_TYPES.HERO && (combatant as Hero).controller === 'player1') {
                    player = combatant as Hero;
                }
            });
            
            // Player should have gained experience and leveled up
            // 50 experience granted, 15 needed for level 1, 30 needed for level 2, so 5 remaining
            expect(player?.roundStats.totalExperience).toBe(GAMEPLAY_CONFIG.EXPERIENCE.TOWER_DESTROYED);
            expect(player?.level).toBe(3); // Should have leveled up
        });

        it('should debug level up issue', () => {
            // Setup game with a player
            const setupResult = GameStateMachine.processAction(initialState, { type: 'SETUP_GAME' });
            const spawnResult = GameStateMachine.processAction(setupResult.newState, {
                type: 'SPAWN_PLAYER',
                payload: { playerId: 'player1', team: 'blue' }
            });
            
            // Find the player by controller and give enough experience to level up
            let player: Hero | undefined;
            spawnResult.newState.combatants.forEach((combatant) => {
                if (combatant.type === COMBATANT_TYPES.HERO && (combatant as Hero).controller === 'player1') {
                    player = combatant as Hero;
                }
            });
            if (player) {
                player.experience = GAMEPLAY_CONFIG.EXPERIENCE.LEVEL_UP_MULTIPLIER + 5; // More than enough to level up
                player.roundStats.totalExperience = GAMEPLAY_CONFIG.EXPERIENCE.LEVEL_UP_MULTIPLIER + 5;
            }
            
            // Update game - should trigger level up
            const result = GameStateMachine.processAction(spawnResult.newState, {
                type: 'UPDATE_GAME',
                payload: { deltaTime: 100 }
            });
            
            const newState = result.newState;
            // Find the updated player by controller
            let updatedPlayer: Hero | undefined;
            newState.combatants.forEach((combatant) => {
                if (combatant.type === COMBATANT_TYPES.HERO && (combatant as Hero).controller === 'player1') {
                    updatedPlayer = combatant as Hero;
                }
            });
            
            // Player should be level 2 with boosted stats
            expect(updatedPlayer?.level).toBe(2);
            expect(updatedPlayer?.roundStats.totalExperience).toBe(20); // Should have 20 total experience (15 + 5)
            expect(updatedPlayer?.maxHealth).toBeGreaterThan(GAMEPLAY_CONFIG.COMBAT.HEROES.default.HEALTH);
            expect(updatedPlayer?.attackStrength).toBeGreaterThan(GAMEPLAY_CONFIG.COMBAT.HEROES.default.ATTACK_STRENGTH);
        });

        it('should verify deep copy preserves manual changes', () => {
            // Setup game with a player
            const setupResult = GameStateMachine.processAction(initialState, { type: 'SETUP_GAME' });
            const spawnResult = GameStateMachine.processAction(setupResult.newState, {
                type: 'SPAWN_PLAYER',
                payload: { playerId: 'player1', team: 'blue' }
            });
            
            // Find the player by controller and modify the state manually
            let player: Hero | undefined;
            spawnResult.newState.combatants.forEach((combatant) => {
                if (combatant.type === COMBATANT_TYPES.HERO && (combatant as Hero).controller === 'player1') {
                    player = combatant as Hero;
                }
            });
            const redTurret = spawnResult.newState.combatants.get('red-turret');
            
            if (player) {
                player.experience = 50;
                player.roundStats.totalExperience = 50;
            }
            if (redTurret) redTurret.health = 0;
            
            // Process an action to trigger deep copy
            const result = GameStateMachine.processAction(spawnResult.newState, {
                type: 'UPDATE_GAME',
                payload: { deltaTime: 100 }
            });
            
            const newState = result.newState;
            // Find the new player by controller
            let newPlayer: Hero | undefined;
            newState.combatants.forEach((combatant) => {
                if (combatant.type === COMBATANT_TYPES.HERO && (combatant as Hero).controller === 'player1') {
                    newPlayer = combatant as Hero;
                }
            });
            const newRedTurret = newState.combatants.get('red-turret');
            
            // Verify that our manual changes are preserved, accounting for turret destruction
            // Player starts with 50, gets 50 from turret destruction (total 100)
            // Level 1->2: consumes 15 XP, leaving 85
            // Level 2->3: consumes 30 XP, leaving 55
            expect(newPlayer?.roundStats.totalExperience).toBe(100);
            expect(newRedTurret).toBeUndefined(); // Turret was destroyed and removed
        });
    });

    describe('REMOVE_PLAYER', () => {
        it('should remove a player from the game', () => {
            // Setup game and spawn player
            const setupResult = GameStateMachine.processAction(initialState, { type: 'SETUP_GAME' });
            const spawnResult = GameStateMachine.processAction(setupResult.newState, {
                type: 'SPAWN_PLAYER',
                payload: { playerId: 'player1', team: 'blue' }
            });
            
            // Verify player exists by finding it by controller
            let hero: Hero | undefined;
            spawnResult.newState.combatants.forEach((combatant) => {
                if (combatant.type === COMBATANT_TYPES.HERO && (combatant as Hero).controller === 'player1') {
                    hero = combatant as Hero;
                }
            });
            expect(hero).toBeDefined();
            
            // Remove player
            const result = GameStateMachine.processAction(spawnResult.newState, {
                type: 'REMOVE_PLAYER',
                payload: { playerId: 'player1' }
            });
            
            // Verify player is removed by checking that no hero with this controller exists
            let removedHero: Hero | undefined;
            result.newState.combatants.forEach((combatant) => {
                if (combatant.type === COMBATANT_TYPES.HERO && (combatant as Hero).controller === 'player1') {
                    removedHero = combatant as Hero;
                }
            });
            expect(removedHero).toBeUndefined();
            
            // Verify other entities still exist
            expect(result.newState.combatants.get('blue-cradle')).toBeDefined();
            expect(result.newState.combatants.get('red-cradle')).toBeDefined();
        });

        it('should preserve combatant types when removing players', () => {
            // Setup game and spawn player
            const setupResult = GameStateMachine.processAction(initialState, { type: 'SETUP_GAME' });
            const spawnResult = GameStateMachine.processAction(setupResult.newState, {
                type: 'SPAWN_PLAYER',
                payload: { playerId: 'player1', team: 'blue' }
            });
            
            // Remove player
            const result = GameStateMachine.processAction(spawnResult.newState, {
                type: 'REMOVE_PLAYER',
                payload: { playerId: 'player1' }
            });
            
            // Verify that remaining combatants still have correct types
            const blueCradle = result.newState.combatants.get('blue-cradle');
            const redCradle = result.newState.combatants.get('red-cradle');
            const blueTurret = result.newState.combatants.get('blue-turret');
            const redTurret = result.newState.combatants.get('red-turret');
            
            expect(blueCradle?.type).toBe(COMBATANT_TYPES.CRADLE);
            expect(redCradle?.type).toBe(COMBATANT_TYPES.CRADLE);
            expect(blueTurret?.type).toBe(COMBATANT_TYPES.TURRET);
            expect(redTurret?.type).toBe(COMBATANT_TYPES.TURRET);
        });
    });

    describe('MOVE_HERO', () => {
        it('should move player towards target', () => {
            // Spawn a player
            const spawnResult = GameStateMachine.processAction(initialState, {
                type: 'SPAWN_PLAYER',
                payload: { playerId: 'player1', team: 'blue' }
            });
            
            // Find the hero by controller
            let hero: Hero | undefined;
            spawnResult.newState.combatants.forEach((combatant) => {
                if (combatant.type === COMBATANT_TYPES.HERO && (combatant as Hero).controller === 'player1') {
                    hero = combatant as Hero;
                }
            });
            
            const initialX = hero?.x || 0;
            const initialY = hero?.y || 0;
            
            // Move player
            const result = GameStateMachine.processAction(spawnResult.newState, {
                type: 'MOVE_HERO',
                payload: { 
                    heroId: hero!.id, 
                    targetX: initialX + 100, 
                    targetY: initialY + 100 
                }
            });
            
            // Find the hero again by controller
            let movedHero: Hero | undefined;
            result.newState.combatants.forEach((combatant) => {
                if (combatant.type === COMBATANT_TYPES.HERO && (combatant as Hero).controller === 'player1') {
                    movedHero = combatant as Hero;
                }
            });
            
            // Hero should have moved towards target
            expect(movedHero?.x).toBeGreaterThan(initialX);
            expect(movedHero?.y).toBeGreaterThan(initialY);
        });

        it('should not move respawning players', () => {
            // Spawn a player
            const spawnResult = GameStateMachine.processAction(initialState, {
                type: 'SPAWN_PLAYER',
                payload: { playerId: 'player1', team: 'blue' }
            });
            
            // Find the hero by controller
            let hero: Hero | undefined;
            spawnResult.newState.combatants.forEach((combatant) => {
                if (combatant.type === COMBATANT_TYPES.HERO && (combatant as Hero).controller === 'player1') {
                    hero = combatant as Hero;
                }
            });
            
            // Kill hero and start respawn
            if (hero) {
                hero.health = 0;
            }
            
            // Update game to trigger respawn
            const respawnResult = GameStateMachine.processAction(spawnResult.newState, {
                type: 'UPDATE_GAME',
                payload: { deltaTime: 100 }
            });
            
            // Find the respawning hero by controller
            let respawningHero: Hero | undefined;
            respawnResult.newState.combatants.forEach((combatant) => {
                if (combatant.type === COMBATANT_TYPES.HERO && (combatant as Hero).controller === 'player1') {
                    respawningHero = combatant as Hero;
                }
            });
            
            const respawnX = respawningHero?.x || 0;
            const respawnY = respawningHero?.y || 0;
            
            // Try to move respawning hero
            const result = GameStateMachine.processAction(respawnResult.newState, {
                type: 'MOVE_HERO',
                payload: { 
                    heroId: hero!.id, 
                    targetX: respawnX + 100, 
                    targetY: respawnY + 100 
                }
            });
            
            // Find the hero again by controller
            let updatedHero: Hero | undefined;
            result.newState.combatants.forEach((combatant) => {
                if (combatant.type === COMBATANT_TYPES.HERO && (combatant as Hero).controller === 'player1') {
                    updatedHero = combatant as Hero;
                }
            });
            
            // Hero should not have moved
            expect(updatedHero?.x).toBe(respawnX);
            expect(updatedHero?.y).toBe(respawnY);
        });

        it('should preserve combatant types when moving players', () => {
            // Setup game and spawn player
            const setupResult = GameStateMachine.processAction(initialState, { type: 'SETUP_GAME' });
            const spawnResult = GameStateMachine.processAction(setupResult.newState, {
                type: 'SPAWN_PLAYER',
                payload: { playerId: 'player1', team: 'blue' }
            });
            
            // Find the hero by controller
            let hero: Hero | undefined;
            spawnResult.newState.combatants.forEach((combatant) => {
                if (combatant.type === COMBATANT_TYPES.HERO && (combatant as Hero).controller === 'player1') {
                    hero = combatant as Hero;
                }
            });
            
            // Move player
            const result = GameStateMachine.processAction(spawnResult.newState, {
                type: 'MOVE_HERO',
                payload: { heroId: hero!.id, targetX: 100, targetY: 100 }
            });
            
            // Verify that all combatants still have correct types
            const blueCradle = result.newState.combatants.get('blue-cradle');
            const redCradle = result.newState.combatants.get('red-cradle');
            const blueTurret = result.newState.combatants.get('blue-turret');
            const redTurret = result.newState.combatants.get('red-turret');
            // Find the player by controller
            let player: Hero | undefined;
            result.newState.combatants.forEach((combatant) => {
                if (combatant.type === COMBATANT_TYPES.HERO && (combatant as Hero).controller === 'player1') {
                    player = combatant as Hero;
                }
            });
            
            expect(blueCradle?.type).toBe(COMBATANT_TYPES.CRADLE);
            expect(redCradle?.type).toBe(COMBATANT_TYPES.CRADLE);
            expect(blueTurret?.type).toBe(COMBATANT_TYPES.TURRET);
            expect(redTurret?.type).toBe(COMBATANT_TYPES.TURRET);
            expect(player?.type).toBe(COMBATANT_TYPES.HERO);
        });
    });

    describe('END_GAME', () => {
        it('should end the game and preserve combatant types', () => {
            // Setup game and spawn player
            const setupResult = GameStateMachine.processAction(initialState, { type: 'SETUP_GAME' });
            const spawnResult = GameStateMachine.processAction(setupResult.newState, {
                type: 'SPAWN_PLAYER',
                payload: { playerId: 'player1', team: 'blue' }
            });
            
            // End game
            const result = GameStateMachine.processAction(spawnResult.newState, {
                type: 'END_GAME',
                payload: { winningTeam: 'blue' }
            });
            
            // Verify game is finished
            expect(result.newState.gamePhase).toBe('finished');
            
            // Verify that all combatants still have correct types
            const blueCradle = result.newState.combatants.get('blue-cradle');
            const redCradle = result.newState.combatants.get('red-cradle');
            const blueTurret = result.newState.combatants.get('blue-turret');
            const redTurret = result.newState.combatants.get('red-turret');
            // Find the player by controller
            let player: Hero | undefined;
            result.newState.combatants.forEach((combatant) => {
                if (combatant.type === COMBATANT_TYPES.HERO && (combatant as Hero).controller === 'player1') {
                    player = combatant as Hero;
                }
            });
            
            expect(blueCradle?.type).toBe(COMBATANT_TYPES.CRADLE);
            expect(redCradle?.type).toBe(COMBATANT_TYPES.CRADLE);
            expect(blueTurret?.type).toBe(COMBATANT_TYPES.TURRET);
            expect(redTurret?.type).toBe(COMBATANT_TYPES.TURRET);
            expect(player?.type).toBe(COMBATANT_TYPES.HERO);
        });
    });

    describe('Multiple Level-ups', () => {
        it('should correctly increase player stats when multiple level-ups occur simultaneously', () => {
            // Setup game and spawn player
            const setupResult = GameStateMachine.processAction(initialState, { type: 'SETUP_GAME' });
            const spawnResult = GameStateMachine.processAction(setupResult.newState, {
                type: 'SPAWN_PLAYER',
                payload: { playerId: 'player1', team: 'blue' }
            });
            
            // Find the player by controller
            let player: Hero | undefined;
            spawnResult.newState.combatants.forEach((combatant) => {
                if (combatant.type === COMBATANT_TYPES.HERO && (combatant as Hero).controller === 'player1') {
                    player = combatant as Hero;
                }
            });
            
            expect(player).toBeDefined();
            
            // Store initial stats
            const initialLevel = player!.level;
            const initialMaxHealth = player!.maxHealth;
            const initialAttackStrength = player!.attackStrength;
            const initialAttackRadius = player!.attackRadius;
            const initialAttackSpeed = player!.attackSpeed;
            const initialRespawnDuration = player!.respawnDuration;
            const initialAbilityStrength = (player!.ability as DefaultAbility).strength;
            
            // Grant enough experience to level up multiple times
            // Level 1->2: needs 15 XP
            // Level 2->3: needs 30 XP  
            // Level 3->4: needs 45 XP
            // Total needed: 15 + 30 + 45 = 90 XP
            // Grant 100 XP to ensure multiple level-ups
            const experienceToGrant = 100;
            
            // Update game to grant experience
            const result = GameStateMachine.processAction(spawnResult.newState, {
                type: 'UPDATE_GAME',
                payload: { deltaTime: 1000 }
            });
            
            // Manually grant experience to the player
            player!.experience += experienceToGrant;
            player!.roundStats.totalExperience += experienceToGrant;
            
            // Update game again to trigger level-ups
            const finalResult = GameStateMachine.processAction(result.newState, {
                type: 'UPDATE_GAME',
                payload: { deltaTime: 1000 }
            });
            
            // Find the updated player
            let updatedPlayer: Hero | undefined;
            finalResult.newState.combatants.forEach((combatant) => {
                if (combatant.type === COMBATANT_TYPES.HERO && (combatant as Hero).controller === 'player1') {
                    updatedPlayer = combatant as Hero;
                }
            });
            
            expect(updatedPlayer).toBeDefined();
            
            // Verify level increased
            expect(updatedPlayer!.level).toBeGreaterThan(initialLevel);
            
            // Calculate expected stat increases based on configuration
            const statBoostMultiplier = 1 + GAMEPLAY_CONFIG.EXPERIENCE.STAT_BOOST_PERCENTAGE; // 1.15
            const rangeBoostMultiplier = 1 + GAMEPLAY_CONFIG.EXPERIENCE.RANGE_BOOST_PERCENTAGE; // 1.10
            const abilityBoostMultiplier = 1 + GAMEPLAY_CONFIG.EXPERIENCE.ABILITY_STRENGTH_BOOST_PERCENTAGE; // 1.20
            
            // Calculate expected stats after multiple level-ups
            // Level 1->2: multiply by 1.15
            // Level 2->3: multiply by 1.15 again
            // Level 3->4: multiply by 1.15 again
            const levelIncrease = updatedPlayer!.level - initialLevel;
            const expectedStatMultiplier = Math.pow(statBoostMultiplier, levelIncrease);
            const expectedRangeMultiplier = Math.pow(rangeBoostMultiplier, levelIncrease);
            const expectedAbilityMultiplier = Math.pow(abilityBoostMultiplier, levelIncrease);
            
            // Verify stats increased correctly
            expect(updatedPlayer!.maxHealth).toBe(Math.round(initialMaxHealth * expectedStatMultiplier));
            expect(updatedPlayer!.attackStrength).toBe(Math.round(initialAttackStrength * expectedStatMultiplier));
            expect(updatedPlayer!.attackRadius).toBe(Math.round(initialAttackRadius * expectedRangeMultiplier));
            expect(updatedPlayer!.attackSpeed).toBe(initialAttackSpeed * expectedStatMultiplier);
            expect(updatedPlayer!.respawnDuration).toBe(Math.round(initialRespawnDuration * expectedStatMultiplier));
            expect((updatedPlayer!.ability as DefaultAbility).strength).toBe(Math.round(initialAbilityStrength * expectedAbilityMultiplier));
            
            // Calculate expected experience consumption based on actual level-ups
            let totalExperienceNeeded = 0;
            for (let level = initialLevel; level < updatedPlayer!.level; level++) {
                totalExperienceNeeded += level * GAMEPLAY_CONFIG.EXPERIENCE.LEVEL_UP_MULTIPLIER;
            }
            const expectedRemainingExperience = experienceToGrant - totalExperienceNeeded;
            expect(updatedPlayer!.experience).toBe(expectedRemainingExperience);
            
            // Verify total experience tracking
            expect(updatedPlayer!.roundStats.totalExperience).toBe(experienceToGrant);
        });
    });
}); 
