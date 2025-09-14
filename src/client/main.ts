import Phaser from 'phaser';
import { CLIENT_CONFIG } from '../ClientConfig';
import { GameScene } from './scenes/GameScene';

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: CLIENT_CONFIG.GAME_CANVAS_WIDTH,
    height: CLIENT_CONFIG.GAME_CANVAS_HEIGHT,
    parent: 'game-container',
    backgroundColor: CLIENT_CONFIG.UI.BACKGROUND.GAME_CANVAS,
    scene: [GameScene],
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { x: 0, y: 0 },
            debug: false
        }
    }
};

new Phaser.Game(config); 
