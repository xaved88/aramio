import { CameraManager } from '../CameraManager';
import { CLIENT_CONFIG } from '../../ClientConfig';
import { SharedGameState } from '../../shared/types/GameStateTypes';
import { ControllerId } from '../../shared/types/CombatantTypes';
import { getCanvasWidth, getCanvasHeight } from '../utils/CanvasSize';

// Mock Phaser.Scene
const createMockScene = () => ({
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
            x: getCanvasWidth() * 0.5, // Default to center
            y: getCanvasHeight() * 0.5,
        },
    },
} as any);

let mockScene = createMockScene();

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
        // Reset all mocks and recreate scene with current canvas size
        jest.clearAllMocks();
        mockScene = createMockScene();
        
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
            deathEffectEvents: [],
            projectileMissEvents: [],
            killStreakEvents: [],
            blueSuperMinionsTriggered: false,
            redSuperMinionsTriggered: false,
            zones: new Map(),
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
            const canvasWidth = getCanvasWidth();
            const canvasHeight = getCanvasHeight();
            mockState.combatants.set('hero1', {
                id: 'hero1',
                type: 'hero',
                controller: 'test-session' as ControllerId,
                x: canvasWidth * 0.5,
                y: canvasHeight * 0.5,
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
                    deaths: 0,
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
                direction: 0,
                abilityPower: 10,
                effects: [],
                ability: {
                    type: 'default',
                    cooldown: 1000,
                    lastUsedTime: 0,
                    strength: 10,
                    strengthRatio: 1.0,
                } as any,
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
            const canvasWidth1 = getCanvasWidth();
            const canvasHeight1 = getCanvasHeight();
            mockState.combatants.set('hero1', {
                id: 'hero1',
                type: 'hero',
                controller: 'test-session' as ControllerId,
                x: canvasWidth1 * 0.5,
                y: canvasHeight1 * 0.5,
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
                    deaths: 0,
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
                direction: 0,
                abilityPower: 10,
                effects: [],
                ability: {
                    type: 'default',
                    cooldown: 1000,
                    lastUsedTime: 0,
                    strength: 10,
                    strengthRatio: 1.0,
                } as any,
                levelRewards: [],
                rewardsForChoice: [],
                permanentEffects: [],
            });

            // First update - should start following
            cameraManager.updateCamera(mockState);
            expect(mockScene.cameras.main.startFollow).toHaveBeenCalledTimes(1);

            // Add second hero and remove first
            mockState.combatants.delete('hero1');
            const canvasWidth2 = getCanvasWidth();
            const canvasHeight2 = getCanvasHeight();
            mockState.combatants.set('hero2', {
                id: 'hero2',
                type: 'hero',
                controller: 'test-session' as ControllerId,
                x: canvasWidth2 * 0.6,
                y: canvasHeight2 * 0.6,
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
                    deaths: 0,
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
                direction: 0,
                abilityPower: 10,
                effects: [],
                ability: {
                    type: 'default',
                    cooldown: 1000,
                    lastUsedTime: 0,
                    strength: 10,
                    strengthRatio: 1.0,
                } as any,
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
            expect(viewport.width).toBe(getCanvasWidth());
            expect(viewport.height).toBe(getCanvasHeight());
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
            const canvasWidth = getCanvasWidth();
            const canvasHeight = getCanvasHeight();
            mockState.combatants.set('hero1', {
                id: 'hero1',
                type: 'hero',
                controller: 'test-session' as ControllerId,
                x: canvasWidth * 0.5,
                y: canvasHeight * 0.5,
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
                    deaths: 0,
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
                direction: 0,
                abilityPower: 10,
                effects: [],
                ability: {
                    type: 'default',
                    cooldown: 1000,
                    lastUsedTime: 0,
                    strength: 10,
                    strengthRatio: 1.0,
                } as any,
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
            // Mouse at center
            const canvasWidthCenter = getCanvasWidth();
            const canvasHeightCenter = getCanvasHeight();
            mockScene.input.activePointer.x = canvasWidthCenter * 0.5;
            mockScene.input.activePointer.y = canvasHeightCenter * 0.5;
            
            cameraManager.updateCamera(mockState);
            
            // Should call setFollowOffset with (0, 0) when mouse is at center
            expect(mockScene.cameras.main.setFollowOffset).toHaveBeenCalledWith(0, 0);
        });

        it('should calculate positive offset when mouse is to the right', () => {
            // Mouse to the right of center
            const canvasWidthRight = getCanvasWidth();
            const canvasHeightRight = getCanvasHeight();
            mockScene.input.activePointer.x = canvasWidthRight * 0.75; // 75% to the right
            mockScene.input.activePointer.y = canvasHeightRight * 0.5; // center vertically
            
            cameraManager.updateCamera(mockState);
            
            // Should call setFollowOffset with negative X (camera looks right, hero appears left)
            const calls = mockScene.cameras.main.setFollowOffset.mock.calls;
            const lastCall = calls[calls.length - 1];
            expect(lastCall[0]).toBeLessThan(0); // Negative X offset
            expect(lastCall[1]).toBeCloseTo(0, 10); // No Y offset (handle -0 case)
        });

        it('should calculate negative offset when mouse is to the left', () => {
            // Mouse to the left of center
            const canvasWidthLeft = getCanvasWidth();
            const canvasHeightLeft = getCanvasHeight();
            mockScene.input.activePointer.x = canvasWidthLeft * 0.25; // 75% to the left
            mockScene.input.activePointer.y = canvasHeightLeft * 0.5; // center vertically
            
            cameraManager.updateCamera(mockState);
            
            // Should call setFollowOffset with positive X (camera looks left, hero appears right)
            const calls = mockScene.cameras.main.setFollowOffset.mock.calls;
            const lastCall = calls[calls.length - 1];
            expect(lastCall[0]).toBeGreaterThan(0); // Positive X offset
            expect(lastCall[1]).toBeCloseTo(0, 10); // No Y offset (handle -0 case)
        });

        it('should calculate offset when mouse is at edge', () => {
            // Mouse at right edge
            const canvasWidthEdge = getCanvasWidth();
            const canvasHeightEdge = getCanvasHeight();
            mockScene.input.activePointer.x = canvasWidthEdge - 10; // Near right edge
            mockScene.input.activePointer.y = canvasHeightEdge * 0.5; // center vertically
            
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
            const canvasWidthUpdate = getCanvasWidth();
            const canvasHeightUpdate = getCanvasHeight();
            mockScene.input.activePointer.x = canvasWidthUpdate * 0.6;
            mockScene.input.activePointer.y = canvasHeightUpdate * 0.4;
            
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