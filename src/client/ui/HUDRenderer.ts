import Phaser from 'phaser';
import { HeroCombatant } from '../../shared/types/CombatantTypes';
import { CLIENT_CONFIG } from '../../ClientConfig';
import { hexToColorString } from '../utils/ColorUtils';
import { TextStyleHelper } from '../utils/TextStyleHelper';
import { HUDContainer } from './HUDContainer';
import { getCanvasWidth, getCanvasHeight } from '../utils/CanvasSize';

/**
 * HUDRenderer handles all HUD rendering logic
 */
export class HUDRenderer {
    private scene: Phaser.Scene;
    private hudCamera: Phaser.Cameras.Scene2D.Camera | null = null;
    private cameraManager: any = null;
    private hudContainer: HUDContainer | null = null;
    
    // UI Elements
    private healthBarBackground: Phaser.GameObjects.Graphics | null = null;
    private healthBar: Phaser.GameObjects.Graphics | null = null;
    private healthText: Phaser.GameObjects.Text | null = null;
    private xpBackground: Phaser.GameObjects.Graphics | null = null;
    private xpBar: Phaser.GameObjects.Graphics | null = null;
    private levelText: Phaser.GameObjects.Text | null = null;
    private abilityBackground: Phaser.GameObjects.Graphics | null = null;
    private abilityCooldownRing: Phaser.GameObjects.Graphics | null = null;
    private abilityIcon: Phaser.GameObjects.Image | null = null;
    private abilityFlashOverlay: Phaser.GameObjects.Graphics | null = null;
    private rewardsIcon: Phaser.GameObjects.Graphics | null = null;
    private rewardsText: Phaser.GameObjects.Text | null = null;
    
