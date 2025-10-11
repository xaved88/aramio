import Phaser from 'phaser';
import { ControlMode, ControlModeStorage } from '../utils/ControlModeStorage';
import { CLIENT_CONFIG } from '../../ClientConfig';

export class ControlModeToggle {
    private scene: Phaser.Scene;
    private container: Phaser.GameObjects.Container;
    private modeIcon: Phaser.GameObjects.Image;
    private background: Phaser.GameObjects.Graphics;
    private currentMode: ControlMode;
    private onModeChange?: (mode: ControlMode) => void;
    private readonly ICON_SIZE = 24;

    constructor(scene: Phaser.Scene, x: number, y: number, onModeChange?: (mode: ControlMode) => void) {
        this.scene = scene;
        this.currentMode = ControlModeStorage.getControlMode();
        this.onModeChange = onModeChange;

        this.container = this.scene.add.container(x, y);
        this.background = this.scene.add.graphics();
        
        // Create icon (will be updated in updateDisplay)
        const iconKey = this.currentMode === 'mouse' ? 'control-mouse' : 'control-keyboard';
        this.modeIcon = this.scene.add.image(0, 0, iconKey);
        this.modeIcon.setOrigin(0.5);
        this.modeIcon.setDisplaySize(this.ICON_SIZE, this.ICON_SIZE);

        this.container.add([this.background, this.modeIcon]);
        this.updateDisplay();
        this.setupInteraction();
    }

    private updateDisplay(): void {
        const iconKey = this.currentMode === 'mouse' ? 'control-mouse' : 'control-keyboard';
        this.modeIcon.setTexture(iconKey);
        this.modeIcon.setDisplaySize(this.ICON_SIZE, this.ICON_SIZE);

        this.background.clear();
        this.background.fillStyle(CLIENT_CONFIG.UI.COLORS.BACKGROUND, 0.8);
        this.background.lineStyle(2, CLIENT_CONFIG.UI.COLORS.CONTROL_TOGGLE, 1);
        
        const padding = 6;
        const size = this.ICON_SIZE + padding * 2;
        
        this.background.fillRoundedRect(-size / 2, -size / 2, size, size, 4);
        this.background.strokeRoundedRect(-size / 2, -size / 2, size, size, 4);
    }

    private setupInteraction(): void {
        const padding = 6;
        const size = this.ICON_SIZE + padding * 2;
        
        this.container.setInteractive(
            new Phaser.Geom.Rectangle(-size / 2, -size / 2, size, size),
            Phaser.Geom.Rectangle.Contains
        );

        this.container.on('pointerover', () => {
            this.background.clear();
            this.background.fillStyle(CLIENT_CONFIG.UI.COLORS.CONTROL_TOGGLE, 0.8);
            this.background.lineStyle(2, CLIENT_CONFIG.UI.COLORS.CONTROL_TOGGLE, 1);
            
            this.background.fillRoundedRect(-size / 2, -size / 2, size, size, 4);
            this.background.strokeRoundedRect(-size / 2, -size / 2, size, size, 4);
        });

        this.container.on('pointerout', () => {
            this.updateDisplay();
        });

        this.container.on('pointerdown', () => {
            this.toggleMode();
        });
    }

    private toggleMode(): void {
        this.currentMode = this.currentMode === 'mouse' ? 'keyboard' : 'mouse';
        ControlModeStorage.saveControlMode(this.currentMode);
        this.updateDisplay();
        
        if (this.onModeChange) {
            this.onModeChange(this.currentMode);
        }
    }

    setDepth(depth: number): void {
        this.container.setDepth(depth);
    }

    setScrollFactor(x: number, y: number): void {
        this.container.setScrollFactor(x, y);
    }

    getCurrentMode(): ControlMode {
        return this.currentMode;
    }

    getContainer(): Phaser.GameObjects.Container {
        return this.container;
    }

    destroy(): void {
        this.container.destroy();
    }
}

