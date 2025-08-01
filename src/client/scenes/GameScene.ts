import Phaser from 'phaser';
import { Client } from 'colyseus.js';
import { GameState, Player } from '../../server/schema/GameState';

export class GameScene extends Phaser.Scene {
    private client!: Client;
    private room: any;
    private players: Map<string, Phaser.GameObjects.Graphics> = new Map();

    constructor() {
        super({ key: 'GameScene' });
    }

    preload() {
        // No assets needed for basic circles
    }

    async create() {
        this.client = new Client('ws://localhost:2567');
        
        try {
            this.room = await this.client.joinOrCreate('game');
            console.log('Connected to server');
            
            this.room.onStateChange((state: GameState) => {
                this.updatePlayers(state);
            });
            
            this.room.onLeave((code: number) => {
                console.log('Left room with code:', code);
            });
            
        } catch (error) {
            console.error('Failed to connect:', error);
            this.add.text(300, 300, 'Failed to connect to server', {
                fontSize: '16px',
                color: '#ff0000'
            }).setOrigin(0.5);
        }
    }

    private updatePlayers(state: GameState) {
        // Clear existing players
        this.players.forEach(player => player.destroy());
        this.players.clear();
        
        // Render each player
        state.players.forEach((playerData: Player) => {
            const playerCircle = this.add.graphics();
            const color = playerData.team === 'blue' ? 0x3498db : 0xe74c3c;
            
            playerCircle.fillStyle(color, 1);
            playerCircle.fillCircle(playerData.x, playerData.y, 20);
            
            this.players.set(playerData.id, playerCircle);
        });
    }

    update() {
        // Game loop logic here
    }
} 