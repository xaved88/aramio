import Phaser from 'phaser';
import { CLIENT_CONFIG } from '../../Config';

/**
 * AnimationManager handles all animations and tweens for entities
 */
export class AnimationManager {
    private scene: Phaser.Scene;
    private entityTweens: Map<string, Phaser.Tweens.Tween> = new Map();

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }

    /**
     * Animates an attack source (radius flash)
     */
    animateAttackSource(entityId: string, radiusIndicator: Phaser.GameObjects.Graphics): void {
        this.scene.tweens.add({
            targets: radiusIndicator,
            alpha: 0,
            duration: CLIENT_CONFIG.ANIMATIONS.ATTACK_SOURCE_DURATION_MS,
            yoyo: true,
            ease: 'Linear'
        });
    }

    /**
     * Animates an attack target (color flash)
     */
    animateAttackTarget(entityId: string, graphics: Phaser.GameObjects.Graphics): void {
        const flashDuration = CLIENT_CONFIG.ANIMATIONS.ATTACK_TARGET_FLASH_DURATION_MS;
        
        // Quick jump to flash alpha, then slow fade back
        this.scene.tweens.add({
            targets: graphics,
            alpha: CLIENT_CONFIG.ANIMATIONS.ATTACK_TARGET_FLASH_ALPHA,
            duration: CLIENT_CONFIG.ANIMATIONS.ATTACK_TARGET_QUICK_JUMP_DURATION_MS,
            ease: 'Power2',
            onComplete: () => {
                // Slow fade back to normal
                this.scene.tweens.add({
                    targets: graphics,
                    alpha: 1,
                    duration: flashDuration - CLIENT_CONFIG.ANIMATIONS.ATTACK_TARGET_QUICK_JUMP_DURATION_MS, // Remaining time for slow fade
                    ease: 'Power1'
                });
            }
        });
    }

    /**
     * Stops all animations for a specific entity
     */
    stopEntityAnimations(entityId: string): void {
        const existingTween = this.entityTweens.get(entityId);
        if (existingTween) {
            existingTween.stop();
            this.entityTweens.delete(entityId);
        }
    }

    /**
     * Cleans up all animations (called when scene is destroyed)
     */
    destroy(): void {
        this.entityTweens.forEach(tween => tween.stop());
        this.entityTweens.clear();
    }

    /**
     * Clears all animations without destroying the manager
     */
    clearAllAnimations(): void {
        this.entityTweens.forEach(tween => tween.stop());
        this.entityTweens.clear();
    }
} 