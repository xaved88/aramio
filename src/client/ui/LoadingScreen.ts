import Phaser from 'phaser';
import { CLIENT_CONFIG } from '../../ClientConfig';
import { TextStyleHelper } from '../utils/TextStyleHelper';
import { hexToColorString } from '../utils/ColorUtils';
import { getCanvasWidth, getCanvasHeight } from '../utils/CanvasSize';

/**
 * Simple loading screen component that shows "Loading..." text
 */
export class LoadingScreen {
    private scene: Phaser.Scene;
    private loadingText: Phaser.GameObjects.Text | null = null;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }

    show(): void {
        if (this.loadingText) {
            return; // Already showing
        }

        this.loadingText = this.scene.add.text(
            getCanvasWidth() / 2,
            getCanvasHeight() / 2,
            'Loading...',
            TextStyleHelper.getStyle('TITLE')
        ).setOrigin(0.5);
    }

    hide(): void {
        if (this.loadingText) {
            this.loadingText.destroy();
            this.loadingText = null;
        }
    }

    isVisible(): boolean {
        return this.loadingText !== null;
    }
}
