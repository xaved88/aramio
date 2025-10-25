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
    private redFlashIntensity: number = 0; // 0 = no red flash, 1 = full red flash
    private redFlashTime: number = 0; // Time since red flash started
    private redFlashDuration: number = 600; // Total duration of red flash sequence (ms)

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
     * Triggers a red flash when clicking while ability is on cooldown
     */
    triggerRedFlash(): void {
        this.redFlashIntensity = 1.0;
        this.redFlashTime = 0; // Reset timer
    }

    /**
     * Checks if the ability is currently on cooldown
     */
    isAbilityOnCooldown(): boolean {
        return this.wasOnCooldown;
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

        // Update red flash animation (simple fade)
        if (this.redFlashIntensity > 0) {
            this.redFlashTime += 16; // Assume ~60fps, so ~16ms per frame
            
            // Simple fade out
            const flashProgress = this.redFlashTime / this.redFlashDuration;
            this.redFlashIntensity = Math.max(0, 1.0 - flashProgress);
            
            // Stop when duration is complete
            if (this.redFlashTime >= this.redFlashDuration) {
                this.redFlashIntensity = 0;
                this.redFlashTime = 0;
            }
        }

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
        
        const crosshairSize = 10 + (this.flashIntensity * 4); // Expand when flashing
        const lineThickness = 2;
        const outlineThickness = 3;
        const color = 0xffffff; // White crosshair
        const outlineColor = 0x000000; // Black outline
        // Dim during cooldown, bright with flash effect when ready
        const baseAlpha = isOnCooldown ? 0.4 : 0.9;
        const alpha = baseAlpha + (this.flashIntensity * 0.1); // Slightly brighter when flashing

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

        // Draw red flash ring when clicking on cooldown (simple and visible)
        if (this.redFlashIntensity > 0) {
            const redFlashSize = 30; // Smaller, more reasonable size
            const redFlashAlpha = this.redFlashIntensity; // Full intensity
            const lineWidth = 4; // Thinner but still visible
            
            // Simple, bright red circle
            this.cursorGraphics.lineStyle(lineWidth, 0xff0000, redFlashAlpha);
            this.cursorGraphics.strokeCircle(x, y, redFlashSize / 2);
        }
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
