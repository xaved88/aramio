import Phaser from 'phaser';
import { CLIENT_CONFIG } from '../Config';
import { ControllerId } from '../shared/types/CombatantTypes';
import { SharedGameState } from '../shared/types/GameStateTypes';

export class CameraManager {
    private scene: Phaser.Scene;
    private camera: Phaser.Cameras.Scene2D.Camera;
    private hudCamera: Phaser.Cameras.Scene2D.Camera;
    private playerSessionId: ControllerId | null = null;
    private viewportWidth: number;
    private viewportHeight: number;
    private mapWidth: number;
    private mapHeight: number;
    private currentTween: Phaser.Tweens.Tween | null = null;
    private mouseX: number = 0;
    private mouseY: number = 0;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.camera = scene.cameras.main;
        
        // Viewport size (what the player sees)
        this.viewportWidth = CLIENT_CONFIG.GAME_CANVAS_WIDTH;
        this.viewportHeight = CLIENT_CONFIG.GAME_CANVAS_HEIGHT;
        
        // Map size (actual game world size)
        this.mapWidth = CLIENT_CONFIG.MAP_WIDTH;
        this.mapHeight = CLIENT_CONFIG.MAP_HEIGHT;
        
        this.hudCamera = scene.cameras.add(0, 0, this.viewportWidth, this.viewportHeight);
        
        this.setupCamera();
    }

    private setupCamera(): void {
        // Configure main camera for game world
        this.camera.setZoom(CLIENT_CONFIG.CAMERA.ZOOM);
        this.camera.setBounds(0, 0, this.mapWidth, this.mapHeight);
        this.camera.setViewport(0, 0, this.viewportWidth, this.viewportHeight);
        this.camera.centerOn(this.mapWidth / 2, this.mapHeight / 2);
        
        // Configure HUD camera for UI elements only
        this.hudCamera.setZoom(1.0);
        this.hudCamera.setBounds(0, 0, this.viewportWidth, this.viewportHeight);
        this.hudCamera.setViewport(0, 0, this.viewportWidth, this.viewportHeight);
        this.hudCamera.setScroll(0, 0);
    }

    setPlayerSessionId(sessionId: ControllerId | null): void {
        this.playerSessionId = sessionId;
    }

    updateMousePosition(screenX: number, screenY: number): void {
        this.mouseX = screenX;
        this.mouseY = screenY;
    }

    updateCamera(state: SharedGameState): void {
        if (!this.playerSessionId) return;

        // Find the player's hero
        let playerHero = null;
        for (const combatant of state.combatants.values()) {
            if (combatant.type === 'hero' && combatant.controller === this.playerSessionId) {
                playerHero = combatant;
                break;
            }
        }

        if (playerHero) {
            this.tweenToPosition(playerHero.x, playerHero.y);
        }
    }

    private tweenToPosition(targetX: number, targetY: number): void {
        // Calculate look-ahead offset based on mouse position
        const lookAheadOffset = this.calculateLookAheadOffset();
        
        // Calculate target camera position (center the target in viewport) with look-ahead offset
        const targetCameraX = targetX - this.viewportWidth / 2 + lookAheadOffset.x;
        const targetCameraY = targetY - this.viewportHeight / 2 + lookAheadOffset.y;
        
        // Stop any existing tween
        if (this.currentTween) {
            this.currentTween.stop();
        }
        
        // Create smooth camera tween
        this.currentTween = this.scene.tweens.add({
            targets: this.camera,
            scrollX: targetCameraX,
            scrollY: targetCameraY,
            duration: CLIENT_CONFIG.CAMERA_TWEEN_DURATION_MS,
            ease: 'Power2',
            onComplete: () => {
                this.currentTween = null;
            }
        });
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
        const offsetX = (mouseOffsetX / maxDistance) * (this.viewportWidth / 2) * lookAheadFactor;
        const offsetY = (mouseOffsetY / maxDistance) * (this.viewportHeight / 2) * lookAheadFactor;
        
        return { x: offsetX, y: offsetY };
    }

    getCameraOffset(): { x: number, y: number } {
        return {
            x: this.camera.scrollX,
            y: this.camera.scrollY
        };
    }

    getWorldPoint(screenX: number, screenY: number): { x: number, y: number } {
        // Get the actual camera position after bounds clamping
        const actualScrollX = Math.max(0, Math.min(this.camera.scrollX, this.mapWidth - this.viewportWidth));
        const actualScrollY = Math.max(0, Math.min(this.camera.scrollY, this.mapHeight - this.viewportHeight));
        
        // Calculate world coordinates using the actual camera position
        return {
            x: actualScrollX + screenX,
            y: actualScrollY + screenY
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
}
