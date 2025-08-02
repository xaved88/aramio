import Phaser from 'phaser';
import { Client } from 'colyseus.js';
import { GameState } from '../../server/schema/GameState';
import { CLIENT_CONFIG, GAMEPLAY_CONFIG } from '../../Config';
import { COMBATANT_TYPES, isPlayerCombatant, type Combatant, type PlayerCombatant, type AttackEvent } from '../../shared/types/CombatantTypes';
import { type SharedGameState } from '../../shared/types/GameStateTypes';
import { convertToSharedGameState } from '../../shared/utils/StateConverter';

export class GameScene extends Phaser.Scene {
    private client!: Client;
    private room: any;
    private combatantGraphics: Map<string, Phaser.GameObjects.Graphics> = new Map();
    private combatantTweens: Map<string, Phaser.Tweens.Tween> = new Map();
    private combatantTexts: Map<string, Phaser.GameObjects.Text> = new Map();
    private combatantRadiusIndicators: Map<string, Phaser.GameObjects.Graphics> = new Map();
    private playerRespawnRings: Map<string, Phaser.GameObjects.Graphics> = new Map();
    private processedAttackEvents: Set<string> = new Set();
    private hudHealthBar: Phaser.GameObjects.Graphics | null = null;
    private hudHealthBarBackground: Phaser.GameObjects.Graphics | null = null;
    private hudHealthText: Phaser.GameObjects.Text | null = null;
    private hudExperienceBar: Phaser.GameObjects.Graphics | null = null;
    private hudExperienceBarBackground: Phaser.GameObjects.Graphics | null = null;
    private hudExperienceText: Phaser.GameObjects.Text | null = null;
    private hudLevelText: Phaser.GameObjects.Text | null = null;

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
            
            this.room.onStateChange((colyseusState: GameState) => {
                const sharedState = convertToSharedGameState(colyseusState);
                this.updateCombatants(sharedState);
                this.processAttackEvents(sharedState);
                this.updateHUD(sharedState);
            });
            
            this.room.onLeave((code: number) => {
                console.log('Left room with code:', code);
            });
            
            this.createHUD();
            
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

