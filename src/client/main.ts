import Phaser from 'phaser';
import { Client } from 'colyseus.js';
import { GameScene } from './scenes/GameScene';

const client = new Client('ws://localhost:2567');

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: 1280,
    height: 720,
    parent: 'game-container',
    backgroundColor: '#2c3e50',
    scene: [GameScene],
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    }
};

new Phaser.Game(config); 