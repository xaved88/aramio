import Phaser from 'phaser';
import { CLIENT_CONFIG } from '../../ClientConfig';
import { TextStyleHelper } from '../utils/TextStyleHelper';
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
    private background!: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Graphics;
    private titleText!: Phaser.GameObjects.Text;
    private descriptionText!: Phaser.GameObjects.Text;
    private iconImage: Phaser.GameObjects.Image | null = null;
    private cornerDecorations: Phaser.GameObjects.Graphics[] = [];
    private rewardId: string;
    private onClick?: (rewardId: string) => void;
    private _isInteractive: boolean = false;
    private rewardType: RewardType;
    private cardStyle: RewardCardStyle;

    get isInteractive(): boolean {
        return this._isInteractive;
    }

    get container(): HUDContainer | null {
        return this.hudContainer;
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
        
        // Background shape with dynamic styling
        if (this.rewardType === 'ability_stat') {
            // Rounded rectangle for ability stat rewards
            this.background = this.scene.add.graphics();
            this.background.fillStyle(0x333333, 1.0); // Start with solid dark background for face-down
            this.background.fillRoundedRect(
                -config.width / 2, 
                -config.height / 2, 
                config.width, 
                config.height, 
                12
            );
            this.background.lineStyle(this.cardStyle.borderWidth, this.cardStyle.borderColor);
            this.background.strokeRoundedRect(
                -config.width / 2, 
                -config.height / 2, 
                config.width, 
                config.height, 
                12
            );
        } else if (this.rewardType === 'ability') {
            // Rectangle with greebles for ability rewards
            this.background = this.scene.add.graphics();
            this.background.fillStyle(this.cardStyle.backgroundColor, this.cardStyle.backgroundAlpha);
            this.background.lineStyle(this.cardStyle.borderWidth, this.cardStyle.borderColor);
            
            // Main rectangle
            this.background.fillRect(-config.width / 2, -config.height / 2, config.width, config.height);
            this.background.strokeRect(-config.width / 2, -config.height / 2, config.width, config.height);
            
            // Top greebles (diamonds)
            const greebleSize = 8;
            const greebleSpacing = 20;
            for (let i = 0; i < 3; i++) {
                const x = -config.width / 2 + greebleSpacing + (i * greebleSpacing);
                const y = -config.height / 2 - greebleSize;
                this.background.beginPath();
                this.background.moveTo(x + greebleSize/2, y);
                this.background.lineTo(x + greebleSize, y + greebleSize/2);
                this.background.lineTo(x + greebleSize/2, y + greebleSize);
                this.background.lineTo(x, y + greebleSize/2);
                this.background.closePath();
                this.background.fillPath();
                this.background.strokePath();
            }
            
            // Bottom greebles (diamonds)
            for (let i = 0; i < 3; i++) {
                const x = -config.width / 2 + greebleSpacing + (i * greebleSpacing);
                const y = config.height / 2;
                this.background.beginPath();
                this.background.moveTo(x + greebleSize/2, y);
                this.background.lineTo(x + greebleSize, y + greebleSize/2);
                this.background.lineTo(x + greebleSize/2, y + greebleSize);
                this.background.lineTo(x, y + greebleSize/2);
                this.background.closePath();
                this.background.fillPath();
                this.background.strokePath();
            }
        } else {
            // Regular rectangle for stat rewards
            this.background = this.scene.add.rectangle(
                0, 0, 
                config.width, config.height, 
                this.cardStyle.backgroundColor, this.cardStyle.backgroundAlpha
            );
            this.background.setStrokeStyle(this.cardStyle.borderWidth, this.cardStyle.borderColor);
        }
        
        // Add corner decorations based on reward type
        this.createCornerDecorations(config);
        
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
            TextStyleHelper.getStyleWithCustom('BODY_MEDIUM', {
                color: '#333333',
                align: 'center',
                fontStyle: 'bold'
            })
        );
        this.titleText.setOrigin(0.5);
        this.hudContainer.add(this.titleText);
        
        // Description text
        this.descriptionText = this.scene.add.text(
            0, 
            config.height / 2 - 45, 
            config.description || 'Click to claim this reward',
            TextStyleHelper.getStyleWithCustom('BODY_MEDIUM', {
                color: '#666666',
                align: 'center',
                wordWrap: { width: config.width - 30 }
            })
        );
        this.descriptionText.setOrigin(0.5);
        this.hudContainer.add(this.descriptionText);
        
        // Add all elements to HUD container
        const elements: Phaser.GameObjects.GameObject[] = [this.background, this.titleText, this.descriptionText, ...this.cornerDecorations];
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
            // Rectangle interactive area
            this.hudContainer!.getContainer().setInteractive(new Phaser.Geom.Rectangle(-80, -100, 160, 200), Phaser.Geom.Rectangle.Contains);
            
            // Set up event listeners when becoming interactive
            this.hudContainer!.getContainer().on('pointerover', () => {
                this.applyHoverEffect(true);
                this.hudContainer!.getContainer().setScale(1.05);
            });
            
            this.hudContainer!.getContainer().on('pointerout', () => {
                this.applyHoverEffect(false);
                this.hudContainer!.getContainer().setScale(1.0);
            });
            
            this.hudContainer!.getContainer().on('pointerdown', (pointer: Phaser.Input.Pointer, localX: number, localY: number, event: Phaser.Types.Input.EventData) => {
                // Stop event propagation to prevent ability firing
                event.stopPropagation();
                
                if (this.onClick) {
                    this.onClick(this.rewardId);
                }
            });
        } else {
            this.hudContainer!.getContainer().disableInteractive();
            // Keep normal colors even when non-interactive
            this.applyHoverEffect(false);
        }
    }

    setVisible(visible: boolean): void {
        this.hudContainer!.setVisible(visible);
    }

    setPosition(x: number, y: number): void {
        this.hudContainer!.setPosition(x, y);
    }



    private applyHoverEffect(isHover: boolean, customColor?: number, customAlpha?: number): void {
        const backgroundColor = customColor || (isHover ? this.cardStyle.hoverBackgroundColor : this.cardStyle.backgroundColor);
        const backgroundAlpha = customAlpha || (isHover ? 0.95 : this.cardStyle.backgroundAlpha);
        const borderColor = isHover ? this.cardStyle.hoverBorderColor : this.cardStyle.borderColor;
        const borderWidth = isHover ? this.cardStyle.borderWidth + 1 : this.cardStyle.borderWidth;

        if (this.rewardType === 'ability_stat') {
            // For rounded rectangles, clear and redraw
            if (this.background instanceof Phaser.GameObjects.Graphics) {
                this.background.clear();
                this.background.fillStyle(backgroundColor, backgroundAlpha);
                this.background.fillRoundedRect(-80, -100, 160, 200, 12);
                this.background.lineStyle(borderWidth, borderColor);
                this.background.strokeRoundedRect(-80, -100, 160, 200, 12);
            }
        } else if (this.rewardType === 'ability') {
            // For ability cards with greebles, clear and redraw
            if (this.background instanceof Phaser.GameObjects.Graphics) {
                this.background.clear();
                this.background.fillStyle(backgroundColor, backgroundAlpha);
                this.background.lineStyle(borderWidth, borderColor);
                
                // Main rectangle
                this.background.fillRect(-80, -100, 160, 200);
                this.background.strokeRect(-80, -100, 160, 200);
                
                // Top greebles (diamonds)
                const greebleSize = 8;
                const greebleSpacing = 20;
                for (let i = 0; i < 3; i++) {
                    const x = -80 + greebleSpacing + (i * greebleSpacing);
                    const y = -100 - greebleSize;
                    this.background.beginPath();
                    this.background.moveTo(x + greebleSize/2, y);
                    this.background.lineTo(x + greebleSize, y + greebleSize/2);
                    this.background.lineTo(x + greebleSize/2, y + greebleSize);
                    this.background.lineTo(x, y + greebleSize/2);
                    this.background.closePath();
                    this.background.fillPath();
                    this.background.strokePath();
                }
                
                // Bottom greebles (diamonds)
                for (let i = 0; i < 3; i++) {
                    const x = -80 + greebleSpacing + (i * greebleSpacing);
                    const y = 100;
                    this.background.beginPath();
                    this.background.moveTo(x + greebleSize/2, y);
                    this.background.lineTo(x + greebleSize, y + greebleSize/2);
                    this.background.lineTo(x + greebleSize/2, y + greebleSize);
                    this.background.lineTo(x, y + greebleSize/2);
                    this.background.closePath();
                    this.background.fillPath();
                    this.background.strokePath();
                }
            }
        } else {
            // For regular rectangles, use setFillStyle
            if (this.background instanceof Phaser.GameObjects.Rectangle) {
                this.background.setFillStyle(backgroundColor, backgroundAlpha);
                this.background.setStrokeStyle(borderWidth, borderColor);
            }
        }
    }

    private createCornerDecorations(config: RewardCardConfig): void {
        const cornerSize = 12;
        const offset = 6;
        
        switch (this.rewardType) {
            case 'stat':
                // Green corner triangles
                this.createCornerTriangles(config, cornerSize, offset, 0x28a745);
                break;
            case 'ability_stat':
                // Blue corner circles
                this.createCornerCircles(config, cornerSize, offset, 0x007bff);
                break;
            case 'ability':
                // Purple corner diamonds
                this.createCornerDiamonds(config, cornerSize, offset, 0x6f42c1);
                break;
        }
    }

    private createCornerTriangles(config: RewardCardConfig, size: number, offset: number, color: number): void {
        const halfWidth = config.width / 2;
        const halfHeight = config.height / 2;
        
        // Top-left triangle only
        const topLeft = this.scene.add.graphics();
        topLeft.fillStyle(color);
        topLeft.beginPath();
        topLeft.moveTo(-halfWidth + offset, -halfHeight + offset);
        topLeft.lineTo(-halfWidth + offset + size, -halfHeight + offset);
        topLeft.lineTo(-halfWidth + offset, -halfHeight + offset + size);
        topLeft.closePath();
        topLeft.fillPath();
        this.cornerDecorations.push(topLeft);
    }

    private createCornerCircles(config: RewardCardConfig, size: number, offset: number, color: number): void {
        const halfWidth = config.width / 2;
        const halfHeight = config.height / 2;
        
        // Top-left circle only
        const topLeft = this.scene.add.graphics();
        topLeft.fillStyle(color);
        topLeft.fillCircle(-halfWidth + offset + size/2, -halfHeight + offset + size/2, size/2);
        this.cornerDecorations.push(topLeft);
    }

    private createCornerDiamonds(config: RewardCardConfig, size: number, offset: number, color: number): void {
        const halfWidth = config.width / 2;
        const halfHeight = config.height / 2;
        
        // Top-left diamond only
        const topLeft = this.scene.add.graphics();
        topLeft.fillStyle(color);
        topLeft.beginPath();
        topLeft.moveTo(-halfWidth + offset + size/2, -halfHeight + offset);
        topLeft.lineTo(-halfWidth + offset + size, -halfHeight + offset + size/2);
        topLeft.lineTo(-halfWidth + offset + size/2, -halfHeight + offset + size);
        topLeft.lineTo(-halfWidth + offset, -halfHeight + offset + size/2);
        topLeft.closePath();
        topLeft.fillPath();
        this.cornerDecorations.push(topLeft);
    }

    destroy(): void {
        if (this.hudContainer) {
            this.hudContainer.destroy();
            this.hudContainer = null;
        }
    }
}
