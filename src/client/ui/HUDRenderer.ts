import Phaser from 'phaser';
import { HeroCombatant } from '../../shared/types/CombatantTypes';
import { CLIENT_CONFIG } from '../../ClientConfig';
import { hexToColorString } from '../utils/ColorUtils';
import { TextStyleHelper } from '../utils/TextStyleHelper';
import { HUDContainer } from './HUDContainer';

/**
 * HUDRenderer handles all HUD rendering logic
 */
export class HUDRenderer {
    private scene: Phaser.Scene;
    private hudCamera: Phaser.Cameras.Scene2D.Camera | null = null;
    private cameraManager: any = null;
    private hudContainer: HUDContainer | null = null;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }

    setHUDCamera(hudCamera: Phaser.Cameras.Scene2D.Camera): void {
        this.hudCamera = hudCamera;
    }

    setCameraManager(cameraManager: any): void {
        this.cameraManager = cameraManager;
        if (this.hudContainer) {
            this.hudContainer.setCameraManager(cameraManager);
        }
    }

    getHUDContainer(): HUDContainer | null {
        return this.hudContainer;
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
        levelText: Phaser.GameObjects.Text;
        heroKillIcon: Phaser.GameObjects.Graphics;
        heroKillText: Phaser.GameObjects.Text;
        minionKillIcon: Phaser.GameObjects.Graphics;
        minionKillText: Phaser.GameObjects.Text;
        rewardsIcon: Phaser.GameObjects.Graphics;
        rewardsText: Phaser.GameObjects.Text;
    } {
        // Create HUD container
        this.hudContainer = new HUDContainer(this.scene);
        this.hudContainer.setDepth(CLIENT_CONFIG.RENDER_DEPTH.HUD);
        
        if (this.cameraManager) {
            this.hudContainer.setCameraManager(this.cameraManager);
        }
        
        const healthConfig = CLIENT_CONFIG.HUD.HEALTH_BAR;
        const levelConfig = CLIENT_CONFIG.HUD.LEVEL_INDICATOR;
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
        healthBarBackground.setScrollFactor(0, 0); // Fixed to screen
        this.hudContainer!.add(healthBarBackground);
        
        // Create health bar
        const healthBar = this.scene.add.graphics();
        healthBar.setDepth(CLIENT_CONFIG.RENDER_DEPTH.HUD);
        healthBar.setScrollFactor(0, 0); // Fixed to screen
        this.hudContainer!.add(healthBar);
        
        // Create health text
        const healthText = this.scene.add.text(healthConfig.X + healthConfig.WIDTH / 2, healthConfig.Y + healthConfig.HEIGHT / 2, 'XXX / YYY', 
            TextStyleHelper.getStyleWithCustom('HUD_TEXT', {
                color: hexToColorString(healthConfig.TEXT_COLOR),
                shadow: {
                    offsetX: 1,
                    offsetY: 1,
                    color: '#000000',
                    blur: 2,
                    stroke: true,
                    fill: true
                }
            })
        ).setOrigin(0.5);
        healthText.setDepth(CLIENT_CONFIG.RENDER_DEPTH.HUD);
        healthText.setScrollFactor(0, 0); // Fixed to screen
        this.hudContainer!.add(healthText);
        
        // Create circular XP bar background (dark circle)
        const experienceBarBackground = this.scene.add.graphics();
        const circleRadius = levelConfig.RADIUS;
        const circleX = levelConfig.X + circleRadius;
        const circleY = levelConfig.Y + circleRadius;
        
        experienceBarBackground.lineStyle(levelConfig.LINE_WIDTH, levelConfig.BACKGROUND_COLOR, levelConfig.BACKGROUND_ALPHA);
        experienceBarBackground.strokeCircle(circleX, circleY, circleRadius);
        experienceBarBackground.setDepth(CLIENT_CONFIG.RENDER_DEPTH.HUD);
        experienceBarBackground.setScrollFactor(0, 0); // Fixed to screen
        this.hudContainer!.add(experienceBarBackground);
        
        // Create circular XP bar (progress indicator)
        const experienceBar = this.scene.add.graphics();
        experienceBar.setDepth(CLIENT_CONFIG.RENDER_DEPTH.HUD);
        experienceBar.setScrollFactor(0, 0); // Fixed to screen
        this.hudContainer!.add(experienceBar);
        
        // Create level text (centered in the circular XP bar)
        const levelText = this.scene.add.text(circleX, circleY, '1', {
            fontSize: CLIENT_CONFIG.HUD.LEVEL_TEXT.FONT_SIZE,
            fontFamily: CLIENT_CONFIG.UI.FONTS.PRIMARY,
            color: hexToColorString(CLIENT_CONFIG.HUD.LEVEL_TEXT.COLOR),
            stroke: '#000000',
            strokeThickness: 1,
            shadow: {
                offsetX: 1,
                offsetY: 1,
                color: '#000000',
                blur: 2,
                stroke: true,
                fill: true
            }
        }).setOrigin(0.5, 0.5);
        levelText.setDepth(CLIENT_CONFIG.RENDER_DEPTH.HUD);
        levelText.setScrollFactor(0, 0); // Fixed to screen
        this.hudContainer!.add(levelText);


        // Create hero kill icon (white circle)
        const heroKillIcon = this.scene.add.graphics();
        heroKillIcon.fillStyle(0xffffff, 1);
        heroKillIcon.fillCircle(killConfig.X, killConfig.Y, killConfig.ICON_SIZE / 2);
        heroKillIcon.setDepth(CLIENT_CONFIG.RENDER_DEPTH.HUD);
        heroKillIcon.setScrollFactor(0, 0); // Fixed to screen
        this.hudContainer!.add(heroKillIcon);

        // Create hero kill text
        const heroKillText = this.scene.add.text(killConfig.X + killConfig.SPACING, killConfig.Y, '0', {
            fontSize: killConfig.FONT_SIZE,
            color: hexToColorString(killConfig.TEXT_COLOR),
            shadow: {
                offsetX: 1,
                offsetY: 1,
                color: '#000000',
                blur: 2,
                stroke: true,
                fill: true
            }
        }).setOrigin(0, 0.5);
        heroKillText.setDepth(CLIENT_CONFIG.RENDER_DEPTH.HUD);
        heroKillText.setScrollFactor(0, 0); // Fixed to screen
        this.hudContainer!.add(heroKillText);

        // Create minion kill icon (diamond) - positioned horizontally next to hero counter
        const minionKillIcon = this.scene.add.graphics();
        minionKillIcon.fillStyle(0xffffff, 1);
        
        // Position minion icon horizontally to the right of hero text
        const minionX = killConfig.X + killConfig.SPACING + 40; // Reduced from 60 to 40
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
        minionKillIcon.setScrollFactor(0, 0); // Fixed to screen
        this.hudContainer!.add(minionKillIcon);

        // Create minion kill text
        const minionKillText = this.scene.add.text(minionX + killConfig.SPACING, minionY, '0', {
            fontSize: killConfig.FONT_SIZE,
            color: hexToColorString(killConfig.TEXT_COLOR),
            shadow: {
                offsetX: 1,
                offsetY: 1,
                color: '#000000',
                blur: 2,
                stroke: true,
                fill: true
            }
        }).setOrigin(0, 0.5);
        minionKillText.setDepth(CLIENT_CONFIG.RENDER_DEPTH.HUD);
        minionKillText.setScrollFactor(0, 0); // Fixed to screen
        this.hudContainer!.add(minionKillText);

        // Create rewards counter configuration
        const rewardsConfig = CLIENT_CONFIG.HUD.REWARDS_COUNTER;
        
        // Create rewards icon (gift box outline)
        const rewardsIcon = this.scene.add.graphics();
        rewardsIcon.lineStyle(2, rewardsConfig.ICON_COLOR, 1);
        
        // Position rewards icon centered under level indicator
        const rewardsIconX = rewardsConfig.X - rewardsConfig.SPACING / 2; // Center icon to the left
        const rewardsTextX = rewardsConfig.X + rewardsConfig.SPACING / 2 + 8; // Center text to the right with more spacing
        const rewardsY = rewardsConfig.Y;
        const rewardsSize = rewardsConfig.ICON_SIZE;
        const rewardsHalfSize = rewardsSize / 2;
        
        // Draw gift box outline
        // Main box
        rewardsIcon.strokeRect(rewardsIconX - rewardsHalfSize, rewardsY - rewardsHalfSize, rewardsSize, rewardsSize);
        
        // Ribbon/bow (vertical line)
        rewardsIcon.beginPath();
        rewardsIcon.moveTo(rewardsIconX, rewardsY - rewardsHalfSize);
        rewardsIcon.lineTo(rewardsIconX, rewardsY + rewardsHalfSize);
        rewardsIcon.strokePath();
        
        // Ribbon/bow (horizontal line)
        rewardsIcon.beginPath();
        rewardsIcon.moveTo(rewardsIconX - rewardsHalfSize, rewardsY);
        rewardsIcon.lineTo(rewardsIconX + rewardsHalfSize, rewardsY);
        rewardsIcon.strokePath();
        
        // Bow on top (inverted V shape)
        rewardsIcon.beginPath();
        rewardsIcon.moveTo(rewardsIconX - rewardsHalfSize / 2, rewardsY - rewardsHalfSize - 4);
        rewardsIcon.lineTo(rewardsIconX, rewardsY - rewardsHalfSize - 2);
        rewardsIcon.lineTo(rewardsIconX + rewardsHalfSize / 2, rewardsY - rewardsHalfSize - 4);
        rewardsIcon.strokePath();
        rewardsIcon.setDepth(CLIENT_CONFIG.RENDER_DEPTH.HUD);
        rewardsIcon.setScrollFactor(0, 0); // Fixed to screen
        this.hudContainer!.add(rewardsIcon);

        // Create rewards text
        const rewardsText = this.scene.add.text(rewardsTextX, rewardsY, '0', {
            fontSize: rewardsConfig.FONT_SIZE,
            color: hexToColorString(rewardsConfig.TEXT_COLOR),
            shadow: {
                offsetX: 1,
                offsetY: 1,
                color: '#000000',
                blur: 2,
                stroke: false,
                fill: true
            }
        }).setOrigin(0.5, 0.5);
        rewardsText.setDepth(CLIENT_CONFIG.RENDER_DEPTH.HUD);
        rewardsText.setScrollFactor(0, 0); // Fixed to screen
        this.hudContainer!.add(rewardsText);

        return {
            healthBar,
            healthBarBackground,
            healthText,
            experienceBar,
            experienceBarBackground,
            levelText,
            heroKillIcon,
            heroKillText,
            minionKillIcon,
            minionKillText,
            rewardsIcon,
            rewardsText
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
            levelText: Phaser.GameObjects.Text;
            heroKillIcon: Phaser.GameObjects.Graphics;
            heroKillText: Phaser.GameObjects.Text;
            minionKillIcon: Phaser.GameObjects.Graphics;
            minionKillText: Phaser.GameObjects.Text;
            rewardsIcon: Phaser.GameObjects.Graphics;
            rewardsText: Phaser.GameObjects.Text;
        },
        gameTime: number
    ): void {
        const healthConfig = CLIENT_CONFIG.HUD.HEALTH_BAR;
        const levelConfig = CLIENT_CONFIG.HUD.LEVEL_INDICATOR;
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
        
        // Update health text with thousand separators
        const currentHealth = Math.round(player.health).toLocaleString();
        const maxHealth = Math.round(player.maxHealth).toLocaleString();
        hudElements.healthText.setText(`${currentHealth} / ${maxHealth}`);
        
        // Update circular experience bar
        const experiencePercent = player.experience / player.experienceNeeded;
        
        hudElements.experienceBar.clear();
        const circleRadius = levelConfig.RADIUS;
        const circleX = levelConfig.X + circleRadius;
        const circleY = levelConfig.Y + circleRadius;
        
        // Draw circular progress (gold arc)
        hudElements.experienceBar.lineStyle(levelConfig.LINE_WIDTH, levelConfig.EXPERIENCE_COLOR, 1);
        hudElements.experienceBar.beginPath();
        hudElements.experienceBar.arc(circleX, circleY, circleRadius, -Math.PI / 2, -Math.PI / 2 + (2 * Math.PI * experiencePercent), false);
        hudElements.experienceBar.strokePath();
        
        // No experience text to update - removed XP counter
        
        // Update level text
        hudElements.levelText.setText(`${player.level}`);

        // Update kill counters
        // hudElements.heroKillText.setText(player.roundStats.heroKills.toString());
        // hudElements.minionKillText.setText(player.roundStats.minionKills.toString());
        
        // Hide kill counters
        hudElements.heroKillText.setVisible(false);
        hudElements.heroKillIcon.setVisible(false);
        hudElements.minionKillText.setVisible(false);
        hudElements.minionKillIcon.setVisible(false);

        // Update rewards counter (hide if 0, add pulse animation)
        const rewardsCount = player.levelRewards.length;
        if (rewardsCount > 0) {
            hudElements.rewardsText.setText(rewardsCount.toString());
            hudElements.rewardsText.setVisible(true);
            hudElements.rewardsIcon.setVisible(true);
            
            // Add very subtle pulsing animation (icon only)
            if (!hudElements.rewardsIcon.getData('isPulsing')) {
                hudElements.rewardsIcon.setData('isPulsing', true);
                
                this.scene.tweens.add({
                    targets: [hudElements.rewardsIcon],
                    scaleX: 1.02,
                    scaleY: 1.02,
                    duration: 2000,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });
            }
        } else {
            hudElements.rewardsText.setVisible(false);
            hudElements.rewardsIcon.setVisible(false);
            // Stop any existing animation and reset pulsing data
            this.scene.tweens.killTweensOf([hudElements.rewardsIcon]);
            hudElements.rewardsIcon.setData('isPulsing', false);
        }
    }

} 
