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

        // Always draw the crosshair cursor
        this.drawCrosshair(mouseX, mouseY);

        if (!hero || hero.state !== 'alive') {
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
    private drawCrosshair(x: number, y: number): void {
        if (!this.cursorGraphics) return;
        
        const crosshairSize = 8;
        const lineThickness = 2;
        const outlineThickness = 3;
        const color = 0xffffff; // White crosshair
        const outlineColor = 0x000000; // Black outline
        const alpha = 0.9;

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
