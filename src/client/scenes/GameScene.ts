import Phaser from 'phaser';
import { Client } from 'colyseus.js';
import { GameState, Player, Cradle, Turret, Combatant, AttackEvent } from '../../server/schema/GameState';
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
    private blueTurret: Phaser.GameObjects.Graphics | null = null;
    private redTurret: Phaser.GameObjects.Graphics | null = null;
    private blueTurretText: Phaser.GameObjects.Text | null = null;
    private redTurretText: Phaser.GameObjects.Text | null = null;
    private blueTurretRadiusIndicator: Phaser.GameObjects.Graphics | null = null;
    private redTurretRadiusIndicator: Phaser.GameObjects.Graphics | null = null;
    private processedAttackEvents: Set<string> = new Set();

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
                this.updateTurrets(state);
                this.processAttackEvents(state);
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

    private processAttackEvents(state: GameState) {
        state.attackEvents.forEach(event => {
            const eventKey = `${event.sourceId}-${event.targetId}-${event.timestamp}`;
            
            // Skip if we've already processed this event
            if (this.processedAttackEvents.has(eventKey)) return;
            
            this.processedAttackEvents.add(eventKey);
            
            // Animate attack source (radius flash)
            this.animateAttackSource(event.sourceId);
            
            // Animate attack target (color flash)
            this.animateAttackTarget(event.targetId, state);
        });
    }

    private animateAttackSource(combatantId: string) {
        // Find the radius indicator for the source
        let radiusIndicator = this.playerRadiusIndicators.get(combatantId);
        
        if (!radiusIndicator) {
            // Check if it's a cradle
            if (combatantId === 'blue-cradle') {
                radiusIndicator = this.blueCradleRadiusIndicator || undefined;
            } else if (combatantId === 'red-cradle') {
                radiusIndicator = this.redCradleRadiusIndicator || undefined;
            } else if (combatantId === 'blue-turret') {
                radiusIndicator = this.blueTurretRadiusIndicator || undefined;
            } else if (combatantId === 'red-turret') {
                radiusIndicator = this.redTurretRadiusIndicator || undefined;
            }
        }
        
        if (radiusIndicator) {
            // Flash the radius indicator
            this.tweens.add({
                targets: radiusIndicator,
                alpha: 0,
                duration: CLIENT_CONFIG.ANIMATIONS.ATTACK_SOURCE_DURATION_MS,
                yoyo: true,
                ease: 'Linear'
            });
        }
    }

    private animateAttackTarget(combatantId: string, state: GameState) {
        // Find the combatant and calculate damage percentage
        let combatant: Combatant | null = null;
        
        // Check if it's a player
        if (state.players.has(combatantId)) {
            combatant = state.players.get(combatantId) || null;
        } else if (combatantId === 'blue-cradle') {
            combatant = state.blueCradle;
        } else if (combatantId === 'red-cradle') {
            combatant = state.redCradle;
        }
        
        if (!combatant) return;
        
        const flashDuration = CLIENT_CONFIG.ANIMATIONS.ATTACK_TARGET_FLASH_DURATION_MS;
        
        // Find the graphics object to animate
        let combatantGraphics = this.players.get(combatantId);
        
        if (!combatantGraphics) {
            // Check if it's a cradle
            if (combatantId === 'blue-cradle') {
                combatantGraphics = this.blueCradle || undefined;
            } else if (combatantId === 'red-cradle') {
                combatantGraphics = this.redCradle || undefined;
            }
        }
        
        if (combatantGraphics) {
            // Quick jump to flash alpha, then slow fade back
            this.tweens.add({
                targets: combatantGraphics,
                alpha: CLIENT_CONFIG.ANIMATIONS.ATTACK_TARGET_FLASH_ALPHA,
                duration: 50, // Quick jump (50ms)
                ease: 'Power2',
                onComplete: () => {
                    // Slow fade back to normal
                    this.tweens.add({
                        targets: combatantGraphics,
                        alpha: 1,
                        duration: flashDuration - 50, // Remaining time for slow fade
                        ease: 'Power1'
                    });
                }
            });
        }
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

    private updateTurrets(state: GameState) {
        // Update blue turret
        if (state.blueTurret) {
            if (!this.blueTurret) {
                this.blueTurret = this.add.graphics();
            }
            if (!this.blueTurretText) {
                this.blueTurretText = this.add.text(0, 0, '', {
                    fontSize: '12px',
                    color: '#000000'
                }).setOrigin(0.5);
            }
            if (!this.blueTurretRadiusIndicator) {
                this.blueTurretRadiusIndicator = this.add.graphics();
                this.blueTurretRadiusIndicator.setDepth(-1);
            }
            
            // Check if turret is alive
            if (state.blueTurret.health > 0) {
                this.blueTurret.setVisible(true);
                this.blueTurretText.setVisible(true);
                this.blueTurretRadiusIndicator.setVisible(true);
                
                this.blueTurret.clear();
                this.blueTurret.fillStyle(CLIENT_CONFIG.TEAM_COLORS.BLUE, 1);
                this.blueTurret.fillRect(
                    state.blueTurret.x - CLIENT_CONFIG.TURRET_SIZE.width / 2,
                    state.blueTurret.y - CLIENT_CONFIG.TURRET_SIZE.height / 2,
                    CLIENT_CONFIG.TURRET_SIZE.width,
                    CLIENT_CONFIG.TURRET_SIZE.height
                );
                
                // Update radius indicator
                this.blueTurretRadiusIndicator.clear();
                this.blueTurretRadiusIndicator.lineStyle(1, 0x000000, 0.3);
                this.blueTurretRadiusIndicator.strokeCircle(state.blueTurret.x, state.blueTurret.y, state.blueTurret.attackRadius);
                
                // Update health text
                const healthPercent = Math.round((state.blueTurret.health / state.blueTurret.maxHealth) * 100);
                this.blueTurretText.setText(`${healthPercent}%`);
                this.blueTurretText.setPosition(state.blueTurret.x, state.blueTurret.y);
            } else {
                // Hide destroyed turret
                this.blueTurret.setVisible(false);
                this.blueTurretText.setVisible(false);
                this.blueTurretRadiusIndicator.setVisible(false);
            }
        }
        
        // Update red turret
        if (state.redTurret) {
            if (!this.redTurret) {
                this.redTurret = this.add.graphics();
            }
            if (!this.redTurretText) {
                this.redTurretText = this.add.text(0, 0, '', {
                    fontSize: '12px',
                    color: '#000000'
                }).setOrigin(0.5);
            }
            if (!this.redTurretRadiusIndicator) {
                this.redTurretRadiusIndicator = this.add.graphics();
                this.redTurretRadiusIndicator.setDepth(-1);
            }
            
            // Check if turret is alive
            if (state.redTurret.health > 0) {
                this.redTurret.setVisible(true);
                this.redTurretText.setVisible(true);
                this.redTurretRadiusIndicator.setVisible(true);
                
                this.redTurret.clear();
                this.redTurret.fillStyle(CLIENT_CONFIG.TEAM_COLORS.RED, 1);
                this.redTurret.fillRect(
                    state.redTurret.x - CLIENT_CONFIG.TURRET_SIZE.width / 2,
                    state.redTurret.y - CLIENT_CONFIG.TURRET_SIZE.height / 2,
                    CLIENT_CONFIG.TURRET_SIZE.width,
                    CLIENT_CONFIG.TURRET_SIZE.height
                );
                
                // Update radius indicator
                this.redTurretRadiusIndicator.clear();
                this.redTurretRadiusIndicator.lineStyle(1, 0x000000, 0.3);
                this.redTurretRadiusIndicator.strokeCircle(state.redTurret.x, state.redTurret.y, state.redTurret.attackRadius);
                
                // Update health text
                const healthPercent = Math.round((state.redTurret.health / state.redTurret.maxHealth) * 100);
                this.redTurretText.setText(`${healthPercent}%`);
                this.redTurretText.setPosition(state.redTurret.x, state.redTurret.y);
            } else {
                // Hide destroyed turret
                this.redTurret.setVisible(false);
                this.redTurretText.setVisible(false);
                this.redTurretRadiusIndicator.setVisible(false);
            }
        }
    }
} 