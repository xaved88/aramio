import { GameState, Hero } from '../../../schema/GameState';
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
            
            // Find the hero and turret
            let hero: Hero | undefined;
            let redTurret: any;
            spawnResult.newState.combatants.forEach((combatant) => {
                if (combatant.type === COMBATANT_TYPES.HERO && (combatant as Hero).controller === 'player1') {
                    hero = combatant as Hero;
                }
                if (combatant.id === 'red-turret') {
                    redTurret = combatant;
                }
            });
            
            // Position hero next to turret (within attack radius)
            if (hero && redTurret) {
                hero.x = redTurret.x + 30; // Within attack radius (80)
                hero.y = redTurret.y;
                
                            // Set turret to 1 HP so it can be destroyed in one hit
            redTurret.health = 1;
        }
        
        // Set hero to be ready to attack immediately
        if (hero) {
            hero.lastAttackTime = -2000; // Old enough to allow attack (cooldown is 1000ms)
            hero.attackReadyAt = 100; // Ready to attack immediately (past time relative to first update at 300)
            hero.target = redTurret.id; // Set target
        }
            
            // Update game multiple times to allow wind-up period to complete
            let result = GameStateMachine.processAction(spawnResult.newState, {
                type: 'UPDATE_GAME',
                payload: { deltaTime: 300 }
            });
            // Run another update to allow attack to complete
            result = GameStateMachine.processAction(result.newState, {
                type: 'UPDATE_GAME',
                payload: { deltaTime: 300 }
            });
            
            // Find the updated hero by controller
            let updatedHero: Hero | undefined;
            result.newState.combatants.forEach((combatant) => {
                if (combatant.type === COMBATANT_TYPES.HERO && (combatant as Hero).controller === 'player1') {
                    updatedHero = combatant as Hero;
                }
            });
            
            // Hero should have gained experience and leveled up
            expect(updatedHero?.roundStats.totalExperience).toBe(GAMEPLAY_CONFIG.EXPERIENCE.TOWER_DESTROYED);
            expect(updatedHero?.level).toBe(3);
            
            // Hero stats should be boosted
            expect(updatedHero?.maxHealth).toBeGreaterThan(GAMEPLAY_CONFIG.COMBAT.PLAYER.HEALTH);
            expect(updatedHero?.attackStrength).toBeGreaterThan(GAMEPLAY_CONFIG.COMBAT.PLAYER.ATTACK_STRENGTH);
        });

        it('should not destroy turret when player is out of range', () => {
            // Setup game with a player
            const setupResult = GameStateMachine.processAction(initialState, { type: 'SETUP_GAME' });
            const spawnResult = GameStateMachine.processAction(setupResult.newState, {
                type: 'SPAWN_PLAYER',
                payload: { playerId: 'player1', team: 'blue' }
            });
            
            // Find the hero and turret
            let hero: Hero | undefined;
            let redTurret: any;
            spawnResult.newState.combatants.forEach((combatant) => {
                if (combatant.type === COMBATANT_TYPES.HERO && (combatant as Hero).controller === 'player1') {
                    hero = combatant as Hero;
                }
                if (combatant.id === 'red-turret') {
                    redTurret = combatant;
                }
            });
            
                        // Position hero far from turret (outside attack radius)
            if (hero && redTurret) {
                hero.x = redTurret.x + 100; // Outside attack radius (80)
                hero.y = redTurret.y;
            }
            
            // Set hero to be ready to attack immediately
            if (hero) {
                hero.lastAttackTime = -2000; // Old enough to allow attack (cooldown is 1000ms)
                hero.attackReadyAt = 100; // Ready to attack immediately (past time relative to first update at 300)
                hero.target = redTurret.id; // Set target
            }
            
            // Update game multiple times to allow wind-up period to complete
            let result = GameStateMachine.processAction(spawnResult.newState, {
                type: 'UPDATE_GAME',
                payload: { deltaTime: 300 }
            });
            // Run another update to allow attack to complete
            result = GameStateMachine.processAction(result.newState, {
                type: 'UPDATE_GAME',
                payload: { deltaTime: 300 }
            });
            
            // Find the updated hero by controller
            let updatedHero: Hero | undefined;
            result.newState.combatants.forEach((combatant) => {
                if (combatant.type === COMBATANT_TYPES.HERO && (combatant as Hero).controller === 'player1') {
                    updatedHero = combatant as Hero;
                }
            });
            
            // Hero should not have gained experience
            expect(updatedHero?.roundStats.totalExperience).toBe(0);
            expect(updatedHero?.level).toBe(1);
        });

        it('should grant experience to all players on the same team', () => {
            // Setup game with two players on blue team
            const setupResult = GameStateMachine.processAction(initialState, { type: 'SETUP_GAME' });
            const spawnResult1 = GameStateMachine.processAction(setupResult.newState, {
                type: 'SPAWN_PLAYER',
                payload: { playerId: 'player1', team: 'blue' }
            });
            const spawnResult2 = GameStateMachine.processAction(spawnResult1.newState, {
                type: 'SPAWN_PLAYER',
                payload: { playerId: 'player2', team: 'blue' }
            });
            
            // Find the heroes and turret
            let hero1: Hero | undefined;
            let hero2: Hero | undefined;
            let redTurret: any;
            spawnResult2.newState.combatants.forEach((combatant) => {
                if (combatant.type === COMBATANT_TYPES.HERO) {
                    const hero = combatant as Hero;
                    if (hero.controller === 'player1') hero1 = hero;
                    if (hero.controller === 'player2') hero2 = hero;
                }
                if (combatant.id === 'red-turret') {
                    redTurret = combatant;
                }
            });
            
            // Position both heroes next to turret
            if (hero1 && hero2 && redTurret) {
                hero1.x = redTurret.x + 30;
                hero1.y = redTurret.y;
                hero2.x = redTurret.x + 30;
                hero2.y = redTurret.y;
                
                // Ensure both heroes start with 0 experience
                            hero1.experience = 0;
            hero1.roundStats.totalExperience = 0;
            hero2.experience = 0;
            hero2.roundStats.totalExperience = 0;
                
                // Set turret to 1 HP so it can be destroyed in one hit
                redTurret.health = 1;
                
                // Set heroes to be ready to attack immediately
                hero1.lastAttackTime = -2000; // Old enough to allow attack (cooldown is 1000ms)
                hero1.attackReadyAt = 100; // Ready to attack immediately (past time relative to first update at 300)
                hero1.target = redTurret.id; // Set target
                hero2.lastAttackTime = -2000; // Old enough to allow attack (cooldown is 1000ms)
                hero2.attackReadyAt = 100; // Ready to attack immediately (past time relative to first update at 300)
                hero2.target = redTurret.id; // Set target
            }
            
            // Update game multiple times to allow wind-up period to complete
            let result = GameStateMachine.processAction(spawnResult2.newState, {
                type: 'UPDATE_GAME',
                payload: { deltaTime: 300 }
            });
            // Run another update to allow attack to complete
            result = GameStateMachine.processAction(result.newState, {
                type: 'UPDATE_GAME',
                payload: { deltaTime: 300 }
            });
            
            // Find the updated heroes by controller
            let updatedHero1: Hero | undefined;
            let updatedHero2: Hero | undefined;
            result.newState.combatants.forEach((combatant) => {
                if (combatant.type === COMBATANT_TYPES.HERO) {
                    const hero = combatant as Hero;
                    if (hero.controller === 'player1') updatedHero1 = hero;
                    if (hero.controller === 'player2') updatedHero2 = hero;
                }
            });
            
            // Both blue team heroes should have gained experience and leveled up
            // They get 20 experience each, level up (consuming 10), so 10 remaining each
            expect(updatedHero1?.roundStats.totalExperience).toBe(GAMEPLAY_CONFIG.EXPERIENCE.TOWER_DESTROYED);
            expect(updatedHero2?.roundStats.totalExperience).toBe(GAMEPLAY_CONFIG.EXPERIENCE.TOWER_DESTROYED);
            
            // Check that both heroes leveled up
            expect(updatedHero1?.level).toBe(3);
            expect(updatedHero2?.level).toBe(3);
        });

        it('should not grant experience to players on opposing team', () => {
            // Setup game with a player on blue team
            const setupResult = GameStateMachine.processAction(initialState, { type: 'SETUP_GAME' });
            const spawnResult = GameStateMachine.processAction(setupResult.newState, {
                type: 'SPAWN_PLAYER',
                payload: { playerId: 'player1', team: 'blue' }
            });
            
            // Find the hero and turret
            let hero: Hero | undefined;
            let redTurret: any;
            spawnResult.newState.combatants.forEach((combatant) => {
                if (combatant.type === COMBATANT_TYPES.HERO && (combatant as Hero).controller === 'player1') {
                    hero = combatant as Hero;
                }
                if (combatant.id === 'red-turret') {
                    redTurret = combatant;
                }
            });
            
            // Position hero next to turret
            if (hero && redTurret) {
                hero.x = redTurret.x + 30;
                hero.y = redTurret.y;
                
                // Set turret to 1 HP so it can be destroyed in one hit
                redTurret.health = 1;
                
                // Set hero's lastAttackTime to allow immediate attack
                hero.lastAttackTime = -1000;
            }
            
            // Update game multiple times to allow wind-up period to complete
            let result = GameStateMachine.processAction(spawnResult.newState, {
                type: 'UPDATE_GAME',
                payload: { deltaTime: 300 }
            });
            // Run another update to allow attack to complete
            result = GameStateMachine.processAction(result.newState, {
                type: 'UPDATE_GAME',
                payload: { deltaTime: 300 }
            });
            
            // Find the updated hero by controller
            let updatedHero: Hero | undefined;
            result.newState.combatants.forEach((combatant) => {
                if (combatant.type === COMBATANT_TYPES.HERO && (combatant as Hero).controller === 'player1') {
                    updatedHero = combatant as Hero;
                }
            });
            
            // Hero should be level 3 with remaining experience
            expect(updatedHero?.level).toBe(3);
            expect(updatedHero?.roundStats.totalExperience).toBe(GAMEPLAY_CONFIG.EXPERIENCE.TOWER_DESTROYED);
        });

        it('should handle multiple level ups correctly', () => {
            // Setup game with a player
            const setupResult = GameStateMachine.processAction(initialState, { type: 'SETUP_GAME' });
            const spawnResult = GameStateMachine.processAction(setupResult.newState, {
                type: 'SPAWN_PLAYER',
                payload: { playerId: 'player1', team: 'blue' }
            });

            // Get the player and turret
            // Find the player by controller
            let player: Hero | undefined;
            spawnResult.newState.combatants.forEach((combatant) => {
                if (combatant.type === COMBATANT_TYPES.HERO && (combatant as Hero).controller === 'player1') {
                    player = combatant as Hero;
                }
            });
            const redTurret = spawnResult.newState.combatants.get('red-turret');

            // Give player enough experience to be close to leveling up
            if (player && redTurret) {
                player.experience = 13; // Just 2 short of level 2
            player.roundStats.totalExperience = 13;
                player.x = redTurret.x + 30;
                player.y = redTurret.y;
                redTurret.health = 1;
                
                // Set player's lastAttackTime to allow immediate attack
                player.lastAttackTime = -1000; // Old enough to allow attack
            }

            // Update game multiple times to allow wind-up period to complete
            let result = GameStateMachine.processAction(spawnResult.newState, {
                type: 'UPDATE_GAME',
                payload: { deltaTime: 300 }
            });
            // Run another update to allow attack to complete
            result = GameStateMachine.processAction(result.newState, {
                type: 'UPDATE_GAME',
                payload: { deltaTime: 300 }
            });

            const newState = result.newState;
            // Find the updated player by controller
            let updatedPlayer: Hero | undefined;
            newState.combatants.forEach((combatant) => {
                if (combatant.type === COMBATANT_TYPES.HERO && (combatant as Hero).controller === 'player1') {
                    updatedPlayer = combatant as Hero;
                }
            });

            // Player should be level 3 with remaining experience
            // 13 + 50 = 63 experience, 15 needed for level 2, 30 needed for level 3, so 18 remaining
            expect(updatedPlayer?.level).toBe(3);
            expect(updatedPlayer?.roundStats.totalExperience).toBe(63);
        });

        it('should only grant minion XP to heroes within range', () => {
            // Setup game with two players on blue team
            const setupResult = GameStateMachine.processAction(initialState, { type: 'SETUP_GAME' });
            const spawnResult1 = GameStateMachine.processAction(setupResult.newState, {
                type: 'SPAWN_PLAYER',
                payload: { playerId: 'player1', team: 'blue' }
            });
            const spawnResult2 = GameStateMachine.processAction(spawnResult1.newState, {
                type: 'SPAWN_PLAYER',
                payload: { playerId: 'player2', team: 'blue' }
            });
            
            // Find both heroes
            let hero1: Hero | undefined;
            let hero2: Hero | undefined;
            spawnResult2.newState.combatants.forEach((combatant) => {
                if (combatant.type === COMBATANT_TYPES.HERO && (combatant as Hero).controller === 'player1') {
                    hero1 = combatant as Hero;
                }
                if (combatant.type === COMBATANT_TYPES.HERO && (combatant as Hero).controller === 'player2') {
                    hero2 = combatant as Hero;
                }
            });
            
            // Position hero1 close to where minions will be (within 175 radius)
            // Position hero2 far from where minions will be (outside 175 radius)
            if (hero1 && hero2) {
                // Place hero1 near the center of the map where minions might be
                hero1.x = 300;
                hero1.y = 300;
                
                // Place hero2 far away (more than 175 pixels)
                hero2.x = 100;
                hero2.y = 100;
            }
            
            // Record initial experience
            const initialExp1 = hero1?.experience || 0;
            const initialExp2 = hero2?.experience || 0;
            
            // Find a minion and position it near hero1
            const minions = Array.from(spawnResult2.newState.combatants.values())
                .filter(combatant => combatant.type === COMBATANT_TYPES.MINION);
            
            if (minions.length > 0 && hero1) {
                const minion = minions[0];
                // Position minion within 175 radius of hero1
                minion.x = hero1.x + 100; // 100 pixels away (within 175)
                minion.y = hero1.y;
                minion.health = 0; // Kill the minion
                
                // Update game to process minion death
                const result = GameStateMachine.processAction(spawnResult2.newState, {
                    type: 'UPDATE_GAME',
                    payload: { deltaTime: 100 }
                });
                
                // Find updated heroes
                let updatedHero1: Hero | undefined;
                let updatedHero2: Hero | undefined;
                result.newState.combatants.forEach((combatant) => {
                    if (combatant.type === COMBATANT_TYPES.HERO && (combatant as Hero).controller === 'player1') {
                        updatedHero1 = combatant as Hero;
                    }
                    if (combatant.type === COMBATANT_TYPES.HERO && (combatant as Hero).controller === 'player2') {
                        updatedHero2 = combatant as Hero;
                    }
                });
                
                // Only hero1 should get XP (within range), hero2 should not (out of range)
                            expect(updatedHero1?.roundStats.totalExperience).toBe(initialExp1 + GAMEPLAY_CONFIG.EXPERIENCE.MINION_KILLED);
            expect(updatedHero2?.roundStats.totalExperience).toBe(initialExp2); // Should not get XP
            }
        });

        it('should grant hero kill XP to heroes within range', () => {
            // Setup game with two players on blue team and one on red team
            const setupResult = GameStateMachine.processAction(initialState, { type: 'SETUP_GAME' });
            const spawnResult1 = GameStateMachine.processAction(setupResult.newState, {
                type: 'SPAWN_PLAYER',
                payload: { playerId: 'player1', team: 'blue' }
            });
            const spawnResult2 = GameStateMachine.processAction(spawnResult1.newState, {
                type: 'SPAWN_PLAYER',
                payload: { playerId: 'player2', team: 'blue' }
            });
            const spawnResult3 = GameStateMachine.processAction(spawnResult2.newState, {
                type: 'SPAWN_PLAYER',
                payload: { playerId: 'player3', team: 'red' }
            });
            
            // Find all heroes
            let blueHero1: Hero | undefined;
            let blueHero2: Hero | undefined;
            let redHero: Hero | undefined;
            spawnResult3.newState.combatants.forEach((combatant) => {
                if (combatant.type === COMBATANT_TYPES.HERO) {
                    const hero = combatant as Hero;
                    if (hero.controller === 'player1') blueHero1 = hero;
                    if (hero.controller === 'player2') blueHero2 = hero;
                    if (hero.controller === 'player3') redHero = hero;
                }
            });
            
            // Position blueHero1 close to redHero (within 175 radius)
            // Position blueHero2 far from redHero (outside 175 radius)
            if (blueHero1 && blueHero2 && redHero) {
                // Place redHero at center
                redHero.x = 300;
                redHero.y = 300;
                
                // Place blueHero1 within range
                blueHero1.x = 400; // 100 pixels away (within 175)
                blueHero1.y = 300;
                
                // Place blueHero2 far away (more than 175 pixels)
                blueHero2.x = 100;
                blueHero2.y = 100;
                
                                 // Give redHero some levels to make XP calculation interesting
                 redHero.level = 3;
                 redHero.experience = 0;
            redHero.roundStats.totalExperience = 0;
                 
                 // Give blueHero1 level 2 so they don't level up from the XP
                 blueHero1.level = 2;
                 blueHero1.experience = 0;
            blueHero1.roundStats.totalExperience = 0;
            }
            
            // Record initial experience
            const initialExp1 = blueHero1?.experience || 0;
            const initialExp2 = blueHero2?.experience || 0;
            
                         // Kill the red hero
             if (redHero) {
                 redHero.health = 0; // Kill the hero
             }
             
             // Update game to process hero death
             const result = GameStateMachine.processAction(spawnResult3.newState, {
                 type: 'UPDATE_GAME',
                 payload: { deltaTime: 100 }
             });
            
            // Find updated heroes
            let updatedBlueHero1: Hero | undefined;
            let updatedBlueHero2: Hero | undefined;
            result.newState.combatants.forEach((combatant) => {
                if (combatant.type === COMBATANT_TYPES.HERO) {
                    const hero = combatant as Hero;
                    if (hero.controller === 'player1') updatedBlueHero1 = hero;
                    if (hero.controller === 'player2') updatedBlueHero2 = hero;
                }
            });
            
            // Calculate expected XP: level 3 * 4 = 12 XP
            const expectedXP = 3 * GAMEPLAY_CONFIG.EXPERIENCE.HERO_KILL_MULTIPLIER;
            
            // Only blueHero1 should get XP (within range), blueHero2 should not (out of range)
            expect(updatedBlueHero1?.roundStats.totalExperience).toBe(initialExp1 + expectedXP);
            expect(updatedBlueHero2?.roundStats.totalExperience).toBe(initialExp2); // Should not get XP
        });

        it('should grant turret XP to dead players but not minion XP', () => {
            // Setup game with two players on blue team
            const setupResult = GameStateMachine.processAction(initialState, { type: 'SETUP_GAME' });
            const spawnResult1 = GameStateMachine.processAction(setupResult.newState, {
                type: 'SPAWN_PLAYER',
                payload: { playerId: 'player1', team: 'blue' }
            });
            const spawnResult2 = GameStateMachine.processAction(spawnResult1.newState, {
                type: 'SPAWN_PLAYER',
                payload: { playerId: 'player2', team: 'blue' }
            });
            
            // Find both heroes
            let hero1: Hero | undefined;
            let hero2: Hero | undefined;
            spawnResult2.newState.combatants.forEach((combatant) => {
                if (combatant.type === COMBATANT_TYPES.HERO && (combatant as Hero).controller === 'player1') {
                    hero1 = combatant as Hero;
                }
                if (combatant.type === COMBATANT_TYPES.HERO && (combatant as Hero).controller === 'player2') {
                    hero2 = combatant as Hero;
                }
            });
            
            // Kill hero2 (make them respawning)
            if (hero2) {
                hero2.health = 0;
                hero2.state = 'respawning';
                hero2.respawnTime = spawnResult2.newState.gameTime + hero2.respawnDuration;
            }
            
            // Record initial experience
            const initialExp1 = hero1?.experience || 0;
            const initialExp2 = hero2?.experience || 0;
            
            // Destroy a turret - both players should get XP
            const redTurret = spawnResult2.newState.combatants.get('red-turret');
            if (redTurret) {
                redTurret.health = 0; // Destroy the turret
            }
            
            // Update game to process turret destruction
            const result1 = GameStateMachine.processAction(spawnResult2.newState, {
                type: 'UPDATE_GAME',
                payload: { deltaTime: 100 }
            });
            
            // Find updated heroes
            let updatedHero1: Hero | undefined;
            let updatedHero2: Hero | undefined;
            result1.newState.combatants.forEach((combatant) => {
                if (combatant.type === COMBATANT_TYPES.HERO && (combatant as Hero).controller === 'player1') {
                    updatedHero1 = combatant as Hero;
                }
                if (combatant.type === COMBATANT_TYPES.HERO && (combatant as Hero).controller === 'player2') {
                    updatedHero2 = combatant as Hero;
                }
            });
            
            // Both players should have gained turret XP (even the dead one)
            // Account for leveling: 20 XP granted, 10 needed for level 1, so 10 remaining
            expect(updatedHero1?.roundStats.totalExperience).toBe(initialExp1 + GAMEPLAY_CONFIG.EXPERIENCE.TOWER_DESTROYED);
            expect(updatedHero2?.roundStats.totalExperience).toBe(initialExp2 + GAMEPLAY_CONFIG.EXPERIENCE.TOWER_DESTROYED);
            
            // Now kill a minion - only alive player should get XP
            const minions = Array.from(result1.newState.combatants.values())
                .filter(combatant => combatant.type === COMBATANT_TYPES.MINION);
            
            if (minions.length > 0) {
                const minion = minions[0];
                minion.health = 0; // Kill the minion
                
                // Record experience before minion kill
                const expBeforeMinion1 = updatedHero1?.experience || 0;
                const expBeforeMinion2 = updatedHero2?.experience || 0;
                
                // Update game to process minion death
                const result2 = GameStateMachine.processAction(result1.newState, {
                    type: 'UPDATE_GAME',
                    payload: { deltaTime: 100 }
                });
                
                // Find heroes after minion kill
                let finalHero1: Hero | undefined;
                let finalHero2: Hero | undefined;
                result2.newState.combatants.forEach((combatant) => {
                    if (combatant.type === COMBATANT_TYPES.HERO && (combatant as Hero).controller === 'player1') {
                        finalHero1 = combatant as Hero;
                    }
                    if (combatant.type === COMBATANT_TYPES.HERO && (combatant as Hero).controller === 'player2') {
                        finalHero2 = combatant as Hero;
                    }
                });
                
                // Only alive player should get minion XP
                            expect(finalHero1?.roundStats.totalExperience).toBe(expBeforeMinion1 + GAMEPLAY_CONFIG.EXPERIENCE.MINION_KILLED);
            expect(finalHero2?.roundStats.totalExperience).toBe(expBeforeMinion2); // Dead player should not get minion XP
            }
        });
    });
}); 
