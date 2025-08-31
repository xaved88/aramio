import Phaser from 'phaser';
import { CLIENT_CONFIG } from '../Config';
import { ControllerId } from '../shared/types/CombatantTypes';
import { SharedGameState } from '../shared/types/GameStateTypes';

export class CameraManager {
    private scene: Phaser.Scene;
    private camera: Phaser.Cameras.Scene2D.Camera;
    private playerSessionId: ControllerId | null = null;
    private viewportWidth: number;
    private viewportHeight: number;
    private mapWidth: number;
    private mapHeight: number;
    private currentTween: Phaser.Tweens.Tween | null = null;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.camera = scene.cameras.main;
        
        // Viewport size (what the player sees)
        this.viewportWidth = CLIENT_CONFIG.GAME_CANVAS_WIDTH;
        this.viewportHeight = CLIENT_CONFIG.GAME_CANVAS_HEIGHT;
        
        // Map size (actual game world size)
        this.mapWidth = CLIENT_CONFIG.MAP_WIDTH;
        this.mapHeight = CLIENT_CONFIG.MAP_HEIGHT;
        
        this.setupCamera();
    }

    private setupCamera(): void {
        // Set camera bounds to the full map size (700x700)
        // This allows the camera to move around the entire game world
        this.camera.setBounds(0, 0, this.mapWidth, this.mapHeight);
        
        // Set viewport size to our smaller viewport
        this.camera.setViewport(0, 0, this.viewportWidth, this.viewportHeight);
        
        // Center camera on map initially
        this.camera.centerOn(this.mapWidth / 2, this.mapHeight / 2);
    }

    setPlayerSessionId(sessionId: ControllerId | null): void {
        this.playerSessionId = sessionId;
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
        // Calculate target camera position (center the target in viewport)
        const targetCameraX = targetX - this.viewportWidth / 2;
        const targetCameraY = targetY - this.viewportHeight / 2;
        
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
    }
}
