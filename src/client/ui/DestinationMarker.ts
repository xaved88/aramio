import Phaser from 'phaser';
import { CLIENT_CONFIG } from '../../ClientConfig';

/**
 * Manages the destination marker animation for MOBA controls
 * Handles all graphics, animations, and cleanup as a single unit
 */
export class DestinationMarker {
    private scene: Phaser.Scene;
    private cameraManager: any;
    private activeGraphics: Phaser.GameObjects.Graphics[] = [];
    private activeTweens: Phaser.Tweens.Tween[] = [];
    private activeTimeouts: NodeJS.Timeout[] = [];
    private isAnimating: boolean = false;

    constructor(scene: Phaser.Scene, cameraManager: any) {
        this.scene = scene;
        this.cameraManager = cameraManager;
    }

    /**
     * Creates a new destination marker animation
     * Automatically cleans up any existing animation first
     */
    createMarker(x: number, y: number, color: number): void {
        // Always clean up first
        this.destroy();
        
        this.isAnimating = true;
        const arrowOffset = 20;
        const animationDuration = 300; // 300ms animation
        
        // Create 4 corner arrows
        const corners = [
            { x: x - arrowOffset, y: y - arrowOffset }, // Top-left
            { x: x + arrowOffset, y: y - arrowOffset }, // Top-right
            { x: x - arrowOffset, y: y + arrowOffset }, // Bottom-left
            { x: x + arrowOffset, y: y + arrowOffset }  // Bottom-right
        ];

        // Create arrows at corners (no stagger - all at once)
        corners.forEach((corner) => {
            const arrow = this.scene.add.graphics();
            arrow.fillStyle(color, 0.9);
            
            // Draw much larger arrow shape
            arrow.fillTriangle(0, -8, -6, 6, 6, 6); // Double the size
            arrow.setPosition(corner.x, corner.y);
            arrow.setDepth(CLIENT_CONFIG.RENDER_DEPTH.EFFECTS);
            arrow.setScale(1.0); // Larger arrows
            
            // Assign to main camera
            this.cameraManager.assignToMainCamera(arrow);
            
            this.activeGraphics.push(arrow);
        });

        // Animate arrows to center (all at the same time)
        this.activeGraphics.forEach((arrow) => {
            const tween = this.scene.tweens.add({
                targets: arrow,
                x: x,
                y: y,
                alpha: 0.3,
                scaleX: 0.2,
                scaleY: 0.2,
                duration: animationDuration,
                ease: 'Power2.easeOut',
                delay: 0, // No stagger - all start at the same time
                onComplete: () => {
                    arrow.destroy();
                    // Remove from active graphics array
                    const index = this.activeGraphics.indexOf(arrow);
                    if (index > -1) {
                        this.activeGraphics.splice(index, 1);
                    }
                }
            });
            this.activeTweens.push(tween);
        });

        // Create final center dot
        const timeout = setTimeout(() => {
            const finalDot = this.scene.add.graphics();
            finalDot.fillStyle(color, 0.8);
            finalDot.fillCircle(0, 0, 4);
            finalDot.setPosition(x, y);
            finalDot.setDepth(CLIENT_CONFIG.RENDER_DEPTH.EFFECTS);
            finalDot.setAlpha(0);
            
            // Assign to main camera
            this.cameraManager.assignToMainCamera(finalDot);
            
            this.activeGraphics.push(finalDot);
            
            // Fade in the final dot
            const fadeTween = this.scene.tweens.add({
                targets: finalDot,
                alpha: 1,
                duration: 200,
                ease: 'Power2.easeOut'
            });
            this.activeTweens.push(fadeTween);
            
            this.isAnimating = false;
        }, animationDuration - 50);
        
        this.activeTimeouts.push(timeout);
    }

    /**
     * Destroys all graphics, tweens, and timeouts
     */
    destroy(): void {
        // Stop all tweens
        this.activeTweens.forEach(tween => {
            if (tween && tween.isPlaying()) {
                tween.stop();
            }
        });
        this.activeTweens = [];

        // Clear all timeouts
        this.activeTimeouts.forEach(timeout => {
            clearTimeout(timeout);
        });
        this.activeTimeouts = [];

        // Destroy all graphics
        this.activeGraphics.forEach(graphic => {
            if (graphic && graphic.scene) {
                graphic.destroy();
            }
        });
        this.activeGraphics = [];

        this.isAnimating = false;
    }

    /**
     * Returns true if an animation is currently running
     */
    isCurrentlyAnimating(): boolean {
        return this.isAnimating;
    }
}
