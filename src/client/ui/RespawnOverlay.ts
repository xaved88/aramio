import Phaser from 'phaser';
import { CLIENT_CONFIG } from '../../Config';

/**
 * RespawnOverlay displays a prominent overlay when the player's hero is respawning
 */
export class RespawnOverlay {
    private scene: Phaser.Scene;
    private overlay: Phaser.GameObjects.Graphics | null = null;
    private text: Phaser.GameObjects.Text | null = null;
    private timer: Phaser.GameObjects.Text | null = null;
    private isVisible: boolean = false;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.createOverlay();
    }

    private createOverlay(): void {
        this.overlay = this.scene.add.graphics();
        this.overlay.setDepth(CLIENT_CONFIG.RENDER_DEPTH.GAME_UI - 5);
        this.overlay.setScrollFactor(0, 0); // Fixed to screen
        
        this.text = this.scene.add.text(
            CLIENT_CONFIG.GAME_CANVAS_WIDTH / 2,
            CLIENT_CONFIG.GAME_CANVAS_HEIGHT / 5,
            'Respawning',
            {
                fontSize: '36px',
                color: '#ffffff',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 4,
                shadow: { offsetX: 2, offsetY: 2, color: '#000000', blur: 4, fill: true }
            }
        );
        this.text.setOrigin(0.5);
        this.text.setDepth(CLIENT_CONFIG.RENDER_DEPTH.GAME_UI - 5);
        this.text.setScrollFactor(0, 0); // Fixed to screen
        
        this.timer = this.scene.add.text(
            CLIENT_CONFIG.GAME_CANVAS_WIDTH / 2,
            CLIENT_CONFIG.GAME_CANVAS_HEIGHT / 5 + 50,
            '',
            {
                fontSize: '32px',
                color: '#ffffff',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 3,
                shadow: { offsetX: 1, offsetY: 1, color: '#000000', blur: 2, fill: true }
            }
        );
        this.timer.setOrigin(0.5);
        this.timer.setDepth(CLIENT_CONFIG.RENDER_DEPTH.GAME_UI - 5);
        this.timer.setScrollFactor(0, 0); // Fixed to screen
        
        this.hide();
    }

    show(): void {
        if (this.overlay && this.text && this.timer) {
            [this.overlay, this.text, this.timer].forEach(el => el.setAlpha(0).setVisible(true));
            
            this.scene.tweens.add({
                targets: [this.overlay, this.text, this.timer],
                alpha: 1,
                duration: 600,
                ease: 'Power2'
            });
            
            this.isVisible = true;
        }
    }

    hide(): void {
        if (this.overlay && this.text && this.timer) {
            [this.overlay, this.text, this.timer].forEach(el => el.setVisible(false));
            this.isVisible = false;
        }
    }

    updateTimer(remainingTimeMs: number): void {
        if (this.timer) {
            this.timer.setText(`${Math.ceil(remainingTimeMs / 1000)}s`);
        }
    }

    private updateBackground(): void {
        if (this.overlay) {
            this.overlay.clear();
            this.overlay.fillStyle(0x000000, 0.3);
            this.overlay.fillRect(0, 0, CLIENT_CONFIG.GAME_CANVAS_WIDTH, CLIENT_CONFIG.GAME_CANVAS_HEIGHT);
        }
    }

    showWithTimer(remainingTimeMs: number): void {
        this.show();
        this.updateBackground();
        this.updateTimer(remainingTimeMs);
    }

    isShowing(): boolean {
        return this.isVisible;
    }

    destroy(): void {
        [this.overlay, this.text, this.timer].forEach(el => el?.destroy());
        [this.overlay, this.text, this.timer] = [null, null, null];
        this.isVisible = false;
    }
}
