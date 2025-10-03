import Phaser from 'phaser';
import { CLIENT_CONFIG } from '../../ClientConfig';

/**
 * AnimationManager handles all animations and tweens for entities
 */
export class AnimationManager {
    private scene: Phaser.Scene;
    private entityTweens: Map<string, Phaser.Tweens.Tween> = new Map();
    private hitMarkerGraphics: Map<string, Phaser.GameObjects.Graphics> = new Map();
    private cameraManager: any = null;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }

    setCameraManager(cameraManager: any): void {
        this.cameraManager = cameraManager;
    }

    /**
     * Animates a damage target (color flash)
     */
    animateDamageTarget(entityId: string, graphics: Phaser.GameObjects.Graphics, shouldAnimate: boolean = true): void {
        // Only animate if explicitly requested (when player is involved)
        if (!shouldAnimate) {
            return;
        }
        
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
     * Creates a hit marker at the specified location
     */
    createHitMarker(x: number, y: number, damageType: 'auto-attack' | 'ability' = 'auto-attack'): void {
        // Create hit marker graphics
        const hitMarker = this.scene.add.graphics();
        
        // Position the graphics object at the world coordinates
        hitMarker.setPosition(x, y);
        
        // Set color based on damage type
        let color: number;
        switch (damageType) {
            case 'ability':
                color = CLIENT_CONFIG.HIT_MARKERS.COLORS.ABILITY;
                break;
            case 'auto-attack':
            default:
                color = CLIENT_CONFIG.HIT_MARKERS.COLORS.AUTO_ATTACK;
                break;
        }
        
        // Draw crosshair hit marker centered at (0, 0) since we positioned the graphics object
        const size = CLIENT_CONFIG.HIT_MARKERS.SIZE;
        const thickness = CLIENT_CONFIG.HIT_MARKERS.THICKNESS;
        
        // For ability damage, draw white outline first, then purple main lines
        if (damageType === 'ability') {
            const outlineThickness = CLIENT_CONFIG.HIT_MARKERS.OUTLINE.THICKNESS;
            const outlineColor = CLIENT_CONFIG.HIT_MARKERS.OUTLINE.COLOR;
            
            // Draw white outline (thicker)
            hitMarker.lineStyle(thickness + outlineThickness, outlineColor, 1);
            hitMarker.beginPath();
            hitMarker.moveTo(-size, -size);
            hitMarker.lineTo(size, size);
            hitMarker.moveTo(size, -size);
            hitMarker.lineTo(-size, size);
            hitMarker.strokePath();
            
            // Draw purple main lines on top (thicker for abilities)
            hitMarker.lineStyle(thickness + 1, color, 1);
            hitMarker.beginPath();
            hitMarker.moveTo(-size, -size);
            hitMarker.lineTo(size, size);
            hitMarker.moveTo(size, -size);
            hitMarker.lineTo(-size, size);
            hitMarker.strokePath();
        } else {
            // Auto-attack: just draw white lines
            hitMarker.lineStyle(thickness, color, 1);
            hitMarker.beginPath();
            hitMarker.moveTo(-size, -size);
            hitMarker.lineTo(size, size);
            hitMarker.moveTo(size, -size);
            hitMarker.lineTo(-size, size);
            hitMarker.strokePath();
        }
        
        // Set depth to appear above entities but below projectiles
        hitMarker.setDepth(CLIENT_CONFIG.RENDER_DEPTH.EFFECTS);
        
        // Ensure hit markers only appear on the main camera, not the HUD camera
        // This prevents them from appearing in both world space and screen space
        if (this.cameraManager) {
            this.cameraManager.assignToMainCamera(hitMarker);
        }
        
        // Generate unique ID for this hit marker
        const markerId = `hit_marker_${Date.now()}_${Math.random()}`;
        this.hitMarkerGraphics.set(markerId, hitMarker);
        
        // Animate the hit marker
        this.animateHitMarker(markerId, hitMarker);
    }
    
    /**
     * Animates a hit marker with scale and fade effects
     */
    private animateHitMarker(markerId: string, hitMarker: Phaser.GameObjects.Graphics): void {
        const config = CLIENT_CONFIG.HIT_MARKERS;
        const duration = config.DURATION_MS;
        
        // Set initial scale
        hitMarker.setScale(config.SCALE_ANIMATION.START_SCALE);
        
        // Scale up animation
        this.scene.tweens.add({
            targets: hitMarker,
            scaleX: config.SCALE_ANIMATION.END_SCALE,
            scaleY: config.SCALE_ANIMATION.END_SCALE,
            duration: duration * config.SCALE_ANIMATION.FADE_OUT_START,
            ease: 'Back.easeOut',
            onComplete: () => {
                // Start fade out
                this.scene.tweens.add({
                    targets: hitMarker,
                    alpha: 0,
                    duration: duration * (1 - config.SCALE_ANIMATION.FADE_OUT_START),
                    ease: 'Power2',
                    onComplete: () => {
                        // Clean up
                        this.cleanupHitMarker(markerId);
                    }
                });
            }
        });
    }
    
    /**
     * Cleans up a hit marker
     */
    private cleanupHitMarker(markerId: string): void {
        const hitMarker = this.hitMarkerGraphics.get(markerId);
        if (hitMarker) {
            hitMarker.destroy();
            this.hitMarkerGraphics.delete(markerId);
        }
    }

    /**
     * Creates a projectile miss effect (puff of particles)
     */
    createProjectileMissEffect(x: number, y: number, teamColor: 'blue' | 'red' | 'player'): void {
        const config = CLIENT_CONFIG.PROJECTILE_MISS_EFFECT;
        
        // Get color based on team (using same colors as projectiles)
        let color: number;
        switch (teamColor) {
            case 'blue':
                color = CLIENT_CONFIG.PROJECTILE.BLUE_COLOR;
                break;
            case 'red':
                color = CLIENT_CONFIG.PROJECTILE.RED_COLOR;
                break;
            case 'player':
                color = CLIENT_CONFIG.SELF_COLORS.PROJECTILE; // Purple for player projectiles
                break;
        }
        
        // Create particles
        for (let i = 0; i < config.PARTICLE_COUNT; i++) {
            const particle = this.scene.add.graphics();
            
            // Random position within spread radius
            const angle = (i / config.PARTICLE_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
            const distance = Math.random() * config.SPREAD_RADIUS;
            const particleX = x + Math.cos(angle) * distance;
            const particleY = y + Math.sin(angle) * distance;
            
            particle.setPosition(particleX, particleY);
            
            // Draw small circle particle
            particle.fillStyle(color, 1);
            particle.fillCircle(0, 0, config.PARTICLE_SIZE);
            
            // Set depth
            particle.setDepth(CLIENT_CONFIG.RENDER_DEPTH.EFFECTS);
            
            // Ensure it only appears on main camera
            if (this.cameraManager) {
                this.cameraManager.assignToMainCamera(particle);
            }
            
            // Animate particle
            this.scene.tweens.add({
                targets: particle,
                alpha: 0,
                scaleX: 0.2,
                scaleY: 0.2,
                duration: config.FADE_OUT_DURATION_MS,
                ease: 'Power2',
                onComplete: () => {
                    particle.destroy();
                }
            });
        }
    }

    /**
     * Clears all animations without destroying the manager
     */
    clearAllAnimations(): void {
        this.entityTweens.forEach(tween => tween.stop());
        this.entityTweens.clear();
        
        // Clean up all hit markers
        this.hitMarkerGraphics.forEach((marker, markerId) => {
            this.cleanupHitMarker(markerId);
        });
    }
} 
