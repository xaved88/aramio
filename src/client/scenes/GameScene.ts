import Phaser from 'phaser';

export class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    preload() {
        // Load game assets here
        this.load.setBaseURL('http://localhost:3000/');
        
        // Temporary placeholder graphics
        this.load.image('player', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
        this.load.image('enemy', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
    }

    create() {
        this.add.text(400, 300, 'Aramio MOBA', {
            fontSize: '32px',
            color: '#fff'
        }).setOrigin(0.5);

        this.add.text(400, 350, 'Connecting to server...', {
            fontSize: '16px',
            color: '#ccc'
        }).setOrigin(0.5);
    }

    update() {
        // Game loop logic here
    }
} 