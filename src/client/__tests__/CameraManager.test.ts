import { CameraManager } from '../CameraManager';
import { CLIENT_CONFIG } from '../../ClientConfig';
import { SharedGameState } from '../../shared/types/GameStateTypes';
import { ControllerId } from '../../shared/types/CombatantTypes';

// Mock Phaser.Scene
const mockScene = {
    cameras: {
        main: {
            setZoom: jest.fn(),
            setBounds: jest.fn(),
            setViewport: jest.fn(),
            centerOn: jest.fn(),
            scrollX: 0,
            scrollY: 0,
            ignore: jest.fn(),
            startFollow: jest.fn(),
            stopFollow: jest.fn(),
            setFollowOffset: jest.fn(),
            followTarget: null,
            getWorldPoint: jest.fn().mockReturnValue({ x: 0, y: 0 }),
        },
        add: jest.fn().mockReturnValue({
            setZoom: jest.fn(),
            setBounds: jest.fn(),
            setViewport: jest.fn(),
            setScroll: jest.fn(),
            ignore: jest.fn(),
        }),
    },
    input: {
        activePointer: {
            x: 350, // Default to center
            y: 350,
        },
    },
} as any;

// Mock EntityManager
const mockEntityManager = {
    getEntityGraphics: jest.fn().mockReturnValue({
        x: 0,
        y: 0,
        // Add properties that Phaser Graphics objects have
        setPosition: jest.fn(),
        setVisible: jest.fn(),
        destroy: jest.fn(),
    }),
};

