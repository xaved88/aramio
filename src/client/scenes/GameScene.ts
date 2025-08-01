import Phaser from 'phaser';
import { Client } from 'colyseus.js';
import { GameState, Player } from '../../server/schema/GameState';
import { CLIENT_CONFIG } from '../../Config';

export class GameScene extends Phaser.Scene {
    private client!: Client;
    private room: any;
    private players: Map<string, Phaser.GameObjects.Graphics> = new Map();
    private playerTweens: Map<string, Phaser.Tweens.Tween> = new Map();

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

    update() {
        if (!this.room || !this.room.state) return;
        
        // Get mouse position and send continuously
        const pointer = this.input.activePointer;
        this.room.send('move', { 
            targetX: pointer.x, 
            targetY: pointer.y 
        });
    }

    private updatePlayers(state: GameState) {
        // Update existing players and create new ones
        state.players.forEach((playerData: Player) => {
            let playerCircle = this.players.get(playerData.id);
            
            if (!playerCircle) {
                // Create new player
                playerCircle = this.add.graphics();
                this.players.set(playerData.id, playerCircle);
            }
            
            // Stop any existing tween for this player
            const existingTween = this.playerTweens.get(playerData.id);
            if (existingTween) {
                existingTween.stop();
            }
            
            // Get current position of the graphics object
            const currentX = playerCircle.x;
            const currentY = playerCircle.y;
            
            // Create smooth tween to new position
            const tween = this.tweens.add({
                targets: playerCircle,
                x: playerData.x,
                y: playerData.y,
                duration: CLIENT_CONFIG.INTERPOLATION_DURATION_MS,
                ease: 'Linear',
                onComplete: () => {
                    this.playerTweens.delete(playerData.id);
                }
            });
            
            this.playerTweens.set(playerData.id, tween);
            
            // Update the circle's visual appearance
            playerCircle.clear();
            const color = playerData.team === 'blue' ? CLIENT_CONFIG.TEAM_COLORS.BLUE : CLIENT_CONFIG.TEAM_COLORS.RED;
            playerCircle.fillStyle(color, 1);
            playerCircle.fillCircle(0, 0, CLIENT_CONFIG.PLAYER_CIRCLE_RADIUS); // Draw relative to the graphics object
        });
        
        // Remove players that no longer exist
        this.players.forEach((playerCircle, playerId) => {
            if (!state.players.has(playerId)) {
                const tween = this.playerTweens.get(playerId);
                if (tween) {
                    tween.stop();
                    this.playerTweens.delete(playerId);
                }
                playerCircle.destroy();
                this.players.delete(playerId);
            }
        });
    }
} 