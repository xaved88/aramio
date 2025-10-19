import Phaser from 'phaser';
import { CLIENT_CONFIG } from '../ClientConfig';
import { GameScene } from './scenes/GameScene';
import { LobbyScene } from './scenes/LobbyScene';
import { getCanvasSize } from './utils/CanvasSize';

const { width, height } = getCanvasSize();

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width,
    height,
    parent: 'game-container',
    backgroundColor: CLIENT_CONFIG.UI.BACKGROUND.VIEWPORT,
    scene: [LobbyScene, GameScene],
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { x: 0, y: 0 },
            debug: false
        }
    },
    render: {
        antialiasGL: false
    }
};

new Phaser.Game(config); 