describe('CameraManager', () => {
    let cameraManager: CameraManager;
    let mockState: SharedGameState;

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();
        
        cameraManager = new CameraManager(mockScene);
        cameraManager.setEntityManager(mockEntityManager);
        
        mockState = {
            gameTime: Date.now(),
            gamePhase: 'playing',
            currentWave: 1,
            winningTeam: '',
            gameEndTime: 0,
            combatants: new Map(),
            attackEvents: [],
            xpEvents: [],
            levelUpEvents: [],
            damageEvents: [],
            killEvents: [],
            projectiles: new Map(),
            aoeDamageEvents: [],
        };
    });

    describe('camera following functionality', () => {
        beforeEach(() => {
            cameraManager.setPlayerSessionId('test-session' as ControllerId);
        });

        it('should start following a hero when one is found', () => {
            // Ensure mock returns graphics object
            mockEntityManager.getEntityGraphics.mockReturnValue({ x: 0, y: 0 });
            
            // Add a player hero to the state
            mockState.combatants.set('hero1', {
                id: 'hero1',
                type: 'hero',
                controller: 'test-session' as ControllerId,
                x: 350,
                y: 350,
                health: 100,
                maxHealth: 100,
                team: 'blue',
                state: 'alive',
                respawnTime: 0,
                respawnDuration: 6000,
                displayName: 'Hero 1',
                level: 1,
                experience: 0,
                experienceNeeded: 15,
                roundStats: {
                    totalExperience: 0,
                    minionKills: 0,
                    heroKills: 0,
                    turretKills: 0,
                    damageTaken: 0,
                    damageDealt: 0,
                },
                attackRadius: 50,
                attackStrength: 5,
                attackSpeed: 1,
                moveSpeed: 3.5,
                lastAttackTime: 0,
                lastDamageTime: 0,
                size: 15,
                windUp: 0.25,
                attackReadyAt: 0,
                bulletArmor: 0,
                abilityArmor: 0,
                effects: [],
                ability: {
                    type: 'default',
                    cooldown: 1000,
                    lastUsedTime: 0,
                },
                levelRewards: [],
                rewardsForChoice: [],
                permanentEffects: [],
            });

            cameraManager.updateCamera(mockState);

            expect(mockScene.cameras.main.startFollow).toHaveBeenCalled();
        });

        it('should not follow when no hero is found', () => {
            // Mock entityManager to return null when no hero graphics found
            mockEntityManager.getEntityGraphics.mockReturnValue(null);
            
            // No heroes in state
            cameraManager.updateCamera(mockState);

            expect(mockScene.cameras.main.startFollow).not.toHaveBeenCalled();
        });

        it('should reset following when hero changes', () => {
            // Reset mock calls
            jest.clearAllMocks();
            
            // Ensure mock returns graphics object
            mockEntityManager.getEntityGraphics.mockReturnValue({ x: 0, y: 0 });
            
            // Add first hero
            mockState.combatants.set('hero1', {
                id: 'hero1',
                type: 'hero',
                controller: 'test-session' as ControllerId,
                x: 350,
                y: 350,
                health: 100,
                maxHealth: 100,
                team: 'blue',
                state: 'alive',
                respawnTime: 0,
                respawnDuration: 6000,
                displayName: 'Hero 1',
                level: 1,
                experience: 0,
                experienceNeeded: 15,
                roundStats: {
                    totalExperience: 0,
                    minionKills: 0,
                    heroKills: 0,
                    turretKills: 0,
                    damageTaken: 0,
                    damageDealt: 0,
                },
                attackRadius: 50,
                attackStrength: 5,
                attackSpeed: 1,
                moveSpeed: 3.5,
                lastAttackTime: 0,
                lastDamageTime: 0,
                size: 15,
                windUp: 0.25,
                attackReadyAt: 0,
                bulletArmor: 0,
                abilityArmor: 0,
                effects: [],
                ability: {
                    type: 'default',
                    cooldown: 1000,
                    lastUsedTime: 0,
                },
                levelRewards: [],
                rewardsForChoice: [],
                permanentEffects: [],
            });

            // First update - should start following
            cameraManager.updateCamera(mockState);
            expect(mockScene.cameras.main.startFollow).toHaveBeenCalledTimes(1);

            // Add second hero and remove first
            mockState.combatants.delete('hero1');
            mockState.combatants.set('hero2', {
                id: 'hero2',
                type: 'hero',
                controller: 'test-session' as ControllerId,
                x: 400,
                y: 400,
                health: 100,
                maxHealth: 100,
                team: 'blue',
                state: 'alive',
                respawnTime: 0,
                respawnDuration: 6000,
                displayName: 'Hero 2',
                level: 1,
                experience: 0,
                experienceNeeded: 15,
                roundStats: {
                    totalExperience: 0,
                    minionKills: 0,
                    heroKills: 0,
                    turretKills: 0,
                    damageTaken: 0,
                    damageDealt: 0,
                },
                attackRadius: 50,
                attackStrength: 5,
                attackSpeed: 1,
                moveSpeed: 3.5,
                lastAttackTime: 0,
                lastDamageTime: 0,
                size: 15,
                windUp: 0.25,
                attackReadyAt: 0,
                bulletArmor: 0,
                abilityArmor: 0,
                effects: [],
                ability: {
                    type: 'default',
                    cooldown: 1000,
                    lastUsedTime: 0,
                },
                levelRewards: [],
                rewardsForChoice: [],
                permanentEffects: [],
            });

            // Second update - should reset and start following new hero
            cameraManager.updateCamera(mockState);
            expect(mockScene.cameras.main.stopFollow).toHaveBeenCalled();
            expect(mockScene.cameras.main.startFollow).toHaveBeenCalledTimes(2);
        });
    });

    describe('camera bounds and viewport', () => {
        it('should return correct viewport size', () => {
            const viewport = cameraManager.getViewportSize();
            expect(viewport.width).toBe(CLIENT_CONFIG.GAME_CANVAS_WIDTH);
            expect(viewport.height).toBe(CLIENT_CONFIG.GAME_CANVAS_HEIGHT);
        });

        it('should return correct map size', () => {
            const mapSize = cameraManager.getMapSize();
            expect(mapSize.width).toBe(CLIENT_CONFIG.MAP_WIDTH);
            expect(mapSize.height).toBe(CLIENT_CONFIG.MAP_HEIGHT);
        });

        it('should return correct camera offset', () => {
            const offset = cameraManager.getCameraOffset();
            expect(offset).toHaveProperty('x');
            expect(offset).toHaveProperty('y');
        });
    });

    describe('reset following', () => {
        it('should stop following and reset state', () => {
            cameraManager.resetFollowing();
            expect(mockScene.cameras.main.stopFollow).toHaveBeenCalled();
        });
    });

    describe('lookahead camera functionality', () => {
        beforeEach(() => {
            cameraManager.setPlayerSessionId('test-session' as ControllerId);
            // Set up a hero to follow
            mockState.combatants.set('hero1', {
                id: 'hero1',
                type: 'hero',
                controller: 'test-session' as ControllerId,
                x: 350,
                y: 350,
                health: 100,
                maxHealth: 100,
                team: 'blue',
                state: 'alive',
                respawnTime: 0,
                respawnDuration: 6000,
                displayName: 'Hero 1',
                level: 1,
                experience: 0,
                experienceNeeded: 15,
                roundStats: {
                    totalExperience: 0,
                    minionKills: 0,
                    heroKills: 0,
                    turretKills: 0,
                    damageTaken: 0,
                    damageDealt: 0,
                },
                attackRadius: 50,
                attackStrength: 5,
                attackSpeed: 1,
                moveSpeed: 3.5,
                lastAttackTime: 0,
                lastDamageTime: 0,
                size: 15,
                windUp: 0.25,
                attackReadyAt: 0,
                bulletArmor: 0,
                abilityArmor: 0,
                effects: [],
                ability: {
                    type: 'default',
                    cooldown: 1000,
                    lastUsedTime: 0,
                },
                levelRewards: [],
                rewardsForChoice: [],
                permanentEffects: [],
            });
            mockEntityManager.getEntityGraphics.mockReturnValue({
                x: 0,
                y: 0,
                setPosition: jest.fn(),
                setVisible: jest.fn(),
                destroy: jest.fn(),
            });
            
            // Ensure camera starts following by calling updateCamera once
            cameraManager.updateCamera(mockState);
        });

        it('should calculate zero offset when mouse is at center', () => {
            // Mouse at center (350, 350) with viewport 700x700
            mockScene.input.activePointer.x = 350;
            mockScene.input.activePointer.y = 350;
            
            cameraManager.updateCamera(mockState);
            
            // Should call setFollowOffset with (0, 0) when mouse is at center
            expect(mockScene.cameras.main.setFollowOffset).toHaveBeenCalledWith(0, 0);
        });

        it('should calculate positive offset when mouse is to the right', () => {
            // Mouse to the right of center
            mockScene.input.activePointer.x = 525; // 75% to the right
            mockScene.input.activePointer.y = 350; // center vertically
            
            cameraManager.updateCamera(mockState);
            
            // Should call setFollowOffset with negative X (camera looks right, hero appears left)
            const calls = mockScene.cameras.main.setFollowOffset.mock.calls;
            const lastCall = calls[calls.length - 1];
            expect(lastCall[0]).toBeLessThan(0); // Negative X offset
            expect(lastCall[1]).toBeCloseTo(0, 10); // No Y offset (handle -0 case)
        });

        it('should calculate negative offset when mouse is to the left', () => {
            // Mouse to the left of center
            mockScene.input.activePointer.x = 175; // 75% to the left
            mockScene.input.activePointer.y = 350; // center vertically
            
            cameraManager.updateCamera(mockState);
            
            // Should call setFollowOffset with positive X (camera looks left, hero appears right)
            const calls = mockScene.cameras.main.setFollowOffset.mock.calls;
            const lastCall = calls[calls.length - 1];
            expect(lastCall[0]).toBeGreaterThan(0); // Positive X offset
            expect(lastCall[1]).toBeCloseTo(0, 10); // No Y offset (handle -0 case)
        });

        it('should calculate offset when mouse is at edge', () => {
            // Mouse at right edge
            mockScene.input.activePointer.x = 700; // Right edge
            mockScene.input.activePointer.y = 350; // center vertically
            
            cameraManager.updateCamera(mockState);
            
            // Should call setFollowOffset with maximum negative X offset
            const calls = mockScene.cameras.main.setFollowOffset.mock.calls;
            const lastCall = calls[calls.length - 1];
            expect(lastCall[0]).toBeLessThan(0); // Negative X offset
            expect(Math.abs(lastCall[0])).toBeGreaterThan(0); // Should have some offset
            expect(lastCall[1]).toBeCloseTo(0, 10); // No Y offset (handle -0 case)
        });

        it('should update mouse position during updateCamera', () => {
            // Change mouse position
            mockScene.input.activePointer.x = 400;
            mockScene.input.activePointer.y = 300;
            
            cameraManager.updateCamera(mockState);
            
            // The camera manager should have updated its internal mouse position
            // We can verify this by checking that setFollowOffset was called with non-zero values
            const calls = mockScene.cameras.main.setFollowOffset.mock.calls;
            const lastCall = calls[calls.length - 1];
            expect(lastCall[0]).not.toBe(0); // Should have some X offset
            expect(lastCall[1]).not.toBe(0); // Should have some Y offset
        });

        it('should set initial follow offset to zero when starting to follow', () => {
            // First call should set initial offset to (0, 0)
            cameraManager.updateCamera(mockState);
            
            const calls = mockScene.cameras.main.setFollowOffset.mock.calls;
            expect(calls[0]).toEqual([0, 0]); // Initial offset should be zero
        });
    });
});