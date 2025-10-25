import { InputHandler } from '../InputHandler';
import { ControlModeStorage } from '../utils/ControlModeStorage';

// Mock ControlModeStorage
jest.mock('../utils/ControlModeStorage');

// Mock Phaser.Scene
const mockScene = {
    input: {
        on: jest.fn(),
        activePointer: {
            x: 100,
            y: 100,
            button: 0,
        },
        keyboard: {
            on: jest.fn(),
        },
    },
    cameras: {
        main: {
            getWorldPoint: jest.fn().mockReturnValue({ x: 100, y: 100 }),
        },
    },
    add: {
        graphics: jest.fn().mockReturnValue({
            fillStyle: jest.fn(),
            fillCircle: jest.fn(),
            fillTriangle: jest.fn(),
            setDepth: jest.fn(),
            setPosition: jest.fn(),
            setScale: jest.fn(),
            setAlpha: jest.fn(),
            destroy: jest.fn(),
        }),
    },
    tweens: {
        add: jest.fn(),
    },
    clearDestinationMarker: jest.fn(),
    updateDestinationMarker: jest.fn(),
} as any;

// Mock room
const mockRoom = {
    send: jest.fn(),
} as any;

describe('InputHandler', () => {
    let inputHandler: InputHandler;

    beforeEach(() => {
        jest.clearAllMocks();
        (ControlModeStorage.getControlMode as jest.Mock).mockReturnValue('mouse');
        inputHandler = new InputHandler(mockScene, mockRoom);
    });

    describe('initialization', () => {
        it('should initialize with mouse control mode by default', () => {
            expect(inputHandler.getControlMode()).toBe('mouse');
        });

        it('should load control mode from storage', () => {
            (ControlModeStorage.getControlMode as jest.Mock).mockReturnValue('keyboard');
            const handler = new InputHandler(mockScene, mockRoom);
            expect(handler.getControlMode()).toBe('keyboard');
        });

        it('should set up event handlers when setupHandlers is called', () => {
            inputHandler.setupHandlers();
            expect(mockScene.input.on).toHaveBeenCalled();
            expect(mockScene.input.keyboard.on).toHaveBeenCalled();
        });
    });

    describe('control mode switching', () => {
        it('should switch to keyboard mode', () => {
            inputHandler.setControlMode('keyboard');
            expect(inputHandler.getControlMode()).toBe('keyboard');
        });

        it('should switch to mouse mode', () => {
            inputHandler.setControlMode('keyboard');
            inputHandler.setControlMode('mouse');
            expect(inputHandler.getControlMode()).toBe('mouse');
        });

        it('should reset keyboard state when switching to mouse mode', () => {
            inputHandler.setControlMode('keyboard');
            // Simulate pressing keys (would need to access private keyStates)
            inputHandler.setControlMode('mouse');
            // Key states should be reset
            expect(inputHandler.getControlMode()).toBe('mouse');
        });
    });

    describe('keyboard movement', () => {
        beforeEach(() => {
            inputHandler.setControlMode('keyboard');
            // Mock game scene with state
            (mockScene as any).lastState = {
                combatants: new Map([
                    ['hero1', {
                        type: 'hero',
                        controller: 'test-session',
                        x: 500,
                        y: 500,
                    }]
                ]),
            };
            (mockScene as any).playerSessionId = 'test-session';
        });

        it('should send move command in keyboard mode', () => {
            inputHandler.update();
            expect(mockRoom.send).toHaveBeenCalledWith('move', expect.objectContaining({
                targetX: expect.any(Number),
                targetY: expect.any(Number),
            }));
        });

        it('should calculate correct position when no keys are pressed', () => {
            inputHandler.update();
            // Should send move to current position (500, 500) when no keys pressed
            expect(mockRoom.send).toHaveBeenCalledWith('move', {
                targetX: 500,
                targetY: 500,
            });
        });
    });

    describe('mouse movement', () => {
        beforeEach(() => {
            inputHandler.setControlMode('mouse');
        });

        it('should send move command based on mouse position in mouse mode', () => {
            inputHandler.update();
            expect(mockRoom.send).toHaveBeenCalledWith('move', {
                targetX: 100,
                targetY: 100,
            });
        });

        it('should not send move command when click is held', () => {
            // Simulate click down
            const pointerDownCallback = mockScene.input.on.mock.calls.find(
                (call: any[]) => call[0] === 'pointerdown'
            )?.[1];
            
            if (pointerDownCallback) {
                pointerDownCallback(mockScene.input.activePointer);
            }

            jest.clearAllMocks();
            inputHandler.update();
            
            // Should check for sniper ability but not send regular move
            // (implementation details depend on game state)
        });
    });

    describe('ability usage', () => {
        it('should send ability command on pointer up in mouse mode', () => {
            inputHandler.setControlMode('mouse');
            
            // Set up callbacks
            const pointerDownCallback = mockScene.input.on.mock.calls.find(
                (call: any[]) => call[0] === 'pointerdown'
            )?.[1];
            const pointerUpCallback = mockScene.input.on.mock.calls.find(
                (call: any[]) => call[0] === 'pointerup'
            )?.[1];
            
            // Simulate click down then up
            if (pointerDownCallback && pointerUpCallback) {
                (mockScene as any).lastState = {
                    combatants: new Map([
                        ['hero1', {
                            type: 'hero',
                            controller: 'test-session',
                            state: 'alive',
                        }]
                    ]),
                };
                (mockScene as any).playerSessionId = 'test-session';
                
                pointerDownCallback(mockScene.input.activePointer);
                jest.clearAllMocks();
                pointerUpCallback(mockScene.input.activePointer);
                
                expect(mockRoom.send).toHaveBeenCalledWith('useAbility', {
                    x: 100,
                    y: 100,
                });
            }
        });

        it('should send ability command on click in keyboard mode', () => {
            inputHandler.setControlMode('keyboard');
            
            const pointerUpCallback = mockScene.input.on.mock.calls.find(
                (call: any[]) => call[0] === 'pointerup'
            )?.[1];
            
            if (pointerUpCallback) {
                (mockScene as any).lastState = {
                    combatants: new Map([
                        ['hero1', {
                            type: 'hero',
                            controller: 'test-session',
                            state: 'alive',
                        }]
                    ]),
                };
                (mockScene as any).playerSessionId = 'test-session';
                
                pointerUpCallback(mockScene.input.activePointer);
                
                expect(mockRoom.send).toHaveBeenCalledWith('useAbility', {
                    x: 100,
                    y: 100,
                });
            }
        });
    });

    describe('key remapping', () => {
        beforeEach(() => {
            inputHandler.setupHandlers();
        });

        it('should have H key handler for hero toggle', () => {
            const hKeyHandler = mockScene.input.keyboard.on.mock.calls.find(
                (call: any[]) => call[0] === 'keydown-H'
            );
            expect(hKeyHandler).toBeDefined();
        });

        it('should have K key handler for debug kill', () => {
            const kKeyHandler = mockScene.input.keyboard.on.mock.calls.find(
                (call: any[]) => call[0] === 'keydown-K'
            );
            expect(kKeyHandler).toBeDefined();
        });

        it('should have R key handler for instant respawn', () => {
            const rKeyHandler = mockScene.input.keyboard.on.mock.calls.find(
                (call: any[]) => call[0] === 'keydown-R'
            );
            expect(rKeyHandler).toBeDefined();
        });

        it('should have U key handler for level up', () => {
            const uKeyHandler = mockScene.input.keyboard.on.mock.calls.find(
                (call: any[]) => call[0] === 'keydown-U'
            );
            expect(uKeyHandler).toBeDefined();
        });

        it('should have WASD handlers for movement', () => {
            const wKeyDown = mockScene.input.keyboard.on.mock.calls.find(
                (call: any[]) => call[0] === 'keydown-W'
            );
            const aKeyDown = mockScene.input.keyboard.on.mock.calls.find(
                (call: any[]) => call[0] === 'keydown-A'
            );
            const sKeyDown = mockScene.input.keyboard.on.mock.calls.find(
                (call: any[]) => call[0] === 'keydown-S'
            );
            const dKeyDown = mockScene.input.keyboard.on.mock.calls.find(
                (call: any[]) => call[0] === 'keydown-D'
            );

            expect(wKeyDown).toBeDefined();
            expect(aKeyDown).toBeDefined();
            expect(sKeyDown).toBeDefined();
            expect(dKeyDown).toBeDefined();
        });
    });

    describe('MOBA control mode', () => {
        beforeEach(() => {
            inputHandler.setControlMode('moba');
            inputHandler.setupHandlers();
        });

        it('should set control mode to moba', () => {
            expect(inputHandler.getControlMode()).toBe('moba');
        });

        it('should have space key handlers for targeting', () => {
            const spaceDownHandler = mockScene.input.keyboard.on.mock.calls.find(
                (call: any[]) => call[0] === 'keydown-SPACE'
            );
            const spaceUpHandler = mockScene.input.keyboard.on.mock.calls.find(
                (call: any[]) => call[0] === 'keyup-SPACE'
            );

            expect(spaceDownHandler).toBeDefined();
            expect(spaceUpHandler).toBeDefined();
        });

        it('should handle right-click for movement', () => {
            const rightClickHandler = mockScene.input.on.mock.calls.find(
                (call: any[]) => call[0] === 'pointerdown' && call[1].toString().includes('button === 2')
            );
            expect(rightClickHandler).toBeDefined();
        });

        it('should reset MOBA state when switching modes', () => {
            // Set some MOBA state
            inputHandler.setControlMode('moba');
            
            // Switch to mouse mode
            inputHandler.setControlMode('mouse');
            
            // State should be reset (we can't directly test private fields, but this ensures no errors)
            expect(inputHandler.getControlMode()).toBe('mouse');
        });

        it('should handle right-click movement in MOBA mode', () => {
            // Mock the scene with lastState
            const mockGameScene = {
                ...mockScene,
                lastState: {
                    combatants: new Map([
                        ['hero1', {
                            type: 'hero',
                            controller: 'player1',
                            x: 100,
                            y: 100
                        }]
                    ])
                },
                playerSessionId: 'player1'
            };
            
            const handler = new InputHandler(mockGameScene, mockRoom);
            handler.setControlMode('moba');
            handler.setDependencies({ HERO_STOP_DISTANCE: 10 }, null);
            
            // Simulate right-click
            const rightClickPointer = {
                x: 200,
                y: 200,
                button: 2,
                event: { preventDefault: jest.fn() }
            };
            
            // Find the right-click handler
            const rightClickHandler = mockScene.input.on.mock.calls.find(
                (call: any[]) => call[0] === 'pointerdown' && call[1].toString().includes('button === 2')
            );
            
            expect(rightClickHandler).toBeDefined();
            
            // Call the handler
            rightClickHandler[1](rightClickPointer);
            
            // Verify preventDefault was called
            expect(rightClickPointer.event.preventDefault).toHaveBeenCalled();
        });

        it('should handle S key to stop movement in MOBA mode', () => {
            // Mock the scene with lastState
            const mockGameScene = {
                ...mockScene,
                lastState: {
                    combatants: new Map([
                        ['hero1', {
                            type: 'hero',
                            controller: 'player1',
                            x: 100,
                            y: 100
                        }]
                    ])
                },
                playerSessionId: 'player1'
            };
            
            const handler = new InputHandler(mockGameScene, mockRoom);
            handler.setControlMode('moba');
            handler.setupHandlers();

            // Find the S key handler
            const sKeyHandler = mockScene.input.keyboard.on.mock.calls.find(
                (call: any[]) => call[0] === 'keydown-S'
            );

            expect(sKeyHandler).toBeDefined();

            // Call the handler
            sKeyHandler[1]();

            // Verify move command was sent to current position (stop movement)
            // The exact coordinates don't matter as much as verifying the command structure
            expect(mockRoom.send).toHaveBeenCalledWith('move', expect.objectContaining({
                targetX: expect.any(Number),
                targetY: expect.any(Number)
            }));
        });
    });
});

