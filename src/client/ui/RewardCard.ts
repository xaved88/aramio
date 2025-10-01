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

export type RewardType = 'stat' | 'ability_stat' | 'ability';

export interface RewardCardStyle {
    backgroundColor: number;
    backgroundAlpha: number;
    borderColor: number;
    borderWidth: number;
    hoverBackgroundColor: number;
    hoverBorderColor: number;
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
    private rewardType: RewardType;
    private cardStyle: RewardCardStyle;

    get isInteractive(): boolean {
        return this._isInteractive;
    }

    constructor(scene: Phaser.Scene, config: RewardCardConfig) {
        this.scene = scene;
        this.rewardId = config.rewardId;
        this.onClick = config.onClick;
        
        this.rewardType = this.detectRewardType(config.rewardId);
        this.cardStyle = this.getStyleForRewardType(this.rewardType);
        
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

    private detectRewardType(rewardId: string): RewardType {
        if (rewardId.startsWith('stat:')) {
            return 'stat';
        } else if (rewardId.startsWith('ability_stat:')) {
            return 'ability_stat';
        } else if (rewardId.startsWith('ability:')) {
            return 'ability';
        }
        
        // Fallback - try to determine from reward display config
        try {
            const rewardDisplay = CLIENT_CONFIG.REWARDS.DISPLAY[rewardId as keyof typeof CLIENT_CONFIG.REWARDS.DISPLAY];
            if (rewardDisplay?.rarity === 'ability') {
                return 'ability';
            } else if (rewardDisplay?.rarity === 'upgrade') {
                return 'ability_stat';
            }
        } catch (error) {
            console.warn(`Error accessing reward display config for ${rewardId}:`, error);
        }
        
        // Default fallback
        return 'stat';
    }

    private getStyleForRewardType(rewardType: RewardType): RewardCardStyle {
        switch (rewardType) {
            case 'stat':
                return {
                    backgroundColor: 0xf0f9f0, // Very light green
                    backgroundAlpha: 0.9,
                    borderColor: 0x28a745, // Green
                    borderWidth: 2,
                    hoverBackgroundColor: 0xe8f5e8,
                    hoverBorderColor: 0x1e7e34 // Darker green
                };
            case 'ability_stat':
                return {
                    backgroundColor: 0xf0f7ff, // Very light blue
                    backgroundAlpha: 0.9,
                    borderColor: 0x007bff, // Blue
                    borderWidth: 3,
                    hoverBackgroundColor: 0xe6f3ff,
                    hoverBorderColor: 0x0056b3 // Darker blue
                };
            case 'ability':
                return {
                    backgroundColor: 0xf5f0ff, // Very light purple
                    backgroundAlpha: 0.9,
                    borderColor: 0x6f42c1, // Purple
                    borderWidth: 4,
                    hoverBackgroundColor: 0xede7f6,
                    hoverBorderColor: 0x5a32a3 // Darker purple
                };
            default:
                return {
                    backgroundColor: 0xffffff,
                    backgroundAlpha: 0.9,
                    borderColor: 0xcccccc,
                    borderWidth: 2,
                    hoverBackgroundColor: 0xe0e0e0,
                    hoverBorderColor: 0x4a90e2
                };
        }
    }

    private dimColor(color: number, factor: number): number {
        // Extract RGB components
        const r = Math.floor((color >> 16) & 0xFF);
        const g = Math.floor((color >> 8) & 0xFF);
        const b = Math.floor(color & 0xFF);
        
        // Apply dimming factor
        const dimmedR = Math.floor(r * factor);
        const dimmedG = Math.floor(g * factor);
        const dimmedB = Math.floor(b * factor);
        
        // Reconstruct color
        return (dimmedR << 16) | (dimmedG << 8) | dimmedB;
    }

    private createCard(config: RewardCardConfig): void {
        try {
            // Create HUD container
            this.hudContainer = new HUDContainer(this.scene, config.x, config.y);
            this.hudContainer.setDepth(CLIENT_CONFIG.RENDER_DEPTH.GAME_UI - 4);
        
        if (this.cameraManager) {
            this.hudContainer.setCameraManager(this.cameraManager);
        }
        
        // Background rectangle with dynamic styling
        this.background = this.scene.add.rectangle(
            0, 0, 
            config.width, config.height, 
            this.cardStyle.backgroundColor, this.cardStyle.backgroundAlpha
        );
        this.background.setStrokeStyle(this.cardStyle.borderWidth, this.cardStyle.borderColor);
        
        
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
        
        } catch (error) {
            console.error(`Error creating reward card for ${config.rewardId}:`, error);
            throw error;
        }
    }



    setInteractive(interactive: boolean): void {
        this._isInteractive = interactive;
        
        // Remove any existing event listeners first
        this.hudContainer!.getContainer().removeAllListeners();
        
        if (interactive) {
            this.hudContainer!.getContainer().setInteractive(new Phaser.Geom.Rectangle(-80, -100, 160, 200), Phaser.Geom.Rectangle.Contains);
            this.background.setFillStyle(this.cardStyle.backgroundColor, this.cardStyle.backgroundAlpha);
            
            // Set up event listeners when becoming interactive
            this.hudContainer!.getContainer().on('pointerover', () => {
                this.background.setFillStyle(this.cardStyle.hoverBackgroundColor, 0.95);
                this.background.setStrokeStyle(this.cardStyle.borderWidth + 1, this.cardStyle.hoverBorderColor);
                this.hudContainer!.getContainer().setScale(1.05);
            });
            
            this.hudContainer!.getContainer().on('pointerout', () => {
                this.background.setFillStyle(this.cardStyle.backgroundColor, this.cardStyle.backgroundAlpha);
                this.background.setStrokeStyle(this.cardStyle.borderWidth, this.cardStyle.borderColor);
                this.hudContainer!.getContainer().setScale(1.0);
            });
            
            this.hudContainer!.getContainer().on('pointerdown', () => {
                if (this.onClick) {
                    this.onClick(this.rewardId);
                }
            });
        } else {
            this.hudContainer!.getContainer().disableInteractive();
            // Use a dimmed version of the card's normal colors for non-interactive state
            const dimmedColor = this.dimColor(this.cardStyle.backgroundColor, 0.6);
            this.background.setFillStyle(dimmedColor, 0.7);
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
