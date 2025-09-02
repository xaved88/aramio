import Phaser from 'phaser';
import { CLIENT_CONFIG } from '../../Config';
import { HUDContainer } from './HUDContainer';

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
    private container: Phaser.GameObjects.Container;
    private background!: Phaser.GameObjects.Rectangle;
    private titleText!: Phaser.GameObjects.Text;
    private descriptionText!: Phaser.GameObjects.Text;
    private rewardId: string;
    private onClick?: (rewardId: string) => void;
    private isInteractive: boolean = false;

    constructor(scene: Phaser.Scene, config: RewardCardConfig) {
        this.scene = scene;
        this.rewardId = config.rewardId;
        this.onClick = config.onClick;
        
        this.container = this.scene.add.container(config.x, config.y);
        this.createCard(config);
        this.setupInteraction();
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
        
        // Title text
        this.titleText = this.scene.add.text(
            0, 
            -config.height / 2 + 20, 
            config.title || `Reward ${config.rewardId}`,
            {
                fontSize: '18px',
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
            -config.height / 2 + 50, 
            config.description || 'Click to claim this reward',
            {
                fontSize: '14px',
                color: '#666666',
                align: 'center',
                wordWrap: { width: config.width - 20 }
            }
        );
        this.descriptionText.setOrigin(0.5);
        this.hudContainer.add(this.descriptionText);
        
        // Add all elements to container
        this.container.add([this.background, this.titleText, this.descriptionText]);
        
        // Set depth for UI rendering
        this.container.setDepth(CLIENT_CONFIG.RENDER_DEPTH.GAME_UI - 4);
        this.container.setScrollFactor(0, 0); // Fixed to screen
    }

    private setupInteraction(): void {
        // Make the entire container interactive instead of just the background
        this.container.setInteractive(new Phaser.Geom.Rectangle(-60, -80, 120, 160), Phaser.Geom.Rectangle.Contains);
        
        this.container.on('pointerover', () => {
            if (this.isInteractive) {
                this.background.setFillStyle(0xf0f0f0, 0.9);
            }
        });
        
        this.container.on('pointerout', () => {
            if (this.isInteractive) {
                this.background.setFillStyle(0xffffff, 0.9);
            }
        });
        
        this.container.on('pointerdown', () => {
            if (this.isInteractive && this.onClick) {
                this.onClick(this.rewardId);
            }
        });
    }

    setInteractive(interactive: boolean): void {
        this.isInteractive = interactive;
        
        if (interactive) {
            this.container.setInteractive(new Phaser.Geom.Rectangle(-60, -80, 120, 160), Phaser.Geom.Rectangle.Contains);
            this.background.setFillStyle(0xffffff, 0.9);
        } else {
            this.container.disableInteractive();
            this.background.setFillStyle(0xcccccc, 0.7);
        }
    }

    setVisible(visible: boolean): void {
        this.container.setVisible(visible);
    }

    destroy(): void {
        if (this.hudContainer) {
            this.hudContainer.destroy();
            this.hudContainer = null;
        }
        this.container.destroy();
    }
}
