import Phaser from 'phaser';
import { CLIENT_CONFIG } from '../../ClientConfig';
import { getCanvasWidth, getCanvasHeight } from '../utils/CanvasSize';
import { TextStyleHelper } from '../utils/TextStyleHelper';
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
    private timerCircle: Phaser.GameObjects.Graphics | null = null;
    private rewardsText: Phaser.GameObjects.Text | null = null;
    private deathSummaryHint: Phaser.GameObjects.Text | null = null;
    private slainByText: Phaser.GameObjects.Text | null = null;
    private killerNameText: Phaser.GameObjects.Text | null = null;
    private rewardCardManager: RewardCardManager;
    private isVisible: boolean = false;
    private onRewardChosen?: (rewardId: string) => void;
    private respawnDuration: number = 0; // Track total respawn duration

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
            getCanvasHeight() / 7, // Above the main text
            'Slain by ',
            TextStyleHelper.getStyleWithCustom('HEADER', {
                stroke: '#000000',
                strokeThickness: 2
            })
        );
        this.slainByText.setOrigin(0, 0.5); // Left-aligned
        this.slainByText.setDepth(CLIENT_CONFIG.RENDER_DEPTH.GAME_UI - 5);
        this.slainByText.setScrollFactor(0, 0); // Fixed to screen
        this.hudContainer.add(this.slainByText);
        
        // Create killer name text (colored based on team)
        this.killerNameText = this.scene.add.text(
            0, // Will be positioned dynamically
            getCanvasHeight() / 7, // Same position as "Slain by"
            '',
            TextStyleHelper.getStyleWithCustom('HEADER', {
                stroke: '#000000',
                strokeThickness: 2
            })
        );
        this.killerNameText.setOrigin(0, 0.5); // Left-aligned
        this.killerNameText.setDepth(CLIENT_CONFIG.RENDER_DEPTH.GAME_UI - 5);
        this.killerNameText.setScrollFactor(0, 0); // Fixed to screen
        this.hudContainer.add(this.killerNameText);
        
        // Create death summary hint text (below "Slain by")
        this.deathSummaryHint = this.scene.add.text(
            getCanvasWidth() / 2,
            getCanvasHeight() / 7 + 30, // Below the "Slain by" text
            'Hold "Shift" for Death Summary',
            TextStyleHelper.getSubtleHintStyle()
        );
        this.deathSummaryHint.setOrigin(0.5);
        this.deathSummaryHint.setDepth(CLIENT_CONFIG.RENDER_DEPTH.GAME_UI - 5);
        this.deathSummaryHint.setScrollFactor(0, 0); // Fixed to screen
        this.deathSummaryHint.setAlpha(0.7); // Make it more subtle
        this.hudContainer.add(this.deathSummaryHint);
        
        this.text = this.scene.add.text(
            getCanvasWidth() / 2,
            getCanvasHeight() / 7 + 90, // Moved down
            'Respawning',
            TextStyleHelper.getStyleWithCustom('TITLE', {
                stroke: '#000000',
                strokeThickness: 2
            })
        );
        this.text.setOrigin(0.5);
        this.text.setDepth(CLIENT_CONFIG.RENDER_DEPTH.GAME_UI - 5);
        this.text.setScrollFactor(0, 0); // Fixed to screen
        this.hudContainer.add(this.text);
        
        this.timer = this.scene.add.text(
            getCanvasWidth() / 2,
            getCanvasHeight() / 7 + 135, // Moved down with text
            '',
            TextStyleHelper.getStyleWithCustom('HEADER', {
                stroke: '#000000',
                strokeThickness: 3
            })
        );
        this.timer.setOrigin(0.5); // Center-aligned
        this.timer.setDepth(CLIENT_CONFIG.RENDER_DEPTH.GAME_UI - 5);
        this.timer.setScrollFactor(0, 0); // Fixed to screen
        this.hudContainer.add(this.timer);
        
        // Create circular timer progress ring
        this.timerCircle = this.scene.add.graphics();
        this.timerCircle.setDepth(CLIENT_CONFIG.RENDER_DEPTH.GAME_UI - 5);
        this.timerCircle.setScrollFactor(0, 0); // Fixed to screen
        this.hudContainer.add(this.timerCircle);
        
        this.rewardsText = this.scene.add.text(
            getCanvasWidth() / 2,
            getCanvasHeight() / 2 - 60, // Positioned higher above the reward cards
            'Choose your rewards',
            TextStyleHelper.getStyleWithCustom('TITLE', {
                color: '#f1c40f',
                stroke: '#000000',
                strokeThickness: 2
            })
        );
        this.rewardsText.setOrigin(0.5);
        this.rewardsText.setDepth(CLIENT_CONFIG.RENDER_DEPTH.GAME_UI - 5);
        this.rewardsText.setScrollFactor(0, 0); // Fixed to screen
        this.hudContainer.add(this.rewardsText);
        
        this.hide();
    }

    show(): void {
        if (this.overlay && this.text && this.timer && this.timerCircle && this.rewardsText && this.deathSummaryHint && this.slainByText && this.killerNameText) {
            // Only animate if not already visible to prevent flashing
            if (!this.isVisible) {
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
                
                // If timer circle is visible, animate it too
                if (this.timerCircle && this.timerCircle.visible) {
                    this.timerCircle.setAlpha(0);
                    this.scene.tweens.add({
                        targets: this.timerCircle,
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
            } else {
                // Just ensure elements are visible and at full alpha when already showing
                const elements = [this.overlay, this.text, this.deathSummaryHint, this.slainByText, this.killerNameText];
                elements.forEach(el => el.setVisible(true).setAlpha(1));
                
                // Update timer and timer circle visibility without animation
                if (this.timer && this.timer.visible) {
                    this.timer.setAlpha(1);
                }
                if (this.timerCircle && this.timerCircle.visible) {
                    this.timerCircle.setAlpha(1);
                }
                if (this.rewardsText && this.rewardsText.visible) {
                    this.rewardsText.setAlpha(1);
                }
            }
            
            this.isVisible = true;
        }
    }

    hide(): void {
        if (this.overlay && this.text && this.timer && this.timerCircle && this.rewardsText && this.deathSummaryHint && this.slainByText && this.killerNameText) {
            [this.overlay, this.text, this.timer, this.timerCircle, this.rewardsText, this.deathSummaryHint, this.slainByText, this.killerNameText].forEach(el => el.setVisible(false));
            this.rewardCardManager.setVisible(false);
            this.isVisible = false;
        }
    }

    updateTimer(remainingTimeMs: number, hasUnspentRewards: boolean = false): void {
        // Hide timer when at 0 or below
        const timerReady = remainingTimeMs <= 0;
        
        // Track respawn duration on first frame of respawning (when timer is highest)
        if (!timerReady && remainingTimeMs > this.respawnDuration) {
            this.respawnDuration = remainingTimeMs;
        }
        
        // Reset duration when respawn is complete
        if (timerReady) {
            this.respawnDuration = 0;
        }
        
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
        
        // Update circular timer progress ring
        if (this.timerCircle) {
            this.timerCircle.clear();
            if (!timerReady && this.respawnDuration > 0) {
                const respawnProgress = Math.max(0, Math.min(1, (this.respawnDuration - remainingTimeMs) / this.respawnDuration));
                
                const centerX = getCanvasWidth() / 2;
                const centerY = getCanvasHeight() / 7 + 135;
                const radius = 22; // Smaller radius around the timer text
                
                this.timerCircle.lineStyle(7, 0xffffff, 0.8); // Thicker white line
                this.timerCircle.beginPath();
                this.timerCircle.arc(centerX, centerY, radius, -Math.PI/2, -Math.PI/2 + (2 * Math.PI * respawnProgress));
                this.timerCircle.strokePath();
                this.timerCircle.setVisible(true);
            } else {
                this.timerCircle.setVisible(false);
            }
        }
        
        // Show/hide reward cards based on unspent rewards (show immediately when respawning)
        this.rewardCardManager.setVisible(hasUnspentRewards);
        
        // Only show "Choose your rewards" text when reward cards are visible
        if (this.rewardsText) {
            this.rewardsText.setVisible(hasUnspentRewards);
        }
    }

    updateRewards(hero: HeroCombatant, state?: any): void {
        this.rewardCardManager.updateRewards(hero, state);
    }
    
    updateTeamAbilityCounts(hero: HeroCombatant, state?: any): void {
        this.rewardCardManager.updateTeamAbilityCounts(hero, state);
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
                const centerX = getCanvasWidth() / 2;
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
			this.overlay.fillStyle(CLIENT_CONFIG.UI.OVERLAY.BACKGROUND, CLIENT_CONFIG.UI.OVERLAY.ALPHA);
            this.overlay.fillRect(0, 0, getCanvasWidth(), getCanvasHeight());
        }
    }

    showWithTimer(remainingTimeMs: number, hasUnspentRewards: boolean = false): void {
        this.updateTimer(remainingTimeMs, hasUnspentRewards);
        
        // Only update background if not already visible to prevent flashing
        if (!this.isVisible) {
            this.updateBackground();
        }
        
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
        
        [this.overlay, this.text, this.timer, this.timerCircle, this.rewardsText, this.deathSummaryHint, this.slainByText, this.killerNameText] = [null, null, null, null, null, null, null, null];
        this.rewardCardManager.destroy();
        this.isVisible = false;
    }
}
