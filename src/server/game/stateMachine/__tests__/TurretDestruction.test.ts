import { GameState, Player } from '../../../schema/GameState';
import { GameStateMachine } from '../GameStateMachine';
import { COMBATANT_TYPES } from '../../../../shared/types/CombatantTypes';
import { GAMEPLAY_CONFIG } from '../../../../Config';

describe('TurretDestruction', () => {
    let initialState: GameState;

    beforeEach(() => {
        initialState = new GameState();
        initialState.gameTime = 0;
        initialState.gamePhase = 'playing';
    });

    describe('Player destroys turret', () => {
        it('should destroy turret and grant experience when player is in range', () => {
            // Setup game with a player
            const setupResult = GameStateMachine.processAction(initialState, { type: 'SETUP_GAME' });
            const spawnResult = GameStateMachine.processAction(setupResult.newState, {
                type: 'SPAWN_PLAYER',
                payload: { playerId: 'player1', team: 'blue' }
            });

            // Get the player and turret
            const player = spawnResult.newState.combatants.get('player1') as Player;
            const redTurret = spawnResult.newState.combatants.get('red-turret');

            // Position player next to turret (within attack radius)
            if (player && redTurret) {
                player.x = redTurret.x + 30; // Within attack radius (50)
                player.y = redTurret.y;
                
                // Set turret to 1 HP so it can be destroyed in one hit
                redTurret.health = 1;
                
                // Set player's lastAttackTime to allow immediate attack
                player.lastAttackTime = -1000; // Old enough to allow attack
            }

            // Update game - should trigger combat and destroy turret
            const result = GameStateMachine.processAction(spawnResult.newState, {
                type: 'UPDATE_GAME',
                payload: { deltaTime: 100 }
            });

            const newState = result.newState;
            const updatedPlayer = newState.combatants.get('player1') as Player;
            const updatedTurret = newState.combatants.get('red-turret');

            // Turret should be destroyed and removed from combatants
            expect(updatedTurret).toBeUndefined();

            // Player should have gained experience and leveled up
            // 20 experience granted, 10 needed for level 1, so 10 remaining
            expect(updatedPlayer?.experience).toBe(GAMEPLAY_CONFIG.EXPERIENCE.TOWER_DESTROYED - GAMEPLAY_CONFIG.EXPERIENCE.LEVEL_UP_MULTIPLIER);
            expect(updatedPlayer?.level).toBe(2);

            // Player stats should be boosted
            expect(updatedPlayer?.maxHealth).toBeGreaterThan(GAMEPLAY_CONFIG.COMBAT.PLAYER.HEALTH);
            expect(updatedPlayer?.attackStrength).toBeGreaterThan(GAMEPLAY_CONFIG.COMBAT.PLAYER.ATTACK_STRENGTH);
        });

        it('should not destroy turret when player is out of range', () => {
            // Setup game with a player
            const setupResult = GameStateMachine.processAction(initialState, { type: 'SETUP_GAME' });
            const spawnResult = GameStateMachine.processAction(setupResult.newState, {
                type: 'SPAWN_PLAYER',
                payload: { playerId: 'player1', team: 'blue' }
            });

            // Get the player and turret
            const player = spawnResult.newState.combatants.get('player1') as Player;
            const redTurret = spawnResult.newState.combatants.get('red-turret');

            // Position player far from turret (outside attack radius)
            if (player && redTurret) {
                player.x = redTurret.x + 100; // Outside attack radius (50)
                player.y = redTurret.y;
                
                // Set turret to 1 HP
                redTurret.health = 1;
                
                // Set player's lastAttackTime to allow immediate attack
                player.lastAttackTime = -1000; // Old enough to allow attack
            }

            // Update game - should not trigger combat
            const result = GameStateMachine.processAction(spawnResult.newState, {
                type: 'UPDATE_GAME',
                payload: { deltaTime: 100 }
            });

            const newState = result.newState;
            const updatedPlayer = newState.combatants.get('player1') as Player;
            const updatedTurret = newState.combatants.get('red-turret');

            // Turret should still be alive
            expect(updatedTurret?.health).toBe(1);

            // Player should not have gained experience
            expect(updatedPlayer?.experience).toBe(0);
            expect(updatedPlayer?.level).toBe(1);
        });

        it('should grant experience to all players on the opposing team', () => {
            // Setup game with multiple players
            const setupResult = GameStateMachine.processAction(initialState, { type: 'SETUP_GAME' });
            const spawnResult1 = GameStateMachine.processAction(setupResult.newState, {
                type: 'SPAWN_PLAYER',
                payload: { playerId: 'player1', team: 'blue' }
            });
            const spawnResult2 = GameStateMachine.processAction(spawnResult1.newState, {
                type: 'SPAWN_PLAYER',
                payload: { playerId: 'player2', team: 'blue' }
            });

            // Get the players and turret
            const player1 = spawnResult2.newState.combatants.get('player1') as Player;
            const player2 = spawnResult2.newState.combatants.get('player2') as Player;
            const redTurret = spawnResult2.newState.combatants.get('red-turret');

            // Position player1 next to turret
            if (player1 && redTurret) {
                player1.x = redTurret.x + 30;
                player1.y = redTurret.y;
                redTurret.health = 1;
                
                // Set player's lastAttackTime to allow immediate attack
                player1.lastAttackTime = -1000; // Old enough to allow attack
            }

            // Update game
            const result = GameStateMachine.processAction(spawnResult2.newState, {
                type: 'UPDATE_GAME',
                payload: { deltaTime: 100 }
            });

            const newState = result.newState;
            const updatedPlayer1 = newState.combatants.get('player1') as Player;
            const updatedPlayer2 = newState.combatants.get('player2') as Player;

            // Both blue team players should have gained experience
            expect(updatedPlayer1?.experience).toBe(GAMEPLAY_CONFIG.EXPERIENCE.TOWER_DESTROYED - GAMEPLAY_CONFIG.EXPERIENCE.LEVEL_UP_MULTIPLIER);
            expect(updatedPlayer2?.experience).toBe(GAMEPLAY_CONFIG.EXPERIENCE.TOWER_DESTROYED - GAMEPLAY_CONFIG.EXPERIENCE.LEVEL_UP_MULTIPLIER);
            expect(updatedPlayer1?.level).toBe(2);
            expect(updatedPlayer2?.level).toBe(2);
        });

        it('should handle multiple level ups correctly', () => {
            // Setup game with a player
            const setupResult = GameStateMachine.processAction(initialState, { type: 'SETUP_GAME' });
            const spawnResult = GameStateMachine.processAction(setupResult.newState, {
                type: 'SPAWN_PLAYER',
                payload: { playerId: 'player1', team: 'blue' }
            });

            // Get the player and turret
            const player = spawnResult.newState.combatants.get('player1') as Player;
            const redTurret = spawnResult.newState.combatants.get('red-turret');

            // Give player enough experience to be close to leveling up
            if (player && redTurret) {
                player.experience = 8; // Just 2 short of level 2
                player.x = redTurret.x + 30;
                player.y = redTurret.y;
                redTurret.health = 1;
                
                // Set player's lastAttackTime to allow immediate attack
                player.lastAttackTime = -1000; // Old enough to allow attack
            }

            // Update game
            const result = GameStateMachine.processAction(spawnResult.newState, {
                type: 'UPDATE_GAME',
                payload: { deltaTime: 100 }
            });

            const newState = result.newState;
            const updatedPlayer = newState.combatants.get('player1') as Player;

            // Player should be level 2 with remaining experience
            // 8 + 20 = 28 experience, 10 for level 2, so 18 remaining
            expect(updatedPlayer?.level).toBe(2);
            expect(updatedPlayer?.experience).toBe(18);
        });
    });
}); 