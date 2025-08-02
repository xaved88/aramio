import { GameState, Player } from '../../../schema/GameState';
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
        it('should spawn a player with correct initial stats', () => {
            // First setup the game
            const setupResult = GameStateMachine.processAction(initialState, { type: 'SETUP_GAME' });
            
            // Then spawn a player
            const result = GameStateMachine.processAction(setupResult.newState, {
                type: 'SPAWN_PLAYER',
                payload: { playerId: 'player1', team: 'blue' }
            });
            
            const newState = result.newState;
            const player = newState.combatants.get('player1') as Player;
            
            expect(player).toBeDefined();
            expect(player?.type).toBe(COMBATANT_TYPES.PLAYER);
            expect(player?.team).toBe('blue');
            expect(player?.health).toBe(100); // Default player health
            expect(player?.maxHealth).toBe(100);
            expect(player?.level).toBe(1);
            expect(player?.experience).toBe(0);
            expect(player?.state).toBe('alive');
        });

        it('should spawn players on alternating teams', () => {
            // Setup game
            const setupResult = GameStateMachine.processAction(initialState, { type: 'SETUP_GAME' });
            
            // Spawn first player (should be blue)
            const result1 = GameStateMachine.processAction(setupResult.newState, {
                type: 'SPAWN_PLAYER',
                payload: { playerId: 'player1', team: 'blue' }
            });
            
            // Spawn second player (should be red)
            const result2 = GameStateMachine.processAction(result1.newState, {
                type: 'SPAWN_PLAYER',
                payload: { playerId: 'player2', team: 'red' }
            });
            
            const player1 = result2.newState.combatants.get('player1') as Player;
            const player2 = result2.newState.combatants.get('player2') as Player;
            
            expect(player1?.team).toBe('blue');
            expect(player2?.team).toBe('red');
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

        it('should handle player respawning when they die', () => {
            // Setup game with a player
            const setupResult = GameStateMachine.processAction(initialState, { type: 'SETUP_GAME' });
            const spawnResult = GameStateMachine.processAction(setupResult.newState, {
                type: 'SPAWN_PLAYER',
                payload: { playerId: 'player1', team: 'blue' }
            });
            
            // Kill the player
            const player = spawnResult.newState.combatants.get('player1') as Player;
            if (player) {
                player.health = 0;
            }
            
            // Update game - should start respawn process
            const result = GameStateMachine.processAction(spawnResult.newState, {
                type: 'UPDATE_GAME',
                payload: { deltaTime: 100 }
            });
            
            const newState = result.newState;
            const updatedPlayer = newState.combatants.get('player1') as Player;
            
            // Player should be respawning
            expect(updatedPlayer?.state).toBe('respawning');
            expect(updatedPlayer?.health).toBe(0);
            expect(updatedPlayer?.respawnTime).toBeGreaterThan(newState.gameTime);
        });

        it('should complete player respawn when timer expires', () => {
            // Setup game with a player
            const setupResult = GameStateMachine.processAction(initialState, { type: 'SETUP_GAME' });
            const spawnResult = GameStateMachine.processAction(setupResult.newState, {
                type: 'SPAWN_PLAYER',
                payload: { playerId: 'player1', team: 'blue' }
            });
            
            // Kill the player and start respawn
            const player = spawnResult.newState.combatants.get('player1') as Player;
            if (player) {
                player.health = 0;
                player.state = 'respawning';
                player.respawnTime = 1000; // Set respawn time to 1 second
            }
            
            // Update game past respawn time
            const result = GameStateMachine.processAction(spawnResult.newState, {
                type: 'UPDATE_GAME',
                payload: { deltaTime: 1500 } // More than respawn time
            });
            
            const newState = result.newState;
            const updatedPlayer = newState.combatants.get('player1') as Player;
            
            // Player should be alive again with full health
            expect(updatedPlayer?.state).toBe('alive');
            expect(updatedPlayer?.health).toBe(GAMEPLAY_CONFIG.COMBAT.PLAYER.HEALTH);
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
            const player = newState.combatants.get('player1') as Player;
            
            // Player should have gained experience and leveled up
            // 20 experience granted, 10 needed for level 1, so 10 remaining
            expect(player?.experience).toBe(GAMEPLAY_CONFIG.EXPERIENCE.TOWER_DESTROYED - GAMEPLAY_CONFIG.EXPERIENCE.LEVEL_UP_MULTIPLIER);
            expect(player?.level).toBe(2); // Should have leveled up
        });

        it('should level up player when experience threshold is reached', () => {
            // Setup game with a player
            const setupResult = GameStateMachine.processAction(initialState, { type: 'SETUP_GAME' });
            const spawnResult = GameStateMachine.processAction(setupResult.newState, {
                type: 'SPAWN_PLAYER',
                payload: { playerId: 'player1', team: 'blue' }
            });
            
            // Give player enough experience to level up
            const player = spawnResult.newState.combatants.get('player1') as Player;
            if (player) {
                player.experience = GAMEPLAY_CONFIG.EXPERIENCE.LEVEL_UP_MULTIPLIER; // Enough to level up
            }
            
            // Update game - should trigger level up
            const result = GameStateMachine.processAction(spawnResult.newState, {
                type: 'UPDATE_GAME',
                payload: { deltaTime: 100 }
            });
            
            const newState = result.newState;
            const updatedPlayer = newState.combatants.get('player1') as Player;
            
            // Player should be level 2 with boosted stats
            expect(updatedPlayer?.level).toBe(2);
            expect(updatedPlayer?.experience).toBe(0); // Experience should be consumed
            expect(updatedPlayer?.maxHealth).toBeGreaterThan(GAMEPLAY_CONFIG.COMBAT.PLAYER.HEALTH);
            expect(updatedPlayer?.attackStrength).toBeGreaterThan(GAMEPLAY_CONFIG.COMBAT.PLAYER.ATTACK_STRENGTH);
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
            const player = currentState.combatants.get('player1') as Player;
            
            expect(blueCradle?.type).toBe(COMBATANT_TYPES.CRADLE);
            expect(redCradle?.type).toBe(COMBATANT_TYPES.CRADLE);
            expect(blueTurret?.type).toBe(COMBATANT_TYPES.TURRET);
            expect(redTurret?.type).toBe(COMBATANT_TYPES.TURRET);
            expect(player?.type).toBe(COMBATANT_TYPES.PLAYER);
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
            const player = newState.combatants.get('player1') as Player;
            
            // Player should have gained experience and leveled up
            // 20 experience granted, 10 needed for level 1, so 10 remaining
            expect(player?.experience).toBe(GAMEPLAY_CONFIG.EXPERIENCE.TOWER_DESTROYED - GAMEPLAY_CONFIG.EXPERIENCE.LEVEL_UP_MULTIPLIER);
            expect(player?.level).toBe(2); // Should have leveled up
        });

        it('should debug level up issue', () => {
            // Setup game with a player
            const setupResult = GameStateMachine.processAction(initialState, { type: 'SETUP_GAME' });
            const spawnResult = GameStateMachine.processAction(setupResult.newState, {
                type: 'SPAWN_PLAYER',
                payload: { playerId: 'player1', team: 'blue' }
            });
            
            // Give player enough experience to level up
            const player = spawnResult.newState.combatants.get('player1') as Player;
            if (player) {
                player.experience = GAMEPLAY_CONFIG.EXPERIENCE.LEVEL_UP_MULTIPLIER + 5; // More than enough to level up
            }
            
            // Update game - should trigger level up
            const result = GameStateMachine.processAction(spawnResult.newState, {
                type: 'UPDATE_GAME',
                payload: { deltaTime: 100 }
            });
            
            const newState = result.newState;
            const updatedPlayer = newState.combatants.get('player1') as Player;
            
            // Player should be level 2 with boosted stats
            expect(updatedPlayer?.level).toBe(2);
            expect(updatedPlayer?.experience).toBe(5); // Should have 5 experience remaining
            expect(updatedPlayer?.maxHealth).toBeGreaterThan(GAMEPLAY_CONFIG.COMBAT.PLAYER.HEALTH);
            expect(updatedPlayer?.attackStrength).toBeGreaterThan(GAMEPLAY_CONFIG.COMBAT.PLAYER.ATTACK_STRENGTH);
        });

        it('should verify deep copy preserves manual changes', () => {
            // Setup game with a player
            const setupResult = GameStateMachine.processAction(initialState, { type: 'SETUP_GAME' });
            const spawnResult = GameStateMachine.processAction(setupResult.newState, {
                type: 'SPAWN_PLAYER',
                payload: { playerId: 'player1', team: 'blue' }
            });
            
            // Modify the state manually
            const player = spawnResult.newState.combatants.get('player1') as Player;
            const redTurret = spawnResult.newState.combatants.get('red-turret');
            
            if (player) player.experience = 50;
            if (redTurret) redTurret.health = 0;
            
            // Process an action to trigger deep copy
            const result = GameStateMachine.processAction(spawnResult.newState, {
                type: 'UPDATE_GAME',
                payload: { deltaTime: 100 }
            });
            
            const newState = result.newState;
            const newPlayer = newState.combatants.get('player1') as Player;
            const newRedTurret = newState.combatants.get('red-turret');
            
            // Verify that our manual changes are preserved, accounting for turret destruction
            // Player starts with 50, gets 20 from turret destruction, levels up (consumes 30), so 40 remaining
            expect(newPlayer?.experience).toBe(40);
            expect(newRedTurret?.health).toBe(-1); // Turret was processed and marked as destroyed
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
            
            // Verify player exists
            expect(spawnResult.newState.combatants.get('player1')).toBeDefined();
            
            // Remove player
            const result = GameStateMachine.processAction(spawnResult.newState, {
                type: 'REMOVE_PLAYER',
                payload: { playerId: 'player1' }
            });
            
            // Verify player is removed
            expect(result.newState.combatants.get('player1')).toBeUndefined();
            
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

    describe('MOVE_PLAYER', () => {
        it('should move a player towards target position', () => {
            // Setup game and spawn player
            const setupResult = GameStateMachine.processAction(initialState, { type: 'SETUP_GAME' });
            const spawnResult = GameStateMachine.processAction(setupResult.newState, {
                type: 'SPAWN_PLAYER',
                payload: { playerId: 'player1', team: 'blue' }
            });
            
            const player = spawnResult.newState.combatants.get('player1') as Player;
            const initialX = player?.x || 0;
            const initialY = player?.y || 0;
            
            // Move player
            const result = GameStateMachine.processAction(spawnResult.newState, {
                type: 'MOVE_PLAYER',
                payload: { playerId: 'player1', targetX: initialX + 100, targetY: initialY + 100 }
            });
            
            const movedPlayer = result.newState.combatants.get('player1') as Player;
            
            // Player should have moved towards target
            expect(movedPlayer?.x).toBeGreaterThan(initialX);
            expect(movedPlayer?.y).toBeGreaterThan(initialY);
        });

        it('should not move respawning players', () => {
            // Setup game and spawn player
            const setupResult = GameStateMachine.processAction(initialState, { type: 'SETUP_GAME' });
            const spawnResult = GameStateMachine.processAction(setupResult.newState, {
                type: 'SPAWN_PLAYER',
                payload: { playerId: 'player1', team: 'blue' }
            });
            
            // Kill player and start respawn
            const player = spawnResult.newState.combatants.get('player1') as Player;
            if (player) {
                player.health = 0;
                player.state = 'respawning';
            }
            
            const initialX = player?.x || 0;
            const initialY = player?.y || 0;
            
            // Try to move respawning player
            const result = GameStateMachine.processAction(spawnResult.newState, {
                type: 'MOVE_PLAYER',
                payload: { playerId: 'player1', targetX: initialX + 100, targetY: initialY + 100 }
            });
            
            const respawningPlayer = result.newState.combatants.get('player1') as Player;
            
            // Player should not have moved
            expect(respawningPlayer?.x).toBe(initialX);
            expect(respawningPlayer?.y).toBe(initialY);
        });

        it('should preserve combatant types when moving players', () => {
            // Setup game and spawn player
            const setupResult = GameStateMachine.processAction(initialState, { type: 'SETUP_GAME' });
            const spawnResult = GameStateMachine.processAction(setupResult.newState, {
                type: 'SPAWN_PLAYER',
                payload: { playerId: 'player1', team: 'blue' }
            });
            
            // Move player
            const result = GameStateMachine.processAction(spawnResult.newState, {
                type: 'MOVE_PLAYER',
                payload: { playerId: 'player1', targetX: 100, targetY: 100 }
            });
            
            // Verify that all combatants still have correct types
            const blueCradle = result.newState.combatants.get('blue-cradle');
            const redCradle = result.newState.combatants.get('red-cradle');
            const blueTurret = result.newState.combatants.get('blue-turret');
            const redTurret = result.newState.combatants.get('red-turret');
            const player = result.newState.combatants.get('player1') as Player;
            
            expect(blueCradle?.type).toBe(COMBATANT_TYPES.CRADLE);
            expect(redCradle?.type).toBe(COMBATANT_TYPES.CRADLE);
            expect(blueTurret?.type).toBe(COMBATANT_TYPES.TURRET);
            expect(redTurret?.type).toBe(COMBATANT_TYPES.TURRET);
            expect(player?.type).toBe(COMBATANT_TYPES.PLAYER);
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
            const player = result.newState.combatants.get('player1') as Player;
            
            expect(blueCradle?.type).toBe(COMBATANT_TYPES.CRADLE);
            expect(redCradle?.type).toBe(COMBATANT_TYPES.CRADLE);
            expect(blueTurret?.type).toBe(COMBATANT_TYPES.TURRET);
            expect(redTurret?.type).toBe(COMBATANT_TYPES.TURRET);
            expect(player?.type).toBe(COMBATANT_TYPES.PLAYER);
        });
    });
}); 