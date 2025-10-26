import Phaser from 'phaser';
import { CLIENT_CONFIG } from '../../ClientConfig';
import { getCanvasWidth, getCanvasHeight } from '../utils/CanvasSize';

export abstract class TutorialStep {
    protected scene: Phaser.Scene;
    protected hudCamera: Phaser.Cameras.Scene2D.Camera | null = null;
    protected cameraManager: any = null;
    protected overlay: Phaser.GameObjects.Graphics | null = null;
    protected contentContainer: Phaser.GameObjects.Container | null = null;
    protected isVisible: boolean = false;
    protected onDismiss?: () => void;

    constructor(scene: Phaser.Scene, onDismiss?: () => void) {
        this.scene = scene;
        this.onDismiss = onDismiss;
        this.createOverlay();
    }

    setHUDCamera(hudCamera: Phaser.Cameras.Scene2D.Camera): void {
        this.hudCamera = hudCamera;
    }

    setCameraManager(cameraManager: any): void {
        this.cameraManager = cameraManager;
        if (this.overlay && this.cameraManager) {
            this.cameraManager.assignToHUDCamera(this.overlay);
        }
        if (this.contentContainer && this.cameraManager) {
            this.cameraManager.assignToHUDCamera(this.contentContainer);
        }
    }

    private contentBuilt: boolean = false;

    protected createOverlay(): void {
        this.overlay = this.scene.add.graphics();
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
        if (this.overlay) {
            this.overlay.clear();
            this.overlay.fillStyle(CLIENT_CONFIG.UI.OVERLAY.BACKGROUND, CLIENT_CONFIG.UI.OVERLAY.ALPHA);
            this.overlay.setPosition(0, 0);
            this.overlay.fillRect(0, 0, getCanvasWidth(), getCanvasHeight());
        }
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

