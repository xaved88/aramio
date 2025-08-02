import Phaser from 'phaser';
import { Client } from 'colyseus.js';
import { GameState } from '../../server/schema/GameState';
import { CLIENT_CONFIG, GAMEPLAY_CONFIG } from '../../Config';
import { COMBATANT_TYPES, isPlayerCombatant, type Combatant, type PlayerCombatant, type AttackEvent } from '../../shared/types/CombatantTypes';
import { type SharedGameState } from '../../shared/types/GameStateTypes';
import { convertToSharedGameState } from '../../shared/utils/StateConverter';
import { EntityManager } from '../entity/EntityManager';
import { AnimationManager } from '../animation/AnimationManager';

export class GameScene extends Phaser.Scene {
    private client!: Client;
    private room: any;
    private entityManager!: EntityManager;
    private animationManager!: AnimationManager;
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
        
        // Initialize managers
        this.entityManager = new EntityManager(this);
        this.animationManager = new AnimationManager(this);
        
        try {
            this.room = await this.client.joinOrCreate('game');
            console.log('Connected to server');
            
            this.room.onStateChange((colyseusState: GameState) => {
                const sharedState = convertToSharedGameState(colyseusState);
                this.updateCombatantEntities(sharedState);
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

    private updateCombatantEntities(state: SharedGameState) {
        // Delegate combatant entity updates to the EntityManager
        this.entityManager.updateCombatantEntities(state);
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
        const radiusIndicator = this.entityManager.getEntityRadiusIndicator(combatantId);
        
        if (radiusIndicator) {
            this.animationManager.animateAttackSource(combatantId, radiusIndicator);
        }
    }

    private animateAttackTarget(combatantId: string, state: SharedGameState) {
        const combatant = state.combatants.get(combatantId);
        if (!combatant) return;
        
        const combatantGraphics = this.entityManager.getEntityGraphics(combatantId);
        
        if (combatantGraphics) {
            this.animationManager.animateAttackTarget(combatantId, combatantGraphics);
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

    /**
     * Clean up when scene is destroyed
     */
    destroy() {
        if (this.entityManager) {
            this.entityManager.destroy();
        }
        if (this.animationManager) {
            this.animationManager.destroy();
        }
    }
} 