    private processAttackEvents(state: SharedGameState) {
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
        const radiusIndicator = this.combatantRadiusIndicators.get(combatantId);
        
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

    private animateAttackTarget(combatantId: string, state: SharedGameState) {
        const combatant = state.combatants.get(combatantId);
        if (!combatant) return;
        
        const flashDuration = CLIENT_CONFIG.ANIMATIONS.ATTACK_TARGET_FLASH_DURATION_MS;
        const combatantGraphics = this.combatantGraphics.get(combatantId);
        
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

    private updateCombatants(state: SharedGameState) {
        // Update existing combatants and create new ones
        state.combatants.forEach((combatantData: Combatant) => {
            let combatantGraphics = this.combatantGraphics.get(combatantData.id);
            let combatantText = this.combatantTexts.get(combatantData.id);
            let radiusIndicator = this.combatantRadiusIndicators.get(combatantData.id);
            
            if (!combatantGraphics) {
                // Create new combatant graphics
                combatantGraphics = this.add.graphics();
                this.combatantGraphics.set(combatantData.id, combatantGraphics);
            }
            
            if (!combatantText) {
                // Create new text
                combatantText = this.add.text(0, 0, '', {
                    fontSize: '12px',
                    color: '#000000'
                }).setOrigin(0.5);
                this.combatantTexts.set(combatantData.id, combatantText);
            }
            
            if (!radiusIndicator) {
                // Create new radius indicator
                radiusIndicator = this.add.graphics();
                radiusIndicator.setDepth(-1); // Put behind other elements
                this.combatantRadiusIndicators.set(combatantData.id, radiusIndicator);
            }
            
            // Handle respawn ring for players
            let respawnRing = this.playerRespawnRings.get(combatantData.id);
            if (combatantData.type === COMBATANT_TYPES.PLAYER) {
                if (!respawnRing) {
                    respawnRing = this.add.graphics();
                    respawnRing.setDepth(-2); // Put behind radius indicators
                    this.playerRespawnRings.set(combatantData.id, respawnRing);
                }
            }
            
            // Stop any existing tween for this combatant
            const existingTween = this.combatantTweens.get(combatantData.id);
            if (existingTween) {
                existingTween.stop();
            }
            
            // Create smooth tween to new position
            const tweenTargets = [combatantGraphics, combatantText, radiusIndicator];
            if (respawnRing) tweenTargets.push(respawnRing);
            
            const tween = this.tweens.add({
                targets: tweenTargets,
                x: combatantData.x,
                y: combatantData.y,
                duration: CLIENT_CONFIG.INTERPOLATION_DURATION_MS,
                ease: 'Linear',
                onComplete: () => {
                    this.combatantTweens.delete(combatantData.id);
                }
            });
            
            this.combatantTweens.set(combatantData.id, tween);
            
            // Update the combatant's visual appearance based on type
            this.renderCombatant(combatantData, combatantGraphics, radiusIndicator, respawnRing, state);
            
            // Update health text
            const healthPercent = Math.round((combatantData.health / combatantData.maxHealth) * 100);
            combatantText.setText(`${healthPercent}%`);
        });
        
        // Remove combatants that no longer exist
        this.combatantGraphics.forEach((combatantGraphics, combatantId) => {
            if (!state.combatants.has(combatantId)) {
                const tween = this.combatantTweens.get(combatantId);
                if (tween) {
                    tween.stop();
                    this.combatantTweens.delete(combatantId);
                }
                const combatantText = this.combatantTexts.get(combatantId);
                if (combatantText) {
                    combatantText.destroy();
                    this.combatantTexts.delete(combatantId);
                }
                const radiusIndicator = this.combatantRadiusIndicators.get(combatantId);
                if (radiusIndicator) {
                    radiusIndicator.destroy();
                    this.combatantRadiusIndicators.delete(combatantId);
                }
                const respawnRing = this.playerRespawnRings.get(combatantId);
                if (respawnRing) {
                    respawnRing.destroy();
                    this.playerRespawnRings.delete(combatantId);
                }
                combatantGraphics.destroy();
                this.combatantGraphics.delete(combatantId);
            }
        });
    }

    private renderCombatant(
        combatant: Combatant, 
        graphics: Phaser.GameObjects.Graphics, 
        radiusIndicator: Phaser.GameObjects.Graphics,
        respawnRing: Phaser.GameObjects.Graphics | undefined,
        state: SharedGameState
    ) {
        graphics.clear();
        
        // Determine color based on team and state
        let color;
        if (combatant.type === COMBATANT_TYPES.PLAYER && isPlayerCombatant(combatant) && combatant.state === 'respawning') {
            color = combatant.team === 'blue' ? CLIENT_CONFIG.TEAM_COLORS.BLUE_RESPAWNING : CLIENT_CONFIG.TEAM_COLORS.RED_RESPAWNING;
        } else {
            color = combatant.team === 'blue' ? CLIENT_CONFIG.TEAM_COLORS.BLUE : CLIENT_CONFIG.TEAM_COLORS.RED;
        }
        
        // Render based on type
        switch (combatant.type) {
            case COMBATANT_TYPES.PLAYER:
                graphics.fillStyle(color, 1);
                graphics.fillCircle(0, 0, CLIENT_CONFIG.PLAYER_CIRCLE_RADIUS);
                break;
            case COMBATANT_TYPES.CRADLE:
                graphics.fillStyle(color, 1);
                graphics.fillRect(
                    -CLIENT_CONFIG.CRADLE_SIZE / 2,
                    -CLIENT_CONFIG.CRADLE_SIZE / 2,
                    CLIENT_CONFIG.CRADLE_SIZE,
                    CLIENT_CONFIG.CRADLE_SIZE
                );
                break;
            case COMBATANT_TYPES.TURRET:
                if (combatant.health > 0) {
                    graphics.fillStyle(color, 1);
                    graphics.fillRect(
                        -CLIENT_CONFIG.TURRET_SIZE.width / 2,
                        -CLIENT_CONFIG.TURRET_SIZE.height / 2,
                        CLIENT_CONFIG.TURRET_SIZE.width,
                        CLIENT_CONFIG.TURRET_SIZE.height
                    );
                    graphics.setVisible(true);
                } else {
                    graphics.setVisible(false);
                }
                break;
        }
        
        // Update respawn ring for players
        if (respawnRing && combatant.type === COMBATANT_TYPES.PLAYER && isPlayerCombatant(combatant)) {
            respawnRing.clear();
            if (combatant.state === 'respawning') {
                const respawnDuration = combatant.respawnDuration;
                const timeElapsed = respawnDuration - (combatant.respawnTime - state.gameTime);
                const respawnProgress = Math.max(0, Math.min(1, timeElapsed / respawnDuration));
                const ringColor = combatant.team === 'blue' ? CLIENT_CONFIG.TEAM_COLORS.BLUE : CLIENT_CONFIG.TEAM_COLORS.RED;
                
                respawnRing.lineStyle(CLIENT_CONFIG.RESPAWN_RING.THICKNESS, ringColor, CLIENT_CONFIG.RESPAWN_RING.ALPHA);
                respawnRing.beginPath();
                respawnRing.arc(0, 0, CLIENT_CONFIG.RESPAWN_RING.RADIUS, -Math.PI/2, -Math.PI/2 + (2 * Math.PI * respawnProgress));
                respawnRing.strokePath();
            }
        }
        
        // Update radius indicator
        radiusIndicator.clear();
        if (combatant.health > 0 && (combatant.type !== COMBATANT_TYPES.PLAYER || !isPlayerCombatant(combatant) || combatant.state !== 'respawning')) {
            radiusIndicator.lineStyle(1, 0x000000, 0.3); // Thin black line with alpha
            radiusIndicator.strokeCircle(0, 0, combatant.attackRadius);
        }
        
        // Handle turret visibility for text and radius indicator
        if (combatant.type === COMBATANT_TYPES.TURRET) {
            const combatantText = this.combatantTexts.get(combatant.id);
            if (combatantText) {
                combatantText.setVisible(combatant.health > 0);
            }
            radiusIndicator.setVisible(combatant.health > 0);
        }
    }

    private createHUD() {
        const healthConfig = CLIENT_CONFIG.HUD.HEALTH_BAR;
        const expConfig = CLIENT_CONFIG.HUD.EXPERIENCE_BAR;
        
        // Create health bar background
        this.hudHealthBarBackground = this.add.graphics();
        this.hudHealthBarBackground.fillStyle(healthConfig.BACKGROUND_COLOR, 0.8);
        this.hudHealthBarBackground.fillRect(
            healthConfig.X, 
            healthConfig.Y, 
            healthConfig.WIDTH, 
            healthConfig.HEIGHT
        );
        
        // Create health bar
        this.hudHealthBar = this.add.graphics();
        
        // Create health text
        this.hudHealthText = this.add.text(healthConfig.X + healthConfig.WIDTH / 2, healthConfig.Y + healthConfig.HEIGHT / 2, '100%', {
            fontSize: '12px',
            color: healthConfig.TEXT_COLOR
        }).setOrigin(0.5);
        
        // Create experience bar background
        this.hudExperienceBarBackground = this.add.graphics();
        this.hudExperienceBarBackground.fillStyle(expConfig.BACKGROUND_COLOR, 0.8);
        this.hudExperienceBarBackground.fillRect(
            expConfig.X, 
            expConfig.Y, 
            expConfig.WIDTH, 
            expConfig.HEIGHT
        );
        
        // Create experience bar
        this.hudExperienceBar = this.add.graphics();
        
        // Create experience text
        this.hudExperienceText = this.add.text(expConfig.X + expConfig.WIDTH / 2, expConfig.Y + expConfig.HEIGHT / 2, '0/10 XP', {
            fontSize: '10px',
            color: expConfig.TEXT_COLOR
        }).setOrigin(0.5);
        
        // Create level text
        this.hudLevelText = this.add.text(healthConfig.X + healthConfig.WIDTH + 10, healthConfig.Y + healthConfig.HEIGHT / 2, 'Lv.1', {
            fontSize: '14px',
            color: '#ffffff'
        }).setOrigin(0, 0.5);
    }

    private updateHUD(state: SharedGameState) {
        if (!this.hudHealthBar || !this.hudHealthBarBackground || !this.hudHealthText || 
            !this.hudExperienceBar || !this.hudExperienceBarBackground || !this.hudExperienceText || !this.hudLevelText) return;
        
        // Find the current player (assuming first player for now)
        // In a real implementation, you'd track the client's player ID
        const currentPlayer = Array.from(state.combatants.values()).find(c => c.type === COMBATANT_TYPES.PLAYER);
        if (!currentPlayer || !isPlayerCombatant(currentPlayer)) return;
        
        const healthConfig = CLIENT_CONFIG.HUD.HEALTH_BAR;
        const expConfig = CLIENT_CONFIG.HUD.EXPERIENCE_BAR;
        const healthPercent = currentPlayer.health / currentPlayer.maxHealth;
        
        // Update health bar
        this.hudHealthBar.clear();
        this.hudHealthBar.fillStyle(healthConfig.HEALTH_COLOR, 1);
        this.hudHealthBar.fillRect(
            healthConfig.X, 
            healthConfig.Y, 
            healthConfig.WIDTH * healthPercent, 
            healthConfig.HEIGHT
        );
        
        // Update health text
        const healthPercentText = Math.round(healthPercent * 100);
        this.hudHealthText.setText(`${healthPercentText}%`);
        
        // Update experience bar
        const experienceNeeded = currentPlayer.level * 10; // level * 10
        const experiencePercent = currentPlayer.experience / experienceNeeded;
        
        this.hudExperienceBar.clear();
        this.hudExperienceBar.fillStyle(expConfig.EXPERIENCE_COLOR, 1);
        this.hudExperienceBar.fillRect(
            expConfig.X, 
            expConfig.Y, 
            expConfig.WIDTH * experiencePercent, 
            expConfig.HEIGHT
        );
        
        // Update experience text
        this.hudExperienceText.setText(`${currentPlayer.experience}/${experienceNeeded} XP`);
        
        // Update level text
        this.hudLevelText.setText(`Lv.${currentPlayer.level}`);
    }
} 