import Phaser from 'phaser';
import { CLIENT_CONFIG } from '../../ClientConfig';
import { getCanvasWidth, getCanvasHeight } from '../utils/CanvasSize';
import { HUDContainer } from '../ui/HUDContainer';

export abstract class TutorialStep {
    protected scene: Phaser.Scene;
    protected hudCamera: Phaser.Cameras.Scene2D.Camera | null = null;
    protected cameraManager: any = null;
    protected hudContainer: HUDContainer | null = null;
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
        if (this.hudContainer) {
            this.hudContainer.setCameraManager(cameraManager);
        }
    }

    protected createOverlay(): void {
        this.hudContainer = new HUDContainer(this.scene);
        this.hudContainer.setDepth(CLIENT_CONFIG.RENDER_DEPTH.GAME_UI + 50);
        
        if (this.cameraManager) {
            this.hudContainer.setCameraManager(this.cameraManager);
        }
        
        this.overlay = this.scene.add.graphics();
        this.overlay.setDepth(CLIENT_CONFIG.RENDER_DEPTH.GAME_UI + 50);
        this.overlay.setScrollFactor(0, 0);
        this.overlay.setVisible(false);
        this.hudContainer.add(this.overlay);
        
        this.contentContainer = this.scene.add.container(0, 0);
        this.contentContainer.setDepth(CLIENT_CONFIG.RENDER_DEPTH.GAME_UI + 50);
        this.contentContainer.setScrollFactor(0, 0);
        this.contentContainer.setVisible(false);
        this.hudContainer.add(this.contentContainer);
        
        this.buildContent();
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
        if (this.hudContainer) {
            this.hudContainer.destroy();
            this.hudContainer = null;
        }
        
        this.overlay = null;
        this.contentContainer = null;
        this.isVisible = false;
    }

    protected getContentContainer(): Phaser.GameObjects.Container | null {
        return this.contentContainer;
    }

    protected getScene(): Phaser.Scene {
        return this.scene;
    }
}

