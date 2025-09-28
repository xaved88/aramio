import Phaser from 'phaser';
import { CLIENT_CONFIG } from '../../ClientConfig';
import { HUDContainer } from './HUDContainer';
import { IconManager } from '../utils/IconManager';

export interface RewardCardConfig {
    x: number;
    y: number;
    width: number;
    height: number;
    rewardId: string;
    title?: string;
    description?: string;
    onClick?: (rewardId: string) => void;
}

/**
 * RewardCard displays a selectable reward option during respawn
 */
export class RewardCard {
    private scene: Phaser.Scene;
    private hudCamera: Phaser.Cameras.Scene2D.Camera | null = null;
    private cameraManager: any = null;
    private hudContainer: HUDContainer | null = null;
    private background!: Phaser.GameObjects.Rectangle;
    private titleText!: Phaser.GameObjects.Text;
    private descriptionText!: Phaser.GameObjects.Text;
    private iconImage: Phaser.GameObjects.Image | null = null;
    private rewardId: string;
    private onClick?: (rewardId: string) => void;
    private _isInteractive: boolean = false;

    get isInteractive(): boolean {
        return this._isInteractive;
    }

    constructor(scene: Phaser.Scene, config: RewardCardConfig) {
        this.scene = scene;
        this.rewardId = config.rewardId;
        this.onClick = config.onClick;
        
        this.createCard(config);
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

    private createCard(config: RewardCardConfig): void {
        // Create HUD container
        this.hudContainer = new HUDContainer(this.scene, config.x, config.y);
        this.hudContainer.setDepth(CLIENT_CONFIG.RENDER_DEPTH.GAME_UI - 4);
        
        if (this.cameraManager) {
            this.hudContainer.setCameraManager(this.cameraManager);
        }
        
        // Background rectangle
        this.background = this.scene.add.rectangle(
            0, 0, 
            config.width, config.height, 
            0xffffff, 0.9
        );
        this.background.setStrokeStyle(2, 0xcccccc);
        this.hudContainer.add(this.background);
        
        // Create icon
        const iconManager = IconManager.getInstance();
        this.iconImage = iconManager.createIconImage(this.scene, 0, -config.height / 2 + 60, config.rewardId, 50);
        if (this.iconImage) {
            this.iconImage.setScrollFactor(0, 0);
            this.iconImage.setDepth(CLIENT_CONFIG.RENDER_DEPTH.GAME_UI - 4);
        }
        
        // Title text
        this.titleText = this.scene.add.text(
            0, 
            config.height / 2 - 80, 
            config.title || `Reward ${config.rewardId}`,
            {
                fontSize: '16px',
                color: '#333333',
                fontStyle: 'bold',
                align: 'center'
            }
        );
        this.titleText.setOrigin(0.5);
        this.hudContainer.add(this.titleText);
        
        // Description text
        this.descriptionText = this.scene.add.text(
            0, 
            config.height / 2 - 45, 
            config.description || 'Click to claim this reward',
            {
                fontSize: '16px',
                color: '#666666',
                align: 'center',
                wordWrap: { width: config.width - 30 }
            }
        );
        this.descriptionText.setOrigin(0.5);
        this.hudContainer.add(this.descriptionText);
        
        // Add all elements to HUD container
        const elements: Phaser.GameObjects.GameObject[] = [this.background, this.titleText, this.descriptionText];
        if (this.iconImage) {
            elements.push(this.iconImage);
        }
        this.hudContainer.addMultiple(elements);
    }



    setInteractive(interactive: boolean): void {
        this._isInteractive = interactive;
        
        // Remove any existing event listeners first
        this.hudContainer!.getContainer().removeAllListeners();
        
        if (interactive) {
            this.hudContainer!.getContainer().setInteractive(new Phaser.Geom.Rectangle(-80, -100, 160, 200), Phaser.Geom.Rectangle.Contains);
            this.background.setFillStyle(0xffffff, 0.9);
            
            // Set up event listeners when becoming interactive
            this.hudContainer!.getContainer().on('pointerover', () => {
                this.background.setFillStyle(0xe0e0e0, 0.95);
                this.background.setStrokeStyle(3, 0x4a90e2);
                this.hudContainer!.getContainer().setScale(1.05);
            });
            
            this.hudContainer!.getContainer().on('pointerout', () => {
                this.background.setFillStyle(0xffffff, 0.9);
                this.background.setStrokeStyle(2, 0xcccccc);
                this.hudContainer!.getContainer().setScale(1.0);
            });
            
            this.hudContainer!.getContainer().on('pointerdown', () => {
                if (this.onClick) {
                    this.onClick(this.rewardId);
                }
            });
        } else {
            this.hudContainer!.getContainer().disableInteractive();
            this.background.setFillStyle(0xcccccc, 0.7);
        }
    }

    setVisible(visible: boolean): void {
        this.hudContainer!.setVisible(visible);
    }

    destroy(): void {
        if (this.hudContainer) {
            this.hudContainer.destroy();
            this.hudContainer = null;
        }
    }
}
