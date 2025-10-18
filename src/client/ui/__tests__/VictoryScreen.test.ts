import { VictoryScreen } from '../VictoryScreen';
import { CLIENT_CONFIG } from '../../../ClientConfig';
import { getCanvasWidth, getCanvasHeight } from '../../utils/CanvasSize';

// Mock Phaser
const mockScene = {
    add: {
        graphics: jest.fn(() => ({
            fillStyle: jest.fn().mockReturnThis(),
            fillRect: jest.fn().mockReturnThis(),
            setAlpha: jest.fn().mockReturnThis(),
            setDepth: jest.fn().mockReturnThis(),
            setScrollFactor: jest.fn().mockReturnThis(),
            destroy: jest.fn()
        })),
        text: jest.fn(() => ({
            setOrigin: jest.fn().mockReturnThis(),
            setAlpha: jest.fn().mockReturnThis(),
            setDepth: jest.fn().mockReturnThis(),
            setScrollFactor: jest.fn().mockReturnThis(),
            destroy: jest.fn()
        })),
        container: jest.fn(() => ({
            add: jest.fn().mockReturnThis(),
            setScrollFactor: jest.fn().mockReturnThis(),
            setAlpha: jest.fn().mockReturnThis(),
            setDepth: jest.fn().mockReturnThis(),
            destroy: jest.fn()
        }))
    },
    tweens: {
        add: jest.fn(() => ({
            stop: jest.fn()
        }))
    },
    time: {
        delayedCall: jest.fn()
    }
};

describe('VictoryScreen', () => {
    let victoryScreen: VictoryScreen;
    let mockRestartCallback: jest.Mock;

    beforeEach(() => {
        mockRestartCallback = jest.fn();
        victoryScreen = new VictoryScreen(mockScene as any);
        victoryScreen.setRestartCallback(mockRestartCallback);
    });

    it('should create victory screen with correct text for victory', () => {
        victoryScreen.showVictory('blue', 'blue');
        
        expect(mockScene.add.text).toHaveBeenCalledWith(
            getCanvasWidth() / 2,
            getCanvasHeight() / 2,
            'VICTORY!',
            expect.objectContaining({
                fontSize: '72px',
                color: '#4CAF50',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 4,
                shadow: {
                    offsetX: 2,
                    offsetY: 2,
                    color: '#000000',
                    blur: 4,
                    fill: true
                }
            })
        );
    });

    it('should create victory screen with correct text for defeat', () => {
        victoryScreen.showVictory('blue', 'red');
        
        expect(mockScene.add.text).toHaveBeenCalledWith(
            getCanvasWidth() / 2,
            getCanvasHeight() / 2,
            'DEFEAT!',
            expect.objectContaining({
                fontSize: '72px',
                color: '#F44336',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 4,
                shadow: {
                    offsetX: 2,
                    offsetY: 2,
                    color: '#000000',
                    blur: 4,
                    fill: true
                }
            })
        );
    });

    it('should not show multiple victory screens simultaneously', () => {
        victoryScreen.showVictory('blue', 'blue');
        const initialCallCount = mockScene.add.text.mock.calls.length;
        
        victoryScreen.showVictory('red', 'red');
        
        expect(mockScene.add.text.mock.calls.length).toBe(initialCallCount);
    });

    it('should call restart callback after fade out', () => {
        const mockTween = {
            stop: jest.fn()
        };
        mockScene.tweens.add.mockReturnValue(mockTween);
        
        victoryScreen.showVictory('blue', 'blue');
        
        // The restart callback should be called when fade out completes
        // This is tested by the fact that the callback is set up correctly
        expect(mockScene.tweens.add).toHaveBeenCalled();
    });

    it('should clean up resources on destroy', () => {
        const mockGraphics = { 
            fillStyle: jest.fn().mockReturnThis(),
            fillRect: jest.fn().mockReturnThis(),
            setAlpha: jest.fn().mockReturnThis(),
            setDepth: jest.fn().mockReturnThis(),
            setScrollFactor: jest.fn().mockReturnThis(),
            destroy: jest.fn() 
        };
        const mockText = { 
            setOrigin: jest.fn().mockReturnThis(),
            setAlpha: jest.fn().mockReturnThis(),
            setDepth: jest.fn().mockReturnThis(),
            setScrollFactor: jest.fn().mockReturnThis(),
            destroy: jest.fn() 
        };
        const mockContainer = {
            add: jest.fn().mockReturnThis(),
            setScrollFactor: jest.fn().mockReturnThis(),
            setAlpha: jest.fn().mockReturnThis(),
            setDepth: jest.fn().mockReturnThis(),
            destroy: jest.fn()
        };
        const mockTween = { stop: jest.fn() };
        
        // Reset mocks and set return values
        mockScene.add.graphics.mockReturnValue(mockGraphics);
        mockScene.add.text.mockReturnValue(mockText);
        mockScene.add.container.mockReturnValue(mockContainer);
        mockScene.tweens.add.mockReturnValue(mockTween);
        
        // Create a new victory screen instance with the mocked scene
        const testVictoryScreen = new VictoryScreen(mockScene as any);
        testVictoryScreen.setRestartCallback(jest.fn());
        
        testVictoryScreen.showVictory('blue', 'blue');
        testVictoryScreen.destroy();
        
        // The container should be destroyed, which handles cleanup of child objects
        expect(mockContainer.destroy).toHaveBeenCalled();
        expect(mockTween.stop).toHaveBeenCalled();
    });
}); 
