import Phaser from 'phaser';
import { CLIENT_CONFIG } from '../../ClientConfig';
import { getCanvasWidth, getCanvasHeight } from '../utils/CanvasSize';

export abstract class TutorialStep {
    protected scene: Phaser.Scene;
    protected hudCamera: Phaser.Cameras.Scene2D.Camera | null = null;
    protected cameraManager: any = null;
    protected overlay: Phaser.GameObjects.Rectangle | null = null;
    protected contentContainer: Phaser.GameObjects.Container | null = null;
    protected isVisible: boolean = false;
    protected onDismiss?: () => void;
    protected room: any = null;

    constructor(scene: Phaser.Scene, onDismiss?: () => void, room?: any) {
        this.scene = scene;
        this.onDismiss = onDismiss;
        this.room = room;
        this.createOverlay();
    }

    setHUDCamera(hudCamera: Phaser.Cameras.Scene2D.Camera): void {
        this.hudCamera = hudCamera;
    }

    setCameraManager(cameraManager: any): void {
        this.cameraManager = cameraManager;
        if (this.cameraManager) {
            // Assign overlay to HUD camera
            if (this.overlay) {
                this.cameraManager.assignToHUDCamera(this.overlay);
            }
            // Assign container to HUD camera
            if (this.contentContainer) {
                this.cameraManager.assignToHUDCamera(this.contentContainer);
            }
            // CRITICAL: Assign ALL children to HUD camera (they might have been created before cameraManager was set)
            if (this.contentContainer) {
                this.contentContainer.list.forEach((child: Phaser.GameObjects.GameObject) => {
                    this.cameraManager.assignToHUDCamera(child);
                });
            }
        }
    }

    private contentBuilt: boolean = false;

    protected createOverlay(): void {
        // Use rectangle instead of graphics for better positioning
        this.overlay = this.scene.add.rectangle(
            0, 0,
            getCanvasWidth(), getCanvasHeight(),
            CLIENT_CONFIG.UI.OVERLAY.BACKGROUND,
            CLIENT_CONFIG.UI.OVERLAY.ALPHA
        );
        this.overlay.setOrigin(0, 0);
        this.overlay.setDepth(CLIENT_CONFIG.RENDER_DEPTH.GAME_UI + 40);
        this.overlay.setScrollFactor(0, 0);
        this.overlay.setVisible(false);
        if (this.cameraManager) {
            this.cameraManager.assignToHUDCamera(this.overlay);
        }
        
        this.contentContainer = this.scene.add.container(0, 0);
        this.contentContainer.setDepth(CLIENT_CONFIG.RENDER_DEPTH.GAME_UI + 50);
        this.contentContainer.setScrollFactor(0, 0);
        this.contentContainer.setVisible(false);
        if (this.cameraManager) {
            this.cameraManager.assignToHUDCamera(this.contentContainer);
        }
        
        if (!this.contentBuilt) {
            this.buildContent();
            this.contentBuilt = true;
        }
    }

    abstract buildContent(): void;

    show(): void {
        if (this.overlay && this.contentContainer) {
            // Pause the game when showing tutorial
            if (this.room) {
                this.room.send('pause');
            }

            this.scene.tweens.killTweensOf([this.overlay, this.contentContainer]);
            
            this.updateBackground();
            
            this.overlay.setAlpha(0).setVisible(true);
            this.contentContainer.setAlpha(0).setVisible(true);
            
            this.scene.tweens.add({
                targets: [this.overlay, this.contentContainer],
                alpha: 1,
                duration: 300,
                ease: 'Power2'
            });
            
            this.isVisible = true;
        }
    }

    hide(): void {
        if (this.overlay && this.contentContainer) {
            // Unpause the game when hiding tutorial
            if (this.room) {
                this.room.send('unpause');
            }

            this.scene.tweens.killTweensOf([this.overlay, this.contentContainer]);
            
            this.scene.tweens.add({
                targets: [this.overlay, this.contentContainer],
                alpha: 0,
                duration: 300,
                ease: 'Power2',
                onComplete: () => {
                    if (this.overlay && this.contentContainer) {
                        this.overlay.setVisible(false);
                        this.contentContainer.setVisible(false);
                    }
                }
            });
            
            this.isVisible = false;
        }
    }

    protected updateBackground(): void {
        // Rectangle overlay doesn't need updates - it's static
        // This method is kept for compatibility with Graphics-based overlays
    }

    isShowing(): boolean {
        return this.isVisible;
    }

    toggle(): void {
        if (this.isVisible) {
            this.hide();
            if (this.onDismiss) {
                this.onDismiss();
            }
        } else {
            this.show();
        }
    }

    destroy(): void {
        if (this.overlay) {
            this.overlay.destroy();
            this.overlay = null;
        }
        
        if (this.contentContainer) {
            this.contentContainer.destroy();
            this.contentContainer = null;
        }
        
        this.isVisible = false;
        this.contentBuilt = false;
    }

    protected getContentContainer(): Phaser.GameObjects.Container | null {
        return this.contentContainer;
    }

    protected getScene(): Phaser.Scene {
        return this.scene;
    }
}

