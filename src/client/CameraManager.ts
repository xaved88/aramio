import Phaser from 'phaser';
import { CLIENT_CONFIG } from '../ClientConfig';
import { getCanvasWidth, getCanvasHeight, getDynamicZoom } from './utils/CanvasSize';
import { ControllerId } from '../shared/types/CombatantTypes';
import { SharedGameState } from '../shared/types/GameStateTypes';

export class CameraManager {
    private scene: Phaser.Scene;
    public camera: Phaser.Cameras.Scene2D.Camera;
    private hudCamera: Phaser.Cameras.Scene2D.Camera;
    private playerSessionId: ControllerId | null = null;
    private viewportWidth: number;
    private viewportHeight: number;
    private mapWidth: number;
    private mapHeight: number;
    private isFollowing: boolean = false;
    private entityManager: any = null;
    private lastFollowedHeroId: string | null = null;
    private activeRedFlashGraphics: Set<Phaser.GameObjects.Rectangle> = new Set(); // Track red flash graphics for cleanup
    private redFlashCooldown: number = 0; // Track when the last red flash was triggered
    
    // Mouse position tracking for lookahead
    private mouseX: number = 0;
    private mouseY: number = 0;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.camera = scene.cameras.main;
        
        // Viewport size (what the player sees)
        this.viewportWidth = getCanvasWidth();
        this.viewportHeight = getCanvasHeight();
        
        // Map size (actual game world size)
        this.mapWidth = CLIENT_CONFIG.MAP_WIDTH;
        this.mapHeight = CLIENT_CONFIG.MAP_HEIGHT;
        
        this.hudCamera = scene.cameras.add(0, 0, this.viewportWidth, this.viewportHeight);
        