    // Flash effect for ability ready
    private flashIntensity: number = 0;
    private wasOnCooldown: boolean = false;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }
    
    getHUDContainer(): HUDContainer | null {
        return this.hudContainer;
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

    /**
     * Creates all HUD elements
     */
    createHUDElements(): void {
        // Create HUD container
        this.hudContainer = new HUDContainer(this.scene);
        this.hudContainer.setDepth(CLIENT_CONFIG.RENDER_DEPTH.HUD);
        
        if (this.cameraManager) {
            this.hudContainer.setCameraManager(this.cameraManager);
        }
        
        // Create UI elements
        this.createUI();
    }
    
    private createUI(): void {
        this.createHealthBar();
        this.createXPIndicator();
        this.createAbilityCooldown();
        this.createRewardsCounter();
    }
    
    private calculatePositions() {
        const canvasWidth = getCanvasWidth();
        const canvasHeight = getCanvasHeight();
        const spacing = CLIENT_CONFIG.UI.SPACING.BETWEEN_ELEMENTS;
        const fromEdges = CLIENT_CONFIG.UI.SPACING.FROM_EDGES;
        
        const xpDiameter = CLIENT_CONFIG.UI.XP_INDICATOR.RADIUS * 2;
        const healthWidth = CLIENT_CONFIG.UI.HEALTH_BAR.WIDTH;
        const abilitySize = CLIENT_CONFIG.UI.ABILITY_COOLDOWN.SIZE;
        
        // Calculate total width needed for main elements
        const totalWidth = xpDiameter + spacing + healthWidth + spacing + abilitySize;
        const startX = (canvasWidth - totalWidth) / 2;
        
        // Position elements from bottom of screen
        const bottomY = canvasHeight - fromEdges;
        
        // Align circles with health bar center
        const healthX = startX + xpDiameter + spacing;
        const healthY = bottomY - CLIENT_CONFIG.UI.HEALTH_BAR.HEIGHT;
        const healthCenterY = healthY + CLIENT_CONFIG.UI.HEALTH_BAR.HEIGHT / 2;
        
        const xpX = startX + CLIENT_CONFIG.UI.XP_INDICATOR.RADIUS;
        const xpY = healthCenterY;
        
        const abilityX = startX + xpDiameter + spacing + healthWidth + spacing + abilitySize / 2;
        const abilityY = healthCenterY;
        
        // Position rewards counter centered above the XP indicator
        const rewardsX = xpX; // Center horizontally with XP circle
        const rewardsY = xpY - CLIENT_CONFIG.UI.XP_INDICATOR.RADIUS - 20;
        
        return { startX, xpX, xpY, healthX, healthY, abilityX, abilityY, rewardsX, rewardsY };
    }
    
    private createHealthBar(): void {
        const config = CLIENT_CONFIG.UI.HEALTH_BAR;
        const positions = this.calculatePositions();
        
        const x = positions.healthX;
        const y = positions.healthY;
        
        // Health bar background
        this.healthBarBackground = this.scene.add.graphics();
        this.healthBarBackground.fillStyle(config.BACKGROUND_COLOR, config.BACKGROUND_ALPHA);
        this.healthBarBackground.fillRect(x, y, config.WIDTH, config.HEIGHT);
        this.healthBarBackground.setDepth(CLIENT_CONFIG.RENDER_DEPTH.HUD);
        this.healthBarBackground.setScrollFactor(0, 0);
        this.hudContainer!.add(this.healthBarBackground);
        
        // Health bar
        this.healthBar = this.scene.add.graphics();
        this.healthBar.setDepth(CLIENT_CONFIG.RENDER_DEPTH.HUD);
        this.healthBar.setScrollFactor(0, 0);
        this.hudContainer!.add(this.healthBar);
        
        // Health text
        this.healthText = this.scene.add.text(x + config.WIDTH / 2, y + config.HEIGHT / 2, '100 / 100', 
            TextStyleHelper.getStyleWithCustom('HUD_TEXT', {
                color: hexToColorString(config.TEXT_COLOR),
                fontSize: config.FONT_SIZE,
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
        this.healthText.setDepth(CLIENT_CONFIG.RENDER_DEPTH.HUD);
        this.healthText.setScrollFactor(0, 0);
        this.hudContainer!.add(this.healthText);
    }
    
    private createXPIndicator(): void {
        const config = CLIENT_CONFIG.UI.XP_INDICATOR;
        const positions = this.calculatePositions();
        
        const x = positions.xpX;
        const y = positions.xpY;
        
        // XP background circle
        this.xpBackground = this.scene.add.graphics();
        this.xpBackground.lineStyle(config.LINE_WIDTH, config.BACKGROUND_COLOR, config.BACKGROUND_ALPHA);
        this.xpBackground.strokeCircle(x, y, config.RADIUS);
        this.xpBackground.setDepth(CLIENT_CONFIG.RENDER_DEPTH.HUD);
        this.xpBackground.setScrollFactor(0, 0);
        this.hudContainer!.add(this.xpBackground);
        
        // XP progress bar
        this.xpBar = this.scene.add.graphics();
        this.xpBar.setDepth(CLIENT_CONFIG.RENDER_DEPTH.HUD);
        this.xpBar.setScrollFactor(0, 0);
        this.hudContainer!.add(this.xpBar);
        
        // Level text
        this.levelText = this.scene.add.text(x, y, '1', 
            TextStyleHelper.getStyleWithCustom('HUD_TEXT', {
                color: hexToColorString(config.TEXT_COLOR),
                fontSize: config.FONT_SIZE,
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
        this.levelText.setDepth(CLIENT_CONFIG.RENDER_DEPTH.HUD);
        this.levelText.setScrollFactor(0, 0);
        this.hudContainer!.add(this.levelText);
    }
    
    private createAbilityCooldown(): void {
        const config = CLIENT_CONFIG.UI.ABILITY_COOLDOWN;
        const positions = this.calculatePositions();
        
        const x = positions.abilityX;
        const y = positions.abilityY;
        
        // Ability background
        this.abilityBackground = this.scene.add.graphics();
        this.abilityBackground.fillStyle(config.BACKGROUND_COLOR, config.BACKGROUND_ALPHA);
        this.abilityBackground.fillCircle(x, y, config.SIZE / 2);
        this.abilityBackground.setDepth(CLIENT_CONFIG.RENDER_DEPTH.HUD);
        this.abilityBackground.setScrollFactor(0, 0);
        this.hudContainer!.add(this.abilityBackground);
        
        // Cooldown ring
        this.abilityCooldownRing = this.scene.add.graphics();
        this.abilityCooldownRing.setDepth(CLIENT_CONFIG.RENDER_DEPTH.HUD);
        this.abilityCooldownRing.setScrollFactor(0, 0);
        this.hudContainer!.add(this.abilityCooldownRing);
        
        // Ability icon (will be set when hero data is available)
        this.abilityIcon = this.scene.add.image(x, y, 'missing_texture');
        this.abilityIcon.setScale(config.ICON_SCALE);
        this.abilityIcon.setDepth(CLIENT_CONFIG.RENDER_DEPTH.HUD + 1);
        this.abilityIcon.setScrollFactor(0, 0);
        this.hudContainer!.add(this.abilityIcon);
        
        // Create white flash overlay
        this.abilityFlashOverlay = this.scene.add.graphics();
        this.abilityFlashOverlay.setDepth(CLIENT_CONFIG.RENDER_DEPTH.HUD + 2);
        this.abilityFlashOverlay.setScrollFactor(0, 0);
        this.hudContainer!.add(this.abilityFlashOverlay);
    }
    
    private createRewardsCounter(): void {
        const config = CLIENT_CONFIG.UI.REWARDS_COUNTER;
        const positions = this.calculatePositions();
        
        const x = positions.rewardsX;
        const y = positions.rewardsY;
        const iconSize = config.ICON_SIZE;
        const halfSize = iconSize / 2;
        
        // Create rewards icon (gift box outline)
        this.rewardsIcon = this.scene.add.graphics();
        this.rewardsIcon.lineStyle(2, config.ICON_COLOR, 1);
        
        // Draw gift box outline
        this.rewardsIcon.strokeRect(-halfSize, -halfSize, iconSize, iconSize);
        
        // Ribbon/bow (vertical line)
        this.rewardsIcon.beginPath();
        this.rewardsIcon.moveTo(0, -halfSize);
        this.rewardsIcon.lineTo(0, +halfSize);
        this.rewardsIcon.strokePath();
        
        // Ribbon/bow (horizontal line)
        this.rewardsIcon.beginPath();
        this.rewardsIcon.moveTo(-halfSize, 0);
        this.rewardsIcon.lineTo(+halfSize, 0);
        this.rewardsIcon.strokePath();
        
        // Bow on top (inverted V shape)
        this.rewardsIcon.beginPath();
        this.rewardsIcon.moveTo(-halfSize / 2, -halfSize - 4);
        this.rewardsIcon.lineTo(0, -halfSize - 2);
        this.rewardsIcon.lineTo(+halfSize / 2, -halfSize - 4);
        this.rewardsIcon.strokePath();
        
        this.rewardsIcon.setDepth(CLIENT_CONFIG.RENDER_DEPTH.HUD);
        this.rewardsIcon.setScrollFactor(0, 0);
        this.hudContainer!.add(this.rewardsIcon);

        // Create rewards text
        this.rewardsText = this.scene.add.text(0, 0, '0', 
            TextStyleHelper.getStyleWithCustom('HUD_TEXT', {
                color: hexToColorString(config.TEXT_COLOR),
                fontSize: config.FONT_SIZE,
            shadow: {
                offsetX: 1,
                offsetY: 1,
                color: '#000000',
                blur: 2,
                    stroke: true,
                fill: true
            }
            })
        ).setOrigin(0, 0.5);
        
        // Center the entire rewards group above the XP circle
        const textWidth = this.rewardsText.width;
        const totalRewardsWidth = iconSize + config.SPACING + textWidth;
        const centeredX = x - totalRewardsWidth / 2;
        
        // Position both elements centered
        this.rewardsIcon.x = centeredX + iconSize / 2;
        this.rewardsIcon.y = y;
        this.rewardsText.x = centeredX + iconSize + config.SPACING;
        this.rewardsText.y = y;
        this.rewardsText.setDepth(CLIENT_CONFIG.RENDER_DEPTH.HUD);
        this.rewardsText.setScrollFactor(0, 0);
        this.hudContainer!.add(this.rewardsText);
    }

    /**
     * Updates the HUD with player data
     */
    updateHUD(
        player: HeroCombatant,
        gameTime: number
    ): void {
        // All HUD elements are now managed internally
        
        // Update UI elements
        this.updateUI(player, gameTime);
    }
    
    private updateUI(player: HeroCombatant, gameTime: number): void {
        this.updateHealthBar(player);
        this.updateXPIndicator(player);
        this.updateAbilityCooldown(player, gameTime);
        this.updateRewardsCounter(player);
    }
    
    private updateHealthBar(player: HeroCombatant): void {
        if (!this.healthBar || !this.healthText) return;

        const config = CLIENT_CONFIG.UI.HEALTH_BAR;
        const positions = this.calculatePositions();
        
        const x = positions.healthX;
        const y = positions.healthY;
        
        const healthPercent = player.health / player.maxHealth;
        const healthBarWidth = config.WIDTH * healthPercent;
        
        this.healthBar.clear();
        this.healthBar.fillStyle(config.HEALTH_COLOR, 1);
        this.healthBar.fillRect(x, y, healthBarWidth, config.HEIGHT);
        
        this.healthText.setText(`${Math.round(player.health).toLocaleString()} / ${Math.round(player.maxHealth).toLocaleString()}`);
    }
    
    private updateXPIndicator(player: HeroCombatant): void {
        if (!this.xpBar || !this.levelText) return;

        const config = CLIENT_CONFIG.UI.XP_INDICATOR;
        const positions = this.calculatePositions();
        
        const x = positions.xpX;
        const y = positions.xpY;
        
        const xpPercent = player.experience / player.experienceNeeded;
        const startAngle = -Math.PI / 2; // Start from top
        const endAngle = startAngle + (2 * Math.PI * xpPercent);
        
        this.xpBar.clear();
        this.xpBar.lineStyle(config.LINE_WIDTH, config.EXPERIENCE_COLOR, 1);
        this.xpBar.beginPath();
        this.xpBar.arc(x, y, config.RADIUS, startAngle, endAngle);
        this.xpBar.strokePath();
        
        this.levelText.setText(player.level.toString());
    }
    
    private updateAbilityCooldown(player: HeroCombatant, gameTime: number): void {
        if (!this.abilityCooldownRing || !this.abilityIcon) return;

        const config = CLIENT_CONFIG.UI.ABILITY_COOLDOWN;
        const ability = player.ability;
        const positions = this.calculatePositions();
        
        const abilityX = positions.abilityX;
        const abilityY = positions.abilityY;
        
        // Update ability icon based on type
        this.updateAbilityIcon(ability.type);
        
        // Check if ability is ready
        let isAbilityReady = false;
        let cooldownProgress = 0;
        
        if (ability.lastUsedTime === 0) {
            isAbilityReady = true;
            cooldownProgress = 1;
        } else {
            const timeSinceLastUse = gameTime - ability.lastUsedTime;
            isAbilityReady = timeSinceLastUse >= ability.cooldown;
            cooldownProgress = Math.min(timeSinceLastUse / ability.cooldown, 1);
        }

        // Detect cooldown -> ready transition and trigger flash
        if (this.wasOnCooldown && isAbilityReady) {
            this.flashIntensity = 1.0;
        }
        this.wasOnCooldown = !isAbilityReady;
        
        // Decay flash intensity
        if (this.flashIntensity > 0) {
            this.flashIntensity -= 0.1;
            if (this.flashIntensity < 0) this.flashIntensity = 0;
        }

        // Update cooldown ring
        this.abilityCooldownRing.clear();
        
        if (!isAbilityReady) {
            // Show cooldown progress ring
            const startAngle = -Math.PI / 2; // Start from top
            const endAngle = startAngle + (2 * Math.PI * cooldownProgress);
            
            this.abilityCooldownRing.lineStyle(4, config.COOLDOWN_COLOR, 0.8);
            this.abilityCooldownRing.beginPath();
            this.abilityCooldownRing.arc(
                abilityX, 
                abilityY, 
                config.SIZE / 2, 
                startAngle, 
                endAngle
            );
            this.abilityCooldownRing.strokePath();
        } else {
            // Show white ring when ready with pulsing effect
            const pulseIntensity = 0.3 + 0.2 * Math.sin(gameTime * 0.005);
            const ringAlpha = 0.4 + pulseIntensity;
            const ringThickness = 2 + pulseIntensity;
            
            this.abilityCooldownRing.lineStyle(ringThickness, 0xffffff, ringAlpha);
            this.abilityCooldownRing.beginPath();
            this.abilityCooldownRing.arc(
                abilityX, 
                abilityY, 
                config.SIZE / 2 + 2,
                0, 
                2 * Math.PI
            );
            this.abilityCooldownRing.strokePath();
        }
        
        // Update white flash overlay
        if (this.abilityFlashOverlay) {
            this.abilityFlashOverlay.clear();
            
            if (isAbilityReady && this.flashIntensity > 0) {
                const flashSize = config.SIZE; // Match full ability icon size
                const flashAlpha = this.flashIntensity * 0.8; // Only fade alpha
                
                this.abilityFlashOverlay.fillStyle(0xffffff, flashAlpha);
                this.abilityFlashOverlay.fillCircle(abilityX, abilityY, flashSize / 2);
            }
        }
        
        // Apply highlighting
        if (isAbilityReady) {
            const flashScale = config.ICON_SCALE + (this.flashIntensity * 0.4);
            this.abilityIcon.setAlpha(1.0);
            this.abilityIcon.setScale(flashScale);
            this.abilityIcon.clearTint();
        } else {
            this.abilityIcon.setAlpha(0.5);
            this.abilityIcon.setScale(config.ICON_SCALE);
            this.abilityIcon.clearTint();
        }
    }
    
    private updateAbilityIcon(abilityType: string): void {
        if (!this.abilityIcon) return;

        const iconKey = `icon_ability:${abilityType}`;
        
        if (this.scene.textures.exists(iconKey)) {
            this.abilityIcon.setTexture(iconKey);
        } else {
            const defaultKey = `icon_ability:default`;
            if (this.scene.textures.exists(defaultKey)) {
                this.abilityIcon.setTexture(defaultKey);
            } else {
                const fallbackKey = `ability_fallback_${abilityType}`;
                if (!this.scene.textures.exists(fallbackKey)) {
                    const graphics = this.scene.add.graphics();
                    graphics.fillStyle(0x9b59b6, 0.8);
                    graphics.fillCircle(25, 25, 25);
                    graphics.lineStyle(2, 0xffffff);
                    graphics.strokeCircle(25, 25, 25);
                    graphics.generateTexture(fallbackKey, 50, 50);
                    graphics.destroy();
                }
                this.abilityIcon.setTexture(fallbackKey);
            }
        }
    }
    
    private updateRewardsCounter(player: HeroCombatant): void {
        if (!this.rewardsText || !this.rewardsIcon) return;
        
        const rewardsCount = player.levelRewards ? player.levelRewards.length : 0;
        
        if (rewardsCount > 0) {
            this.rewardsText.setText(rewardsCount.toString());
            this.rewardsText.setVisible(true);
            this.rewardsIcon.setVisible(true);
            
            // Add subtle pulsing animation
            if (!this.rewardsIcon.getData('isPulsing')) {
                this.rewardsIcon.setData('isPulsing', true);
                
                this.scene.tweens.add({
                    targets: [this.rewardsIcon],
                    scaleX: 1.02,
                    scaleY: 1.02,
                    duration: 2000,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });
            }
        } else {
            this.rewardsText.setVisible(false);
            this.rewardsIcon.setVisible(false);
            this.scene.tweens.killTweensOf([this.rewardsIcon]);
            this.rewardsIcon.setData('isPulsing', false);
        }
    }

} 
