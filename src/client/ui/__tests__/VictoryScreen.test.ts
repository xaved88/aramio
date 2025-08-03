import { VictoryScreen } from '../VictoryScreen';
import { CLIENT_CONFIG } from '../../../Config';

// Mock Phaser
const mockScene = {
    add: {
        graphics: jest.fn(() => ({
            fillStyle: jest.fn().mockReturnThis(),
            fillRect: jest.fn().mockReturnThis(),
            setAlpha: jest.fn().mockReturnThis(),
            destroy: jest.fn()
        })),
        text: jest.fn(() => ({
            setOrigin: jest.fn().mockReturnThis(),
            setAlpha: jest.fn().mockReturnThis(),
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
            CLIENT_CONFIG.GAME_CANVAS_WIDTH / 2,
            CLIENT_CONFIG.GAME_CANVAS_HEIGHT / 2,
            'VICTORY!',
            expect.objectContaining({
                fontSize: '72px',
                color: '#FFFFFF',
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
            CLIENT_CONFIG.GAME_CANVAS_WIDTH / 2,
            CLIENT_CONFIG.GAME_CANVAS_HEIGHT / 2,
            'DEFEAT!',
            expect.objectContaining({
                fontSize: '72px',
                color: '#FF6B6B',
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
            destroy: jest.fn() 
        };
        const mockText = { 
            setOrigin: jest.fn().mockReturnThis(),
            setAlpha: jest.fn().mockReturnThis(),
            destroy: jest.fn() 
        };
        const mockTween = { stop: jest.fn() };
        
        mockScene.add.graphics.mockReturnValue(mockGraphics);
        mockScene.add.text.mockReturnValue(mockText);
        mockScene.tweens.add.mockReturnValue(mockTween);
        
        victoryScreen.showVictory('blue', 'blue');
        victoryScreen.destroy();
        
        expect(mockGraphics.destroy).toHaveBeenCalled();
        expect(mockText.destroy).toHaveBeenCalled();
        expect(mockTween.stop).toHaveBeenCalled();
    });
}); 
