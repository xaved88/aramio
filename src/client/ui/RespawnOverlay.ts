import Phaser from 'phaser';
import { CLIENT_CONFIG } from '../../ClientConfig';
import { RewardCardManager } from './RewardCardManager';
import { HeroCombatant } from '../../shared/types/CombatantTypes';
import { HUDContainer } from './HUDContainer';
import { hexToColorString } from '../utils/ColorUtils';

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
    private slainByText: Phaser.GameObjects.Text | null = null;
    private killerNameText: Phaser.GameObjects.Text | null = null;
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
        
        // Create "Slain by" text (above "Respawning")
        this.slainByText = this.scene.add.text(
            0, // Will be positioned dynamically
            CLIENT_CONFIG.GAME_CANVAS_HEIGHT / 7, // Above the main text
            'Slain by ',
            {
                fontSize: '20px',
                color: '#ffffff',
                fontStyle: 'normal',
                fontFamily: CLIENT_CONFIG.UI.FONTS.PRIMARY,
                stroke: '#000000',
                strokeThickness: 2,
                shadow: { offsetX: 1, offsetY: 1, color: '#000000', blur: 2, fill: true }
            }
        );
        this.slainByText.setOrigin(0, 0.5); // Left-aligned
        this.slainByText.setDepth(CLIENT_CONFIG.RENDER_DEPTH.GAME_UI - 5);
        this.slainByText.setScrollFactor(0, 0); // Fixed to screen
        this.hudContainer.add(this.slainByText);
        
        // Create killer name text (colored based on team)
        this.killerNameText = this.scene.add.text(
            0, // Will be positioned dynamically
            CLIENT_CONFIG.GAME_CANVAS_HEIGHT / 7, // Same position as "Slain by"
            '',
            {
                fontSize: '20px',
                color: '#ffffff',
                fontStyle: 'normal',
                fontFamily: CLIENT_CONFIG.UI.FONTS.PRIMARY,
                stroke: '#000000',
                strokeThickness: 2,
                shadow: { offsetX: 1, offsetY: 1, color: '#000000', blur: 2, fill: true }
            }
        );
        this.killerNameText.setOrigin(0, 0.5); // Left-aligned
        this.killerNameText.setDepth(CLIENT_CONFIG.RENDER_DEPTH.GAME_UI - 5);
        this.killerNameText.setScrollFactor(0, 0); // Fixed to screen
        this.hudContainer.add(this.killerNameText);
        
        // Create death summary hint text (below "Slain by")
        this.deathSummaryHint = this.scene.add.text(
            CLIENT_CONFIG.GAME_CANVAS_WIDTH / 2,
            CLIENT_CONFIG.GAME_CANVAS_HEIGHT / 7 + 30, // Below the "Slain by" text
            'Hold "Shift" for Death Summary',
            {
                fontSize: '14px',
                color: '#999999',
                fontStyle: 'normal',
                fontFamily: CLIENT_CONFIG.UI.FONTS.PRIMARY,
                stroke: '#000000',
                strokeThickness: 1
            }
        );
        this.deathSummaryHint.setOrigin(0.5);
        this.deathSummaryHint.setDepth(CLIENT_CONFIG.RENDER_DEPTH.GAME_UI - 5);
        this.deathSummaryHint.setScrollFactor(0, 0); // Fixed to screen
        this.deathSummaryHint.setAlpha(0.7); // Make it more subtle
        this.hudContainer.add(this.deathSummaryHint);
        
        this.text = this.scene.add.text(
            CLIENT_CONFIG.GAME_CANVAS_WIDTH / 2,
            CLIENT_CONFIG.GAME_CANVAS_HEIGHT / 7 + 90, // Moved down
            'Respawning',
            {
                fontSize: '36px',
                color: '#ffffff',
                fontStyle: 'bold',
                fontFamily: CLIENT_CONFIG.UI.FONTS.PRIMARY,
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
            CLIENT_CONFIG.GAME_CANVAS_HEIGHT / 7 + 135, // Moved down with text
            '',
            {
                fontSize: '32px',
                color: '#ffffff',
                fontStyle: 'bold',
                fontFamily: CLIENT_CONFIG.UI.FONTS.PRIMARY,
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
            CLIENT_CONFIG.GAME_CANVAS_HEIGHT / 6 + 190, // Moved down and closer to reward cards
            'Choose your rewards',
            {
                fontSize: '24px',
                color: '#f1c40f',
                fontStyle: 'bold',
                fontFamily: CLIENT_CONFIG.UI.FONTS.PRIMARY,
                stroke: '#000000',
                strokeThickness: 2,
                shadow: { offsetX: 1, offsetY: 1, color: '#000000', blur: 2, fill: true }
            }
        );
        this.rewardsText.setOrigin(0.5);
        this.rewardsText.setDepth(CLIENT_CONFIG.RENDER_DEPTH.GAME_UI - 5);
        this.rewardsText.setScrollFactor(0, 0); // Fixed to screen
        this.hudContainer.add(this.rewardsText);
        
        this.hide();
    }

    show(): void {
        if (this.overlay && this.text && this.timer && this.rewardsText && this.deathSummaryHint && this.slainByText && this.killerNameText) {
            // Core elements that always show (timer visibility is managed by updateTimer)
            const elements = [this.overlay, this.text, this.deathSummaryHint, this.slainByText, this.killerNameText];
            elements.forEach(el => el.setAlpha(0).setVisible(true));
            
            this.scene.tweens.add({
                targets: elements,
                alpha: 1,
                duration: 600,
                ease: 'Power2'
            });
            
            // If timer is visible (managed by updateTimer), animate it too
            if (this.timer.visible) {
                this.timer.setAlpha(0);
                this.scene.tweens.add({
                    targets: this.timer,
                    alpha: 1,
                    duration: 600,
                    ease: 'Power2'
                });
            }
            
            // If rewardsText is visible (managed by updateTimer), animate it too
            if (this.rewardsText.visible) {
                this.rewardsText.setAlpha(0);
                this.scene.tweens.add({
                    targets: this.rewardsText,
                    alpha: 1,
                    duration: 600,
                    ease: 'Power2'
                });
            }
            
            this.isVisible = true;
        }
    }

    hide(): void {
        if (this.overlay && this.text && this.timer && this.rewardsText && this.deathSummaryHint && this.slainByText && this.killerNameText) {
            [this.overlay, this.text, this.timer, this.rewardsText, this.deathSummaryHint, this.slainByText, this.killerNameText].forEach(el => el.setVisible(false));
            this.rewardCardManager.setVisible(false);
            this.isVisible = false;
        }
    }

    updateTimer(remainingTimeMs: number, hasUnspentRewards: boolean = false): void {
        // Hide timer when at 0 or below
        const timerReady = remainingTimeMs <= 0;
        
        // Update main "Respawning" text
        if (this.text) {
            if (timerReady) {
                this.text.setText('Respawn Ready');
                this.text.setColor('#2ecc71'); // Green
            } else {
                this.text.setText('Respawning');
                this.text.setColor('#ffffff'); // White
            }
        }
        
        // Update timer display - hide when at 0 or below
        if (this.timer) {
            if (timerReady) {
                this.timer.setVisible(false);
            } else {
                const secondsRemaining = Math.ceil(remainingTimeMs / 1000);
                this.timer.setVisible(true);
                this.timer.setText(`${secondsRemaining}s`);
            }
        }
        
        // Show/hide reward cards based on unspent rewards (show immediately when respawning)
        this.rewardCardManager.setVisible(hasUnspentRewards);
        
        // Only show "Choose your rewards" text when reward cards are visible
        if (this.rewardsText) {
            this.rewardsText.setVisible(hasUnspentRewards);
        }
    }

    updateRewards(hero: HeroCombatant): void {
        this.rewardCardManager.updateRewards(hero);
    }

    updateSlainBy(killerName: string | null, killerTeam: string | null, isBot: boolean = false): void {
        if (this.slainByText && this.killerNameText) {
            if (killerName) {
                // "Slain by" stays white
                this.slainByText.setVisible(true);
                
                // Set killer name
                this.killerNameText.setText(killerName);
                this.killerNameText.setVisible(true);
                
                // Set color based on killer's team using CLIENT_CONFIG values
                if (killerTeam === 'blue') {
                    this.killerNameText.setColor(hexToColorString(CLIENT_CONFIG.TEAM_COLORS.BLUE));
                } else if (killerTeam === 'red') {
                    this.killerNameText.setColor(hexToColorString(CLIENT_CONFIG.TEAM_COLORS.RED));
                } else {
                    // Unknown killer or no team
                    this.killerNameText.setColor('#cccccc');
                }
                
                // Italicize if killer was a bot
                this.killerNameText.setFontStyle(isBot ? 'italic' : 'normal');
                
                // Center the combined text
                const totalWidth = this.slainByText.width + this.killerNameText.width;
                const centerX = CLIENT_CONFIG.GAME_CANVAS_WIDTH / 2;
                this.slainByText.setX(centerX - (totalWidth / 2));
                this.killerNameText.setX(centerX - (totalWidth / 2) + this.slainByText.width);
            } else {
                this.slainByText.setVisible(false);
                this.killerNameText.setVisible(false);
            }
        }
    }

    private updateBackground(): void {
        if (this.overlay) {
            this.overlay.clear();
            this.overlay.fillStyle(0x000000, 0.3);
            this.overlay.fillRect(0, 0, CLIENT_CONFIG.GAME_CANVAS_WIDTH, CLIENT_CONFIG.GAME_CANVAS_HEIGHT);
        }
    }

    showWithTimer(remainingTimeMs: number, hasUnspentRewards: boolean = false): void {
        this.updateTimer(remainingTimeMs, hasUnspentRewards);
        this.updateBackground();
        this.show();
    }

    isShowing(): boolean {
        return this.isVisible;
    }

    destroy(): void {
        if (this.hudContainer) {
            this.hudContainer.destroy();
            this.hudContainer = null;
        }
        
        [this.overlay, this.text, this.timer, this.rewardsText, this.deathSummaryHint, this.slainByText, this.killerNameText] = [null, null, null, null, null, null, null];
        this.rewardCardManager.destroy();
        this.isVisible = false;
    }
}
