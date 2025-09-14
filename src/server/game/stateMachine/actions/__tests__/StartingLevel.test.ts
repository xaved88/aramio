import { GameStateMachine } from '../../GameStateMachine';
import { GameState } from '../../../../schema/GameState';
import { Hero } from '../../../../schema/Combatants';
import { COMBATANT_TYPES } from '../../../../../shared/types/CombatantTypes';
import { calculateXPForLevel } from '../../../../../shared/utils/XPUtils';
import { MinionManager } from '../../../combatants/MinionManager';
import { TEST_GAMEPLAY_CONFIG } from '../../../../config/TestGameplayConfig';

describe('Starting Level Configuration', () => {
    let initialState: GameState;
    let gameStateMachine: GameStateMachine;

    beforeEach(() => {
        initialState = new GameState();
        initialState.gameTime = 0;
        
        const minionManager = new MinionManager(TEST_GAMEPLAY_CONFIG);
        gameStateMachine = new GameStateMachine(TEST_GAMEPLAY_CONFIG, minionManager);
    });

    describe('calculateXPForLevel', () => {
        it('should return 0 for level 1', () => {
            expect(calculateXPForLevel(1)).toBe(0);
        });

        it('should calculate correct XP for level 2', () => {
            const expectedXP = 1 * TEST_GAMEPLAY_CONFIG.EXPERIENCE.LEVEL_UP_MULTIPLIER; // 15
            expect(calculateXPForLevel(2)).toBe(expectedXP);
        });

        it('should calculate correct XP for level 3', () => {
            const expectedXP = (1 * TEST_GAMEPLAY_CONFIG.EXPERIENCE.LEVEL_UP_MULTIPLIER) + 
                              (2 * TEST_GAMEPLAY_CONFIG.EXPERIENCE.LEVEL_UP_MULTIPLIER); // 15 + 30 = 45
            expect(calculateXPForLevel(3)).toBe(expectedXP);
        });

        it('should calculate correct XP for level 5', () => {
            const expectedXP = (1 * TEST_GAMEPLAY_CONFIG.EXPERIENCE.LEVEL_UP_MULTIPLIER) + 
                              (2 * TEST_GAMEPLAY_CONFIG.EXPERIENCE.LEVEL_UP_MULTIPLIER) +
                              (3 * TEST_GAMEPLAY_CONFIG.EXPERIENCE.LEVEL_UP_MULTIPLIER) +
                              (4 * TEST_GAMEPLAY_CONFIG.EXPERIENCE.LEVEL_UP_MULTIPLIER); // 15 + 30 + 45 + 60 = 150
            expect(calculateXPForLevel(5)).toBe(expectedXP);
        });
    });

    describe('Hero spawning and starting level', () => {
        it('should spawn hero at level 1 when STARTING_LEVEL is 1', () => {
            // Temporarily set starting level to 1 for this test
            const originalStartingLevel = TEST_GAMEPLAY_CONFIG.DEBUG.STARTING_LEVEL;
            (TEST_GAMEPLAY_CONFIG as any).DEBUG.STARTING_LEVEL = 1;

            const result = gameStateMachine.processAction(initialState, {
                type: 'SPAWN_PLAYER',
                payload: { playerId: 'player1', team: 'blue' }
            });

            let hero: Hero | undefined;
            result.newState.combatants.forEach((combatant) => {
                if (combatant.type === COMBATANT_TYPES.HERO && (combatant as Hero).controller === 'player1') {
                    hero = combatant as Hero;
                }
            });

            expect(hero?.level).toBe(1);
            expect(hero?.experience).toBe(0);

            // Restore original starting level
            (TEST_GAMEPLAY_CONFIG as any).DEBUG.STARTING_LEVEL = originalStartingLevel;
        });

        it('should grant XP and level up heroes during spawn when STARTING_LEVEL > 1', () => {
            // Use the configured starting level
            const configuredStartingLevel = TEST_GAMEPLAY_CONFIG.DEBUG.STARTING_LEVEL;

            // Spawn a hero (this should now grant XP and level up the hero)
            const spawnResult = gameStateMachine.processAction(initialState, {
                type: 'SPAWN_PLAYER',
                payload: { playerId: 'player1', team: 'blue' }
            });

            let hero: Hero | undefined;
            spawnResult.newState.combatants.forEach((combatant) => {
                if (combatant.type === COMBATANT_TYPES.HERO && (combatant as Hero).controller === 'player1') {
                    hero = combatant as Hero;
                }
            });

            expect(hero?.level).toBe(configuredStartingLevel);
            expect(hero?.experience).toBe(0); // Should be 0 after leveling up
            expect(hero?.roundStats.totalExperience).toBe(calculateXPForLevel(configuredStartingLevel));
        });

        it('should grant level-up rewards when heroes start at higher level', () => {
            // Use the configured starting level
            const configuredStartingLevel = TEST_GAMEPLAY_CONFIG.DEBUG.STARTING_LEVEL;

            // Spawn a hero (this should now grant XP and level up the hero)
            const spawnResult = gameStateMachine.processAction(initialState, {
                type: 'SPAWN_PLAYER',
                payload: { playerId: 'player1', team: 'blue' }
            });

            let hero: Hero | undefined;
            spawnResult.newState.combatants.forEach((combatant) => {
                if (combatant.type === COMBATANT_TYPES.HERO && (combatant as Hero).controller === 'player1') {
                    hero = combatant as Hero;
                }
            });

            // Hero should have level rewards for each level gained (levels 2, 3, 4, 5)
            const expectedRewards = configuredStartingLevel - 1; // One reward per level gained
            expect(hero?.levelRewards.length).toBe(expectedRewards);
            
            // Check that the rewards are the correct chest types
            // Level 3 should give ability_chest, others should give common
            for (let i = 0; i < expectedRewards; i++) {
                const level = i + 2; // Levels 2, 3, 4, 5
                const expectedChestType = level === 3 ? 'ability_chest' : 'common';
                expect(hero?.levelRewards[i]).toBe(expectedChestType);
            }
        });
    });
});
