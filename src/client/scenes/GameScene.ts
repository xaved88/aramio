import Phaser from 'phaser';
import { Client } from 'colyseus.js';
import { GameState, Player, Cradle, Combatant } from '../../server/schema/GameState';
import { CLIENT_CONFIG } from '../../Config';

export class GameScene extends Phaser.Scene {
    private client!: Client;
    private room: any;
    private players: Map<string, Phaser.GameObjects.Graphics> = new Map();
    private playerTweens: Map<string, Phaser.Tweens.Tween> = new Map();
    private playerTexts: Map<string, Phaser.GameObjects.Text> = new Map();
    private playerRadiusIndicators: Map<string, Phaser.GameObjects.Graphics> = new Map();
    private blueCradle: Phaser.GameObjects.Graphics | null = null;
    private redCradle: Phaser.GameObjects.Graphics | null = null;
    private blueCradleText: Phaser.GameObjects.Text | null = null;
    private redCradleText: Phaser.GameObjects.Text | null = null;
    private blueCradleRadiusIndicator: Phaser.GameObjects.Graphics | null = null;
    private redCradleRadiusIndicator: Phaser.GameObjects.Graphics | null = null;

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
                this.updateCradles(state);
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
            let playerText = this.playerTexts.get(playerData.id);
            let radiusIndicator = this.playerRadiusIndicators.get(playerData.id);
            
            if (!playerCircle) {
                // Create new player
                playerCircle = this.add.graphics();
                this.players.set(playerData.id, playerCircle);
            }
            
            if (!playerText) {
                // Create new text
                playerText = this.add.text(0, 0, '', {
                    fontSize: '12px',
                    color: '#000000'
                }).setOrigin(0.5);
                this.playerTexts.set(playerData.id, playerText);
            }
            
            if (!radiusIndicator) {
                // Create new radius indicator
                radiusIndicator = this.add.graphics();
                radiusIndicator.setDepth(-1); // Put behind other elements
                this.playerRadiusIndicators.set(playerData.id, radiusIndicator);
            }
            
            // Stop any existing tween for this player
            const existingTween = this.playerTweens.get(playerData.id);
            if (existingTween) {
                existingTween.stop();
            }
            
            // Create smooth tween to new position
            const tween = this.tweens.add({
                targets: [playerCircle, playerText, radiusIndicator],
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
            playerCircle.fillCircle(0, 0, CLIENT_CONFIG.PLAYER_CIRCLE_RADIUS);
            
            // Update radius indicator
            radiusIndicator.clear();
            radiusIndicator.lineStyle(1, 0x000000, 0.3); // Thin black line with alpha
            radiusIndicator.strokeCircle(0, 0, playerData.attackRadius);
            
            // Update health text
            const healthPercent = Math.round((playerData.health / playerData.maxHealth) * 100);
            playerText.setText(`${healthPercent}%`);
        });
        
        // Remove players that no longer exist
        this.players.forEach((playerCircle, playerId) => {
            if (!state.players.has(playerId)) {
                const tween = this.playerTweens.get(playerId);
                if (tween) {
                    tween.stop();
                    this.playerTweens.delete(playerId);
                }
                const playerText = this.playerTexts.get(playerId);
                if (playerText) {
                    playerText.destroy();
                    this.playerTexts.delete(playerId);
                }
                const radiusIndicator = this.playerRadiusIndicators.get(playerId);
                if (radiusIndicator) {
                    radiusIndicator.destroy();
                    this.playerRadiusIndicators.delete(playerId);
                }
                playerCircle.destroy();
                this.players.delete(playerId);
            }
        });
    }

    private updateCradles(state: GameState) {
        // Update blue cradle
        if (state.blueCradle) {
            if (!this.blueCradle) {
                this.blueCradle = this.add.graphics();
            }
            if (!this.blueCradleText) {
                this.blueCradleText = this.add.text(0, 0, '', {
                    fontSize: '12px',
                    color: '#000000'
                }).setOrigin(0.5);
            }
            if (!this.blueCradleRadiusIndicator) {
                this.blueCradleRadiusIndicator = this.add.graphics();
                this.blueCradleRadiusIndicator.setDepth(-1); // Put behind other elements
            }
            
            this.blueCradle.clear();
            this.blueCradle.fillStyle(CLIENT_CONFIG.TEAM_COLORS.BLUE, 1);
            this.blueCradle.fillRect(
                state.blueCradle.x - CLIENT_CONFIG.CRADLE_SIZE / 2,
                state.blueCradle.y - CLIENT_CONFIG.CRADLE_SIZE / 2,
                CLIENT_CONFIG.CRADLE_SIZE,
                CLIENT_CONFIG.CRADLE_SIZE
            );
            
            // Update radius indicator
            this.blueCradleRadiusIndicator.clear();
            this.blueCradleRadiusIndicator.lineStyle(1, 0x000000, 0.3); // Thin black line with alpha
            this.blueCradleRadiusIndicator.strokeCircle(state.blueCradle.x, state.blueCradle.y, state.blueCradle.attackRadius);
            
            // Update health text
            const healthPercent = Math.round((state.blueCradle.health / state.blueCradle.maxHealth) * 100);
            this.blueCradleText.setText(`${healthPercent}%`);
            this.blueCradleText.setPosition(state.blueCradle.x, state.blueCradle.y);
        }
        
        // Update red cradle
        if (state.redCradle) {
            if (!this.redCradle) {
                this.redCradle = this.add.graphics();
            }
            if (!this.redCradleText) {
                this.redCradleText = this.add.text(0, 0, '', {
                    fontSize: '12px',
                    color: '#000000'
                }).setOrigin(0.5);
            }
            if (!this.redCradleRadiusIndicator) {
                this.redCradleRadiusIndicator = this.add.graphics();
                this.redCradleRadiusIndicator.setDepth(-1); // Put behind other elements
            }
            
            this.redCradle.clear();
            this.redCradle.fillStyle(CLIENT_CONFIG.TEAM_COLORS.RED, 1);
            this.redCradle.fillRect(
                state.redCradle.x - CLIENT_CONFIG.CRADLE_SIZE / 2,
                state.redCradle.y - CLIENT_CONFIG.CRADLE_SIZE / 2,
                CLIENT_CONFIG.CRADLE_SIZE,
                CLIENT_CONFIG.CRADLE_SIZE
            );
            
            // Update radius indicator
            this.redCradleRadiusIndicator.clear();
            this.redCradleRadiusIndicator.lineStyle(1, 0x000000, 0.3); // Thin black line with alpha
            this.redCradleRadiusIndicator.strokeCircle(state.redCradle.x, state.redCradle.y, state.redCradle.attackRadius);
            
            // Update health text
            const healthPercent = Math.round((state.redCradle.health / state.redCradle.maxHealth) * 100);
            this.redCradleText.setText(`${healthPercent}%`);
            this.redCradleText.setPosition(state.redCradle.x, state.redCradle.y);
        }
    }
} 