import { GameState, Player, Combatant } from '../../../schema/GameState';
import { deepCopyCombatant, deepCopyGameState } from '../utils/stateCopyUtils';
import { COMBATANT_TYPES } from '../../../../shared/types/CombatantTypes';
import { GAMEPLAY_CONFIG } from '../../../../Config';

describe('StateCopyUtils', () => {
    describe('deepCopyCombatant', () => {
        it('should copy a regular combatant correctly', () => {
            const original = new Combatant();
            original.id = 'turret1';
            original.type = COMBATANT_TYPES.TURRET;
            original.x = 100;
            original.y = 200;
            original.team = 'blue';
            original.health = 50;
            original.maxHealth = 100;
            original.attackRadius = 150;
            original.attackStrength = 25;
            original.attackSpeed = 1.5;
            original.lastAttackTime = 1000;

            const copied = deepCopyCombatant(original);

            expect(copied).toBeInstanceOf(Combatant);
            expect(copied).not.toBeInstanceOf(Player);
            expect(copied.id).toBe(original.id);
            expect(copied.type).toBe(original.type);
            expect(copied.x).toBe(original.x);
            expect(copied.y).toBe(original.y);
            expect(copied.team).toBe(original.team);
            expect(copied.health).toBe(original.health);
            expect(copied.maxHealth).toBe(original.maxHealth);
            expect(copied.attackRadius).toBe(original.attackRadius);
            expect(copied.attackStrength).toBe(original.attackStrength);
            expect(copied.attackSpeed).toBe(original.attackSpeed);
            expect(copied.lastAttackTime).toBe(original.lastAttackTime);
        });

        it('should copy a player combatant correctly with all player-specific properties', () => {
            const original = new Player();
            original.id = 'player1';
            original.type = COMBATANT_TYPES.PLAYER;
            original.x = 300;
            original.y = 400;
            original.team = 'red';
            original.health = 80;
            original.maxHealth = 100;
            original.attackRadius = 120;
            original.attackStrength = 30;
            original.attackSpeed = 2.0;
            original.lastAttackTime = 2000;
            original.state = 'respawning';
            original.respawnTime = 5000;
            original.respawnDuration = 3000;
            original.experience = 150;
            original.level = 3;

            const copied = deepCopyCombatant(original);

            expect(copied).toBeInstanceOf(Player);
            expect(copied.id).toBe(original.id);
            expect(copied.type).toBe(original.type);
            expect(copied.x).toBe(original.x);
            expect(copied.y).toBe(original.y);
            expect(copied.team).toBe(original.team);
            expect(copied.health).toBe(original.health);
            expect(copied.maxHealth).toBe(original.maxHealth);
            expect(copied.attackRadius).toBe(original.attackRadius);
            expect(copied.attackStrength).toBe(original.attackStrength);
            expect(copied.attackSpeed).toBe(original.attackSpeed);
            expect(copied.lastAttackTime).toBe(original.lastAttackTime);

            // Player-specific properties
            const copiedPlayer = copied as Player;
            expect(copiedPlayer.state).toBe(original.state);
            expect(copiedPlayer.respawnTime).toBe(original.respawnTime);
            expect(copiedPlayer.respawnDuration).toBe(original.respawnDuration);
            expect(copiedPlayer.experience).toBe(original.experience);
            expect(copiedPlayer.level).toBe(original.level);
        });

        it('should create a new instance, not reference the original', () => {
            const original = new Player();
            original.id = 'player1';
            original.type = COMBATANT_TYPES.PLAYER;
            original.experience = 100;
            original.level = 2;

            const copied = deepCopyCombatant(original);

            // Modify the copied object
            copied.health = 999;
            (copied as Player).experience = 999;
            (copied as Player).level = 999;

            // Original should remain unchanged
            expect(original.health).not.toBe(999);
            expect(original.experience).toBe(100);
            expect(original.level).toBe(2);
        });
    });

    describe('deepCopyGameState', () => {
        it('should copy a game state with multiple combatants correctly', () => {
            const originalState = new GameState();
            originalState.gameTime = 5000;
            originalState.gamePhase = 'playing';

            // Add a player
            const player = new Player();
            player.id = 'player1';
            player.type = COMBATANT_TYPES.PLAYER;
            player.team = 'blue';
            player.health = 80;
            player.experience = 150;
            player.level = 3;
            originalState.combatants.set('player1', player);

            // Add a turret
            const turret = new Combatant();
            turret.id = 'turret1';
            turret.type = COMBATANT_TYPES.TURRET;
            turret.team = 'red';
            turret.health = 50;
            originalState.combatants.set('turret1', turret);

            const copiedState = deepCopyGameState(originalState);

            expect(copiedState.gameTime).toBe(originalState.gameTime);
            expect(copiedState.gamePhase).toBe(originalState.gamePhase);
            expect(copiedState.combatants.size).toBe(originalState.combatants.size);

            // Check player was copied correctly
            const copiedPlayer = copiedState.combatants.get('player1') as Player;
            expect(copiedPlayer).toBeInstanceOf(Player);
            expect(copiedPlayer.id).toBe('player1');
            expect(copiedPlayer.experience).toBe(150);
            expect(copiedPlayer.level).toBe(3);

            // Check turret was copied correctly
            const copiedTurret = copiedState.combatants.get('turret1');
            expect(copiedTurret).toBeDefined();
            expect(copiedTurret).toBeInstanceOf(Combatant);
            expect(copiedTurret).not.toBeInstanceOf(Player);
            expect(copiedTurret!.id).toBe('turret1');
            expect(copiedTurret!.health).toBe(50);
        });

        it('should preserve player properties during state transitions', () => {
            // This test simulates what happens during a state machine transition
            const initialState = new GameState();
            
            // Create a player with some experience
            const player = new Player();
            player.id = 'player1';
            player.type = COMBATANT_TYPES.PLAYER;
            player.team = 'blue';
            player.health = 100;
            player.maxHealth = 100;
            player.experience = 50;
            player.level = 1;
            player.state = 'alive';
            initialState.combatants.set('player1', player);

            // Simulate a state transition (like UPDATE_GAME action)
            const copiedState = deepCopyGameState(initialState);
            
            // Modify the player in the copied state (simulating game logic)
            const copiedPlayer = copiedState.combatants.get('player1') as Player;
            copiedPlayer.experience = 100; // Player gained experience
            copiedPlayer.level = 2; // Player leveled up
            copiedPlayer.health = 80; // Player took damage

            // Verify the copied state has the updated values
            expect(copiedPlayer.experience).toBe(100);
            expect(copiedPlayer.level).toBe(2);
            expect(copiedPlayer.health).toBe(80);

            // Verify the original state is unchanged
            const originalPlayer = initialState.combatants.get('player1') as Player;
            expect(originalPlayer.experience).toBe(50);
            expect(originalPlayer.level).toBe(1);
            expect(originalPlayer.health).toBe(100);
        });

        it('should handle empty game state', () => {
            const originalState = new GameState();
            originalState.gameTime = 0;
            originalState.gamePhase = 'waiting';

            const copiedState = deepCopyGameState(originalState);

            expect(copiedState.gameTime).toBe(originalState.gameTime);
            expect(copiedState.gamePhase).toBe(originalState.gamePhase);
            expect(copiedState.combatants.size).toBe(0);
            expect(copiedState.attackEvents.length).toBe(0);
        });
    });
}); 