import Phaser from 'phaser';
import { HeroCombatant } from '../../shared/types/CombatantTypes';
import { CLIENT_CONFIG } from '../../Config';
import { hexToColorString } from '../utils/ColorUtils';

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
        abilityBar: Phaser.GameObjects.Graphics;
        abilityBarBackground: Phaser.GameObjects.Graphics;
    } {
        const healthConfig = CLIENT_CONFIG.HUD.HEALTH_BAR;
        const expConfig = CLIENT_CONFIG.HUD.EXPERIENCE_BAR;
        const abilityConfig = CLIENT_CONFIG.HUD.ABILITY_BAR;
        
        // Create health bar background
        const healthBarBackground = this.scene.add.graphics();
        healthBarBackground.fillStyle(healthConfig.BACKGROUND_COLOR, CLIENT_CONFIG.HUD.HEALTH_BAR.BACKGROUND_ALPHA);
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
            fontSize: CLIENT_CONFIG.UI.FONTS.MEDIUM,
            color: hexToColorString(healthConfig.TEXT_COLOR)
        }).setOrigin(0.5);
        
        // Create experience bar background
        const experienceBarBackground = this.scene.add.graphics();
        experienceBarBackground.fillStyle(expConfig.BACKGROUND_COLOR, CLIENT_CONFIG.HUD.EXPERIENCE_BAR.BACKGROUND_ALPHA);
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
            fontSize: CLIENT_CONFIG.UI.FONTS.SMALL,
            color: hexToColorString(expConfig.TEXT_COLOR)
        }).setOrigin(0.5);
        
        // Create level text
        const levelText = this.scene.add.text(healthConfig.X + healthConfig.WIDTH + 10, healthConfig.Y + healthConfig.HEIGHT / 2, 'Lv.1', {
            fontSize: CLIENT_CONFIG.HUD.LEVEL_TEXT.FONT_SIZE,
            color: hexToColorString(CLIENT_CONFIG.HUD.LEVEL_TEXT.COLOR)
        }).setOrigin(0, 0.5);

        // Create ability bar background
        const abilityBarBackground = this.scene.add.graphics();
        abilityBarBackground.fillStyle(abilityConfig.BACKGROUND_COLOR, abilityConfig.BACKGROUND_ALPHA);
        abilityBarBackground.fillRect(
            abilityConfig.X,
            abilityConfig.Y,
            abilityConfig.WIDTH,
            abilityConfig.HEIGHT
        );

        // Create ability bar
        const abilityBar = this.scene.add.graphics();

        return {
            healthBar,
            healthBarBackground,
            healthText,
            experienceBar,
            experienceBarBackground,
            experienceText,
            levelText,
            abilityBar,
            abilityBarBackground
        };
    }

    /**
     * Updates the HUD with player data
     */
    updateHUD(
        player: HeroCombatant,
        hudElements: {
            healthBar: Phaser.GameObjects.Graphics;
            healthBarBackground: Phaser.GameObjects.Graphics;
            healthText: Phaser.GameObjects.Text;
            experienceBar: Phaser.GameObjects.Graphics;
            experienceBarBackground: Phaser.GameObjects.Graphics;
            experienceText: Phaser.GameObjects.Text;
            levelText: Phaser.GameObjects.Text;
            abilityBar: Phaser.GameObjects.Graphics;
            abilityBarBackground: Phaser.GameObjects.Graphics;
        }
    ): void {
        const healthConfig = CLIENT_CONFIG.HUD.HEALTH_BAR;
        const expConfig = CLIENT_CONFIG.HUD.EXPERIENCE_BAR;
        const abilityConfig = CLIENT_CONFIG.HUD.ABILITY_BAR;
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

        // Update ability bar
        const currentTime = Date.now();
        const timeSinceLastUse = currentTime - player.ability.lastUsedTime;
        const isAbilityReady = timeSinceLastUse >= player.ability.cooldown;
        
        hudElements.abilityBar.clear();
        
        if (isAbilityReady) {
            // Ability is ready - fill bar with lighter color
            hudElements.abilityBar.fillStyle(abilityConfig.READY_COLOR, 1);
            hudElements.abilityBar.fillRect(
                abilityConfig.X,
                abilityConfig.Y,
                abilityConfig.WIDTH,
                abilityConfig.HEIGHT
            );
            
            // Make health text bold when ability is ready
            hudElements.healthText.setStyle({ 
                fontSize: CLIENT_CONFIG.UI.FONTS.MEDIUM,
                color: hexToColorString(healthConfig.TEXT_COLOR),
                fontStyle: 'bold'
            });
        } else {
            // Ability is on cooldown - fill bar based on progress
            const cooldownProgress = Math.min(timeSinceLastUse / player.ability.cooldown, 1);
            const fillHeight = abilityConfig.HEIGHT * cooldownProgress;
            
            hudElements.abilityBar.fillStyle(abilityConfig.COOLDOWN_COLOR, 1);
            hudElements.abilityBar.fillRect(
                abilityConfig.X,
                abilityConfig.Y + abilityConfig.HEIGHT - fillHeight, // Fill from bottom up
                abilityConfig.WIDTH,
                fillHeight
            );
            
            // Reset health text to normal when ability is on cooldown
            hudElements.healthText.setStyle({ 
                fontSize: CLIENT_CONFIG.UI.FONTS.MEDIUM,
                color: hexToColorString(healthConfig.TEXT_COLOR),
                fontStyle: 'normal'
            });
        }
    }
} 
