import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene';
import { CLIENT_CONFIG } from '../Config';

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: CLIENT_CONFIG.GAME_CANVAS_WIDTH,
    height: CLIENT_CONFIG.GAME_CANVAS_HEIGHT,
    parent: 'game-container',
    backgroundColor: '#2c3e50',
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