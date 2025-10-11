import Phaser from 'phaser';
import { CLIENT_CONFIG } from '../../ClientConfig';
import { hexToColorString } from '../utils/ColorUtils';

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
            CLIENT_CONFIG.GAME_CANVAS_WIDTH / 2,
            CLIENT_CONFIG.GAME_CANVAS_HEIGHT / 2,
            'Loading...',
            {
                fontSize: '24px',
                color: hexToColorString(0xffffff),
                fontFamily: CLIENT_CONFIG.UI.FONTS.PRIMARY
            }
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
