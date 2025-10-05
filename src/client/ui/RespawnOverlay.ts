import Phaser from 'phaser';
import { CLIENT_CONFIG } from '../../ClientConfig';
import { RewardCardManager } from './RewardCardManager';
import { HeroCombatant } from '../../shared/types/CombatantTypes';
import { HUDContainer } from './HUDContainer';

/**
 * RespawnOverlay displays a prominent overlay when the player's hero is respawning
 */
export class RespawnOverlay {
    private scene: Phaser.Scene;
    private hudCamera: Phaser.Cameras.Scene2D.Camera | null = null;
    private cameraManager: any = null;
    private hudContainer: HUDContainer | null = null;
    private overlay: Phaser.GameObjects.Graphics | null = null;
    private text: Phaser.GameObjects.Text | null = null;
    private timer: Phaser.GameObjects.Text | null = null;
    private rewardsText: Phaser.GameObjects.Text | null = null;
    private deathSummaryHint: Phaser.GameObjects.Text | null = null;
    private rewardCardManager: RewardCardManager;
    private isVisible: boolean = false;
    private onRewardChosen?: (rewardId: string) => void;

    constructor(scene: Phaser.Scene, onRewardChosen?: (rewardId: string) => void) {
        this.scene = scene;
        this.onRewardChosen = onRewardChosen;
        this.rewardCardManager = new RewardCardManager(scene, onRewardChosen);
        this.createOverlay();
    }

    setHUDCamera(hudCamera: Phaser.Cameras.Scene2D.Camera): void {
        this.hudCamera = hudCamera;
        this.rewardCardManager.setHUDCamera(hudCamera);
    }

    setCameraManager(cameraManager: any): void {
        this.cameraManager = cameraManager;
        this.rewardCardManager.setCameraManager(cameraManager);
        if (this.hudContainer) {
            this.hudContainer.setCameraManager(cameraManager);
        }
    }

    private createOverlay(): void {
        // Create HUD container
        this.hudContainer = new HUDContainer(this.scene);
        this.hudContainer.setDepth(CLIENT_CONFIG.RENDER_DEPTH.GAME_UI - 5);
        
        if (this.cameraManager) {
            this.hudContainer.setCameraManager(this.cameraManager);
        }
        
        this.overlay = this.scene.add.graphics();
        this.overlay.setDepth(CLIENT_CONFIG.RENDER_DEPTH.GAME_UI - 5);
        this.overlay.setScrollFactor(0, 0); // Fixed to screen
        this.hudContainer.add(this.overlay);
        
        this.text = this.scene.add.text(
            CLIENT_CONFIG.GAME_CANVAS_WIDTH / 2,
            CLIENT_CONFIG.GAME_CANVAS_HEIGHT / 7, // Moved up more
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
        this.hudContainer.add(this.text);
        
        this.timer = this.scene.add.text(
            CLIENT_CONFIG.GAME_CANVAS_WIDTH / 2,
            CLIENT_CONFIG.GAME_CANVAS_HEIGHT / 7 + 45, // Moved up with text
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
        this.timer.setOrigin(0.5); // Center-aligned
        this.timer.setDepth(CLIENT_CONFIG.RENDER_DEPTH.GAME_UI - 5);
        this.timer.setScrollFactor(0, 0); // Fixed to screen
        this.hudContainer.add(this.timer);
        
        this.rewardsText = this.scene.add.text(
            CLIENT_CONFIG.GAME_CANVAS_WIDTH / 2,
            CLIENT_CONFIG.GAME_CANVAS_HEIGHT / 6 + 140, // Moved down more to be closer to reward cards
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
        this.hudContainer.add(this.rewardsText);
        
        // Create death summary hint text
        this.deathSummaryHint = this.scene.add.text(
            CLIENT_CONFIG.GAME_CANVAS_WIDTH / 2,
            CLIENT_CONFIG.GAME_CANVAS_HEIGHT / 7 + 85, // Moved up with text
            'Hold "Shift" for Death Summary',
            {
                fontSize: '18px',
                color: '#cccccc',
                fontStyle: 'normal',
                stroke: '#000000',
                strokeThickness: 1,
                shadow: { offsetX: 1, offsetY: 1, color: '#000000', blur: 1, fill: true }
            }
        );
        this.deathSummaryHint.setOrigin(0.5);
        this.deathSummaryHint.setDepth(CLIENT_CONFIG.RENDER_DEPTH.GAME_UI - 5);
        this.deathSummaryHint.setScrollFactor(0, 0); // Fixed to screen
        this.hudContainer.add(this.deathSummaryHint);
        
        this.hide();
    }

    show(): void {
        if (this.overlay && this.text && this.timer && this.rewardsText && this.deathSummaryHint) {
            const elements = [this.overlay, this.text, this.timer, this.rewardsText, this.deathSummaryHint];
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
        if (this.overlay && this.text && this.timer && this.rewardsText && this.deathSummaryHint) {
            [this.overlay, this.text, this.timer, this.rewardsText, this.deathSummaryHint].forEach(el => el.setVisible(false));
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

    updateRewards(hero: HeroCombatant): void {
        this.rewardCardManager.updateRewards(hero);
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
        if (this.hudContainer) {
            this.hudContainer.destroy();
            this.hudContainer = null;
        }
        
        [this.overlay, this.text, this.timer, this.rewardsText, this.deathSummaryHint] = [null, null, null, null, null];
        this.rewardCardManager.destroy();
        this.isVisible = false;
    }
}
