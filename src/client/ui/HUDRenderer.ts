import Phaser from 'phaser';
import { HeroCombatant } from '../../shared/types/CombatantTypes';
import { CLIENT_CONFIG, GAMEPLAY_CONFIG } from '../../Config';
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
        heroKillIcon: Phaser.GameObjects.Graphics;
        heroKillText: Phaser.GameObjects.Text;
        minionKillIcon: Phaser.GameObjects.Graphics;
        minionKillText: Phaser.GameObjects.Text;
    } {
        const healthConfig = CLIENT_CONFIG.HUD.HEALTH_BAR;
        const expConfig = CLIENT_CONFIG.HUD.EXPERIENCE_BAR;
        const abilityConfig = CLIENT_CONFIG.HUD.ABILITY_BAR;
        const killConfig = CLIENT_CONFIG.HUD.KILL_COUNTERS;
        
        // Create health bar background
        const healthBarBackground = this.scene.add.graphics();
        healthBarBackground.fillStyle(healthConfig.BACKGROUND_COLOR, CLIENT_CONFIG.HUD.HEALTH_BAR.BACKGROUND_ALPHA);
        healthBarBackground.fillRect(
            healthConfig.X, 
            healthConfig.Y, 
            healthConfig.WIDTH, 
            healthConfig.HEIGHT
        );
        healthBarBackground.setDepth(CLIENT_CONFIG.RENDER_DEPTH.HUD);
        
        // Create health bar
        const healthBar = this.scene.add.graphics();
        healthBar.setDepth(CLIENT_CONFIG.RENDER_DEPTH.HUD);
        
        // Create health text
        const healthText = this.scene.add.text(healthConfig.X + healthConfig.WIDTH / 2, healthConfig.Y + healthConfig.HEIGHT / 2, '100/100', {
            fontSize: CLIENT_CONFIG.UI.FONTS.MEDIUM,
            color: hexToColorString(healthConfig.TEXT_COLOR)
        }).setOrigin(0.5);
        healthText.setDepth(CLIENT_CONFIG.RENDER_DEPTH.HUD);
        
        // Create experience bar background
        const experienceBarBackground = this.scene.add.graphics();
        experienceBarBackground.fillStyle(expConfig.BACKGROUND_COLOR, CLIENT_CONFIG.HUD.EXPERIENCE_BAR.BACKGROUND_ALPHA);
        experienceBarBackground.fillRect(
            expConfig.X, 
            expConfig.Y, 
            expConfig.WIDTH, 
            expConfig.HEIGHT
        );
        experienceBarBackground.setDepth(CLIENT_CONFIG.RENDER_DEPTH.HUD);
        
        // Create experience bar
        const experienceBar = this.scene.add.graphics();
        experienceBar.setDepth(CLIENT_CONFIG.RENDER_DEPTH.HUD);
        
        // Create experience text
        const experienceText = this.scene.add.text(expConfig.X + expConfig.WIDTH / 2, expConfig.Y + expConfig.HEIGHT / 2, '0/10 XP', {
            fontSize: CLIENT_CONFIG.UI.FONTS.SMALL,
            color: hexToColorString(expConfig.TEXT_COLOR)
        }).setOrigin(0.5);
        experienceText.setDepth(CLIENT_CONFIG.RENDER_DEPTH.HUD);
        
        // Create level text
        const levelText = this.scene.add.text(healthConfig.X + healthConfig.WIDTH + 10, healthConfig.Y + healthConfig.HEIGHT / 2, 'Lv.1', {
            fontSize: CLIENT_CONFIG.HUD.LEVEL_TEXT.FONT_SIZE,
            color: hexToColorString(CLIENT_CONFIG.HUD.LEVEL_TEXT.COLOR)
        }).setOrigin(0, 0.5);
        levelText.setDepth(CLIENT_CONFIG.RENDER_DEPTH.HUD);

        // Create ability bar background
        const abilityBarBackground = this.scene.add.graphics();
        abilityBarBackground.fillStyle(abilityConfig.BACKGROUND_COLOR, abilityConfig.BACKGROUND_ALPHA);
        abilityBarBackground.fillRect(
            abilityConfig.X,
            abilityConfig.Y,
            abilityConfig.WIDTH,
            abilityConfig.HEIGHT
        );
        abilityBarBackground.setDepth(CLIENT_CONFIG.RENDER_DEPTH.HUD);

        // Create ability bar
        const abilityBar = this.scene.add.graphics();
        abilityBar.setDepth(CLIENT_CONFIG.RENDER_DEPTH.HUD);

        // Create hero kill icon (white circle)
        const heroKillIcon = this.scene.add.graphics();
        heroKillIcon.fillStyle(0xffffff, 1);
        heroKillIcon.fillCircle(killConfig.X, killConfig.Y, killConfig.ICON_SIZE / 2);
        heroKillIcon.setDepth(CLIENT_CONFIG.RENDER_DEPTH.HUD);

        // Create hero kill text
        const heroKillText = this.scene.add.text(killConfig.X + killConfig.SPACING, killConfig.Y, '0', {
            fontSize: killConfig.FONT_SIZE,
            color: hexToColorString(killConfig.TEXT_COLOR)
        }).setOrigin(0, 0.5);
        heroKillText.setDepth(CLIENT_CONFIG.RENDER_DEPTH.HUD);

        // Create minion kill icon (diamond) - positioned horizontally next to hero counter
        const minionKillIcon = this.scene.add.graphics();
        minionKillIcon.fillStyle(0xffffff, 1);
        
        // Position minion icon horizontally to the right of hero text
        const minionX = killConfig.X + killConfig.SPACING + 60; // Hero text + some extra space
        const minionY = killConfig.Y; // Same Y as hero icon
        const halfSize = killConfig.ICON_SIZE / 2;
        
        // Draw diamond only
        minionKillIcon.beginPath();
        minionKillIcon.moveTo(minionX, minionY - halfSize);
        minionKillIcon.lineTo(minionX + halfSize, minionY);
        minionKillIcon.lineTo(minionX, minionY + halfSize);
        minionKillIcon.lineTo(minionX - halfSize, minionY);
        minionKillIcon.closePath();
        minionKillIcon.fillPath();
        minionKillIcon.setDepth(CLIENT_CONFIG.RENDER_DEPTH.HUD);

        // Create minion kill text
        const minionKillText = this.scene.add.text(minionX + killConfig.SPACING, minionY, '0', {
            fontSize: killConfig.FONT_SIZE,
            color: hexToColorString(killConfig.TEXT_COLOR)
        }).setOrigin(0, 0.5);
        minionKillText.setDepth(CLIENT_CONFIG.RENDER_DEPTH.HUD);

        return {
            healthBar,
            healthBarBackground,
            healthText,
            experienceBar,
            experienceBarBackground,
            experienceText,
            levelText,
            abilityBar,
            abilityBarBackground,
            heroKillIcon,
            heroKillText,
            minionKillIcon,
            minionKillText
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
            heroKillIcon: Phaser.GameObjects.Graphics;
            heroKillText: Phaser.GameObjects.Text;
            minionKillIcon: Phaser.GameObjects.Graphics;
            minionKillText: Phaser.GameObjects.Text;
        },
        gameTime: number
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
        hudElements.healthText.setText(`${Math.round(player.health)}/${Math.round(player.maxHealth)}`);
        
        // Update experience bar
        const experienceNeeded = player.level * GAMEPLAY_CONFIG.EXPERIENCE.LEVEL_UP_MULTIPLIER;
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
        hudElements.experienceText.setText(`${Math.floor(player.experience)}/${experienceNeeded} XP`);
        
        // Update level text
        hudElements.levelText.setText(`Lv.${player.level}`);

        // Update kill counters
        hudElements.heroKillText.setText(player.roundStats.heroKills.toString());
        hudElements.minionKillText.setText(player.roundStats.minionKills.toString());

        // Update ability bar
        const currentTime = gameTime;
        const ability = player.ability as any;
        
        // If lastUsedTime is 0, the ability hasn't been used yet, so it's ready immediately
        let isAbilityReady = false;
        let timeSinceLastUse = 0;
        if (ability.lastUsedTime === 0) {
            isAbilityReady = true;
            timeSinceLastUse = ability.cooldown; // Show as fully ready
        } else {
            timeSinceLastUse = currentTime - ability.lastUsedTime;
            isAbilityReady = timeSinceLastUse >= ability.cooldown;
        }
        
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
            const cooldownProgress = Math.min(timeSinceLastUse / ability.cooldown, 1);
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
