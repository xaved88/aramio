import Phaser from 'phaser';
import { CLIENT_CONFIG } from '../../ClientConfig';
import { HeroCombatant } from '../../shared/types/CombatantTypes';

/**
 * CursorRenderer handles displaying the crosshair cursor and ability cooldown status
 */
export class CursorRenderer {
    private scene: Phaser.Scene;
    private cursorGraphics: Phaser.GameObjects.Graphics | null = null;
    private cameraManager: any = null;
    private wasOnCooldown: boolean = false;
    private flashIntensity: number = 0; // 0 = no flash, 1 = full flash
    
    // Cooldown pulse effect
    private cooldownPulseIntensity: number = 0; // 0 = no pulse, 1 = full pulse
    private cooldownPulseStartTime: number = 0;
    

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }

    /**
     * Sets the camera manager for proper camera assignment
     */
    setCameraManager(cameraManager: any): void {
        this.cameraManager = cameraManager;
    }

    /**
     * Creates the cursor graphics object
     */
    create(): void {
        this.cursorGraphics = this.scene.add.graphics();
        this.cursorGraphics.setDepth(CLIENT_CONFIG.RENDER_DEPTH.MODALS + 1); // Above everything including modals
        this.cursorGraphics.setScrollFactor(0, 0); // Fixed to screen
        
        // Assign to HUD camera only to prevent showing on main game camera
        if (this.cameraManager) {
            this.cameraManager.assignToHUDCamera(this.cursorGraphics);
        }
    }

    /**
     * Updates the cursor display (crosshair and cooldown indicator) based on hero ability status
     */
    update(hero: HeroCombatant | null, gameTime: number, isAbilityTargeting: boolean = false): void {
        if (!this.cursorGraphics) return;

        this.cursorGraphics.clear();

        // Get current mouse position
        const pointer = this.scene.input.activePointer;
        const mouseX = pointer.x;
        const mouseY = pointer.y;

        // Don't show cooldown indicator in post-game mode
        const gameScene = this.scene as any;
        if (gameScene.lastState?.gamePhase === 'finished') {
            this.drawCrosshair(mouseX, mouseY, false); // Normal visibility in post-game
            return;
        }

        if (!hero || hero.state !== 'alive') {
            this.drawCrosshair(mouseX, mouseY, false); // Normal visibility when dead/no hero
            return; // Don't show cooldown if no hero or hero is dead/respawning
        }

        const config = CLIENT_CONFIG.CURSOR_COOLDOWN_INDICATOR;
        const ability = hero.ability;

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
            this.flashIntensity -= 0.05; // Fade out over ~20 frames at 60fps
            if (this.flashIntensity < 0) this.flashIntensity = 0;
        }

        // Update cooldown pulse effect
        this.updateCooldownPulse();

        // Draw crosshair with reduced visibility if on cooldown
        this.drawCrosshair(mouseX, mouseY, !isAbilityReady);

        if (!isAbilityReady) {
            // Show cooldown progress ring only when ability is on cooldown
            const startAngle = -Math.PI / 2; // Start from top
            const endAngle = startAngle + (2 * Math.PI * cooldownProgress);
            
            this.cursorGraphics.lineStyle(
                config.THICKNESS,
                config.COOLDOWN_COLOR,
                config.ALPHA
            );
            
            // Draw the progress arc
            this.cursorGraphics.beginPath();
            this.cursorGraphics.arc(mouseX, mouseY, config.RADIUS, startAngle, endAngle);
            this.cursorGraphics.strokePath();
        }
        // When ability is ready, don't show any cooldown indicator - just the crosshair
    }

    /**
     * Draws a crosshair cursor at the specified position
     */
    private drawCrosshair(x: number, y: number, isOnCooldown: boolean = false): void {
        if (!this.cursorGraphics) return;
        
        // Calculate size with flash and pulse effects (more prominent base size)
        const baseSize = 12; // Increased from 8 to 12
        const flashSize = this.flashIntensity * 6; // Increased from 4 to 6
        const pulseSize = this.cooldownPulseIntensity * (CLIENT_CONFIG.ABILITY_NOT_READY_FEEDBACK.COOLDOWN_PULSE.MAX_SCALE - 1) * baseSize;
        const crosshairSize = baseSize + flashSize + pulseSize;
        
        const lineThickness = 3; // Increased from 2 to 3
        const outlineThickness = 4; // Increased from 3 to 4
        const color = 0xffffff; // White crosshair
        const outlineColor = 0x000000; // Black outline
        
        // More prominent visibility - full white when ready, even during flash
        const baseAlpha = isOnCooldown ? 0.6 : 1.0; // Dim when on cooldown, full white when ready
        const alpha = isOnCooldown ? baseAlpha : 1.0; // Always full white when not on cooldown, regardless of flash

        // Draw black outline first (thicker)
        this.cursorGraphics.lineStyle(outlineThickness, outlineColor, alpha);
        
        // Draw horizontal line outline
        this.cursorGraphics.beginPath();
        this.cursorGraphics.moveTo(x - crosshairSize, y);
        this.cursorGraphics.lineTo(x + crosshairSize, y);
        this.cursorGraphics.strokePath();
        
        // Draw vertical line outline
        this.cursorGraphics.beginPath();
        this.cursorGraphics.moveTo(x, y - crosshairSize);
        this.cursorGraphics.lineTo(x, y + crosshairSize);
        this.cursorGraphics.strokePath();

        // Draw white crosshair on top (thinner)
        this.cursorGraphics.lineStyle(lineThickness, color, alpha);
        
        // Draw horizontal line
        this.cursorGraphics.beginPath();
        this.cursorGraphics.moveTo(x - crosshairSize, y);
        this.cursorGraphics.lineTo(x + crosshairSize, y);
        this.cursorGraphics.strokePath();
        
        // Draw vertical line
        this.cursorGraphics.beginPath();
        this.cursorGraphics.moveTo(x, y - crosshairSize);
        this.cursorGraphics.lineTo(x, y + crosshairSize);
        this.cursorGraphics.strokePath();

        // Draw cooldown pulse effect (red ring)
        if (this.cooldownPulseIntensity > 0) {
            const config = CLIENT_CONFIG.ABILITY_NOT_READY_FEEDBACK.COOLDOWN_PULSE;
            const pulseRadius = CLIENT_CONFIG.CURSOR_COOLDOWN_INDICATOR.RADIUS + (pulseSize * 0.5);
            
            this.cursorGraphics.lineStyle(
                CLIENT_CONFIG.CURSOR_COOLDOWN_INDICATOR.THICKNESS + 2,
                config.PULSE_COLOR,
                config.PULSE_ALPHA * this.cooldownPulseIntensity
            );
            
            this.cursorGraphics.beginPath();
            this.cursorGraphics.arc(x, y, pulseRadius, 0, Math.PI * 2);
            this.cursorGraphics.strokePath();
        }
    }


    /**
     * Updates the cooldown pulse effect
     */
    private updateCooldownPulse(): void {
        if (this.cooldownPulseIntensity > 0) {
            const config = CLIENT_CONFIG.ABILITY_NOT_READY_FEEDBACK.COOLDOWN_PULSE;
            const elapsed = this.scene.time.now - this.cooldownPulseStartTime;
            const progress = Math.min(elapsed / config.DURATION_MS, 1);
            
            // Use a sine wave for smooth pulse effect
            this.cooldownPulseIntensity = Math.sin(progress * Math.PI) * (1 - progress);
            
            if (progress >= 1) {
                this.cooldownPulseIntensity = 0;
            }
        }
    }

    /**
     * Triggers a cooldown pulse effect when ability is attempted while on cooldown
     */
    triggerCooldownPulse(): void {
        this.cooldownPulseIntensity = 1.0;
        this.cooldownPulseStartTime = this.scene.time.now;
    }

    /**
     * Destroys the cursor graphics
     */
    destroy(): void {
        if (this.cursorGraphics) {
            this.cursorGraphics.destroy();
            this.cursorGraphics = null;
        }
    }
}
