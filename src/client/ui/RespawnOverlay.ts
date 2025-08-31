import Phaser from 'phaser';
import { CLIENT_CONFIG } from '../../Config';
import { RewardCardManager } from './RewardCardManager';

/**
 * RespawnOverlay displays a prominent overlay when the player's hero is respawning
 */
export class RespawnOverlay {
    private scene: Phaser.Scene;
    private overlay: Phaser.GameObjects.Graphics | null = null;
    private text: Phaser.GameObjects.Text | null = null;
    private timer: Phaser.GameObjects.Text | null = null;
    private rewardsText: Phaser.GameObjects.Text | null = null;
    private rewardCardManager: RewardCardManager;
    private isVisible: boolean = false;
    private onRewardChosen?: (rewardId: string) => void;

    constructor(scene: Phaser.Scene, onRewardChosen?: (rewardId: string) => void) {
        this.scene = scene;
        this.onRewardChosen = onRewardChosen;
        this.rewardCardManager = new RewardCardManager(scene, onRewardChosen);
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
        
        this.rewardsText = this.scene.add.text(
            CLIENT_CONFIG.GAME_CANVAS_WIDTH / 2,
            CLIENT_CONFIG.GAME_CANVAS_HEIGHT / 5 + 100,
            'Choose your rewards',
            {
                fontSize: '24px',
                color: '#f1c40f',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 2,
                shadow: { offsetX: 1, offsetY: 1, color: '#000000', blur: 2, fill: true }
            }
        );
        this.rewardsText.setOrigin(0.5);
        this.rewardsText.setDepth(CLIENT_CONFIG.RENDER_DEPTH.GAME_UI - 5);
        this.rewardsText.setScrollFactor(0, 0); // Fixed to screen
        
        this.hide();
    }

    show(): void {
        if (this.overlay && this.text && this.timer && this.rewardsText) {
            const elements = [this.overlay, this.text, this.timer, this.rewardsText];
            elements.forEach(el => el.setAlpha(0).setVisible(true));
            
            this.scene.tweens.add({
                targets: elements,
                alpha: 1,
                duration: 600,
                ease: 'Power2'
            });
            
            this.isVisible = true;
        }
    }

    hide(): void {
        if (this.overlay && this.text && this.timer && this.rewardsText) {
            [this.overlay, this.text, this.timer, this.rewardsText].forEach(el => el.setVisible(false));
            this.rewardCardManager.setVisible(false);
            this.isVisible = false;
        }
    }

    updateTimer(remainingTimeMs: number, hasUnspentRewards: boolean = false): void {
        if (this.timer) {
            this.timer.setText(`${Math.ceil(remainingTimeMs / 1000)}s`);
        }
        
        if (this.rewardsText) {
            if (hasUnspentRewards) {
                this.rewardsText.setVisible(true);
            } else {
                this.rewardsText.setVisible(false);
            }
        }
        
        // Show/hide reward cards based on unspent rewards (show immediately when respawning)
        this.rewardCardManager.setVisible(hasUnspentRewards);
    }

    private updateBackground(): void {
        if (this.overlay) {
            this.overlay.clear();
            this.overlay.fillStyle(0x000000, 0.3);
            this.overlay.fillRect(0, 0, CLIENT_CONFIG.GAME_CANVAS_WIDTH, CLIENT_CONFIG.GAME_CANVAS_HEIGHT);
        }
    }

    showWithTimer(remainingTimeMs: number, hasUnspentRewards: boolean = false): void {
        this.show();
        this.updateBackground();
        this.updateTimer(remainingTimeMs, hasUnspentRewards);
    }

    isShowing(): boolean {
        return this.isVisible;
    }

    destroy(): void {
        [this.overlay, this.text, this.timer, this.rewardsText].forEach(el => el?.destroy());
        [this.overlay, this.text, this.timer, this.rewardsText] = [null, null, null, null];
        this.rewardCardManager.destroy();
        this.isVisible = false;
    }
}