        this.setupCamera();
    }

    private setupCamera(): void {
        // Configure main camera for game world
        this.camera.setZoom(getDynamicZoom());
        this.camera.setBounds(0, 0, this.mapWidth, this.mapHeight);
        this.camera.setViewport(0, 0, this.viewportWidth, this.viewportHeight);
        
        // Configure HUD camera for UI elements only
        this.hudCamera.setZoom(1.0);
        this.hudCamera.setBounds(0, 0, this.viewportWidth, this.viewportHeight);
        this.hudCamera.setViewport(0, 0, this.viewportWidth, this.viewportHeight);
        this.hudCamera.setScroll(0, 0);
    }

    setPlayerSessionId(sessionId: ControllerId | null): void {
        this.playerSessionId = sessionId;
        // Reset following state when player changes
        this.isFollowing = false;
        this.lastFollowedHeroId = null;
    }

    resetFollowing(): void {
        // Stop following current target and reset state
        this.camera.stopFollow();
        this.isFollowing = false;
        this.lastFollowedHeroId = null;
    }

    setEntityManager(entityManager: any): void {
        this.entityManager = entityManager;
    }

    setMapSize(mapWidth: number, mapHeight: number): void {
        this.mapWidth = mapWidth;
        this.mapHeight = mapHeight;
        this.setupCamera();
    }

    updateCamera(state: SharedGameState): void {
        if (!this.playerSessionId || !this.entityManager) return;

        // Update mouse position for lookahead calculation
        if (this.scene.input) {
            const pointer = this.scene.input.activePointer;
            this.mouseX = pointer.x;
            this.mouseY = pointer.y;
        }

        // Find the player's hero
        let playerHero = null;
        for (const combatant of state.combatants.values()) {
            if (combatant.type === 'hero' && combatant.controller === this.playerSessionId) {
                playerHero = combatant;
                break;
            }
        }

        if (playerHero) {
            // Only check for hero changes if we're already following someone
            if (this.isFollowing && this.lastFollowedHeroId !== playerHero.id) {
                this.resetFollowing();
            }

            if (!this.isFollowing) {
                // Get the actual Phaser Graphics object for the hero
                const heroGraphics = this.entityManager.getEntityGraphics(playerHero.id);
                if (heroGraphics) {
                    // Start following the hero's Graphics object with smooth lerp
                    this.camera.startFollow(heroGraphics, true, 0.1, 0.1);
                    // Set initial follow offset to 0
                    this.camera.setFollowOffset(0, 0);
                    this.isFollowing = true;
                    this.lastFollowedHeroId = playerHero.id;
                }
            } else {
                // Update lookahead offset for existing follow
                const offset = this.calculateLookAheadOffset();
                this.camera.setFollowOffset(offset.x, offset.y);
            }
        }
    }

    private calculateLookAheadOffset(): { x: number, y: number } {
        // Calculate normalized mouse position relative to viewport center
        const centerX = this.viewportWidth / 2;
        const centerY = this.viewportHeight / 2;
        
        const mouseOffsetX = this.mouseX - centerX;
        const mouseOffsetY = this.mouseY - centerY;
        
        // Calculate distance from center (0 to 1)
        const maxDistance = Math.sqrt(centerX * centerX + centerY * centerY);
        const currentDistance = Math.sqrt(mouseOffsetX * mouseOffsetX + mouseOffsetY * mouseOffsetY);
        const normalizedDistance = Math.min(currentDistance / maxDistance, 1);
        
        // Apply look-ahead threshold
        const lookAheadThreshold = CLIENT_CONFIG.CAMERA.LOOK_AHEAD_THRESHOLD;
        const lookAheadFactor = normalizedDistance * lookAheadThreshold;
        
        // Calculate offset based on mouse direction and look-ahead factor
        // Invert the offset so camera looks ahead in mouse direction
        const offsetX = -(mouseOffsetX / maxDistance) * (this.viewportWidth / 2) * lookAheadFactor;
        const offsetY = -(mouseOffsetY / maxDistance) * (this.viewportHeight / 2) * lookAheadFactor;
        
        return { x: offsetX, y: offsetY };
    }

    getCameraOffset(): { x: number, y: number } {
        return {
            x: this.camera.scrollX,
            y: this.camera.scrollY
        };
    }

    getViewportSize(): { width: number, height: number } {
        return {
            width: this.viewportWidth,
            height: this.viewportHeight
        };
    }

    getMapSize(): { width: number, height: number } {
        return {
            width: this.mapWidth,
            height: this.mapHeight
        };
    }

    setViewportSize(width: number, height: number): void {
        this.viewportWidth = width;
        this.viewportHeight = height;
        this.camera.setViewport(0, 0, width, height);
        this.hudCamera.setViewport(0, 0, width, height);
    }

    getHUDCamera(): Phaser.Cameras.Scene2D.Camera {
        return this.hudCamera;
    }

    // Method to assign an object to the HUD camera (and remove it from main camera)
    assignToHUDCamera(object: Phaser.GameObjects.GameObject): void {
        this.camera.ignore(object);
    }

    // Method to assign an object to the main camera (and remove it from HUD camera)
    assignToMainCamera(object: Phaser.GameObjects.GameObject): void {
        this.hudCamera.ignore(object);
    }

    /**
     * Triggers a camera shake effect
     */
    triggerShake(): void {
        if (!CLIENT_CONFIG.CAMERA.SHAKE.ENABLED) return;
        
        // Use Phaser's built-in camera shake
        this.camera.shake(
            CLIENT_CONFIG.CAMERA.SHAKE.DURATION_MS,
            CLIENT_CONFIG.CAMERA.SHAKE.INTENSITY,
            true, // force shake even if already shaking
            undefined, // callback
            true // shake on both X and Y axes
        );
    }

    /**
     * Triggers a red flash effect when taking damage
     */
    triggerRedFlash(): void {
        if (!CLIENT_CONFIG.CAMERA.RED_FLASH.ENABLED) return;
        
        // Prevent overlapping red flashes - only allow one every COOLDOWN_MS
        const currentTime = this.scene.time.now;
        const cooldownDuration = CLIENT_CONFIG.CAMERA.RED_FLASH.COOLDOWN_MS;
        
        if (currentTime - this.redFlashCooldown < cooldownDuration) {
            return; // Skip this flash if we're still in cooldown
        }
        
        this.redFlashCooldown = currentTime;
        
        // Create a red overlay rectangle that covers the entire screen
        const flashOverlay = this.scene.add.rectangle(
            this.viewportWidth / 2,
            this.viewportHeight / 2,
            this.viewportWidth,
            this.viewportHeight,
            CLIENT_CONFIG.CAMERA.RED_FLASH.COLOR,
            CLIENT_CONFIG.CAMERA.RED_FLASH.ALPHA
        );
        
        // Track for cleanup
        this.activeRedFlashGraphics.add(flashOverlay);
        
        // Set high depth to appear above everything
        flashOverlay.setDepth(CLIENT_CONFIG.RENDER_DEPTH.MODALS);
        
        // Assign to HUD camera so it doesn't move with the game world
        this.assignToHUDCamera(flashOverlay);
        
        // Fade out the overlay
        this.scene.tweens.add({
            targets: flashOverlay,
            alpha: 0,
            duration: CLIENT_CONFIG.CAMERA.RED_FLASH.DURATION_MS,
            ease: 'Power2',
            onComplete: () => {
                flashOverlay.destroy();
            }
        });
    }
    
    /**
     * Cleans up all active red flash graphics
     */
    cleanupActiveRedFlashes(): void {
        this.activeRedFlashGraphics.forEach(graphics => {
            if (graphics && graphics.scene) {
                graphics.destroy();
            }
        });
        this.activeRedFlashGraphics.clear();
    }

}
