import Phaser from 'phaser';
import { PlayerCombatant } from '../../shared/types/CombatantTypes';
import { CLIENT_CONFIG } from '../../Config';

/**
 * HUDRenderer handles all HUD rendering logic
 */
export class HUDRenderer {
    private scene: Phaser.Scene;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }

    /**
     * Creates all HUD elements
     */
    createHUDElements(): {
        healthBar: Phaser.GameObjects.Graphics;
        healthBarBackground: Phaser.GameObjects.Graphics;
        healthText: Phaser.GameObjects.Text;
        experienceBar: Phaser.GameObjects.Graphics;
        experienceBarBackground: Phaser.GameObjects.Graphics;
        experienceText: Phaser.GameObjects.Text;
        levelText: Phaser.GameObjects.Text;
    } {
        const healthConfig = CLIENT_CONFIG.HUD.HEALTH_BAR;
        const expConfig = CLIENT_CONFIG.HUD.EXPERIENCE_BAR;
        
        // Create health bar background
        const healthBarBackground = this.scene.add.graphics();
        healthBarBackground.fillStyle(healthConfig.BACKGROUND_COLOR, 0.8);
        healthBarBackground.fillRect(
            healthConfig.X, 
            healthConfig.Y, 
            healthConfig.WIDTH, 
            healthConfig.HEIGHT
        );
        
        // Create health bar
        const healthBar = this.scene.add.graphics();
        
        // Create health text
        const healthText = this.scene.add.text(healthConfig.X + healthConfig.WIDTH / 2, healthConfig.Y + healthConfig.HEIGHT / 2, '100%', {
            fontSize: '12px',
            color: healthConfig.TEXT_COLOR
        }).setOrigin(0.5);
        
        // Create experience bar background
        const experienceBarBackground = this.scene.add.graphics();
        experienceBarBackground.fillStyle(expConfig.BACKGROUND_COLOR, 0.8);
        experienceBarBackground.fillRect(
            expConfig.X, 
            expConfig.Y, 
            expConfig.WIDTH, 
            expConfig.HEIGHT
        );
        
        // Create experience bar
        const experienceBar = this.scene.add.graphics();
        
        // Create experience text
        const experienceText = this.scene.add.text(expConfig.X + expConfig.WIDTH / 2, expConfig.Y + expConfig.HEIGHT / 2, '0/10 XP', {
            fontSize: '10px',
            color: expConfig.TEXT_COLOR
        }).setOrigin(0.5);
        
        // Create level text
        const levelText = this.scene.add.text(healthConfig.X + healthConfig.WIDTH + 10, healthConfig.Y + healthConfig.HEIGHT / 2, 'Lv.1', {
            fontSize: '14px',
            color: '#ffffff'
        }).setOrigin(0, 0.5);

        return {
            healthBar,
            healthBarBackground,
            healthText,
            experienceBar,
            experienceBarBackground,
            experienceText,
            levelText
        };
    }

    /**
     * Updates the HUD with player data
     */
    updateHUD(
        player: PlayerCombatant,
        hudElements: {
            healthBar: Phaser.GameObjects.Graphics;
            healthBarBackground: Phaser.GameObjects.Graphics;
            healthText: Phaser.GameObjects.Text;
            experienceBar: Phaser.GameObjects.Graphics;
            experienceBarBackground: Phaser.GameObjects.Graphics;
            experienceText: Phaser.GameObjects.Text;
            levelText: Phaser.GameObjects.Text;
        }
    ): void {
        const healthConfig = CLIENT_CONFIG.HUD.HEALTH_BAR;
        const expConfig = CLIENT_CONFIG.HUD.EXPERIENCE_BAR;
        const healthPercent = player.health / player.maxHealth;
        
        // Update health bar
        hudElements.healthBar.clear();
        hudElements.healthBar.fillStyle(healthConfig.HEALTH_COLOR, 1);
        hudElements.healthBar.fillRect(
            healthConfig.X, 
            healthConfig.Y, 
            healthConfig.WIDTH * healthPercent, 
            healthConfig.HEIGHT
        );
        
        // Update health text
        const healthPercentText = Math.round(healthPercent * 100);
        hudElements.healthText.setText(`${healthPercentText}%`);
        
        // Update experience bar
        const experienceNeeded = player.level * 10; // level * 10
        const experiencePercent = player.experience / experienceNeeded;
        
        hudElements.experienceBar.clear();
        hudElements.experienceBar.fillStyle(expConfig.EXPERIENCE_COLOR, 1);
        hudElements.experienceBar.fillRect(
            expConfig.X, 
            expConfig.Y, 
            expConfig.WIDTH * experiencePercent, 
            expConfig.HEIGHT
        );
        
        // Update experience text
        hudElements.experienceText.setText(`${player.experience}/${experienceNeeded} XP`);
        
        // Update level text
        hudElements.levelText.setText(`Lv.${player.level}`);
    }
} 