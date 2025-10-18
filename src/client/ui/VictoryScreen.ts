import Phaser from 'phaser';
import { CLIENT_CONFIG } from '../../ClientConfig';
import { TextStyleHelper } from '../utils/TextStyleHelper';
import { HUDContainer } from './HUDContainer';
import { getCanvasWidth, getCanvasHeight } from '../utils/CanvasSize';

export class VictoryScreen {
    private scene: Phaser.Scene;
    private hudCamera: Phaser.Cameras.Scene2D.Camera | null = null;
    private cameraManager: any = null;
    private hudContainer: HUDContainer | null = null;
    private background: Phaser.GameObjects.Graphics | null = null;
    private victoryText: Phaser.GameObjects.Text | null = null;
    private isActive = false;
    private fadeInTween: Phaser.Tweens.Tween | null = null;
    private fadeOutTween: Phaser.Tweens.Tween | null = null;
    private onRestart: (() => void) | null = null;
    private onShowStats: ((state: any, winningTeam: string, playerTeam: string) => void) | null = null;
    private currentWinningTeam: string = '';
    private currentPlayerTeam: string = '';
    private currentState: any = null;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
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

    setRestartCallback(callback: () => void): void {
        this.onRestart = callback;
    }

    setShowStatsCallback(callback: (state: any, winningTeam: string, playerTeam: string) => void): void {
        this.onShowStats = callback;
    }

    showVictory(winningTeam: string, playerTeam: string, state?: any): void {
        if (this.isActive) return;
        
        this.isActive = true;
        this.currentWinningTeam = winningTeam;
        this.currentPlayerTeam = playerTeam;
        this.currentState = state;
        const isVictory = winningTeam === playerTeam;
        
        // Create HUD container
        this.hudContainer = new HUDContainer(this.scene);
        this.hudContainer.setDepth(CLIENT_CONFIG.RENDER_DEPTH.MODALS);
        
        if (this.cameraManager) {
            this.hudContainer.setCameraManager(this.cameraManager);
        }
        
        // Create stylish background overlay with translucent black
        this.background = this.scene.add.graphics();
        this.background.setDepth(CLIENT_CONFIG.RENDER_DEPTH.MODALS);
        this.background.setScrollFactor(0); // Make background camera-independent
        this.background.fillStyle(CLIENT_CONFIG.UI.OVERLAY.BACKGROUND, CLIENT_CONFIG.UI.OVERLAY.ALPHA);
        this.background.fillRect(0, 0, getCanvasWidth(), getCanvasHeight());
        this.background.setAlpha(0);
        this.hudContainer.add(this.background);
        
        // Create victory/defeat text with better styling
        const text = isVictory ? 'VICTORY!' : 'DEFEAT!';
        const textColor = isVictory ? CLIENT_CONFIG.VICTORY_COLORS.VICTORY : CLIENT_CONFIG.VICTORY_COLORS.DEFEAT;
        
        this.victoryText = this.scene.add.text(
            getCanvasWidth() / 2,
            getCanvasHeight() / 2,
            text,
            TextStyleHelper.getStyleWithCustom('TITLE_LARGE', {
                color: textColor,
                strokeThickness: 4,
                shadow: {
                    offsetX: 2,
                    offsetY: 2,
                    color: '#000000',
                    blur: 4,
                    fill: true
                }
            })
        ).setOrigin(0.5).setDepth(CLIENT_CONFIG.RENDER_DEPTH.MODALS).setScrollFactor(0).setAlpha(0); // Make text camera-independent
        
        this.hudContainer.add(this.victoryText);
        
        // Fade in animation
        this.fadeInTween = this.scene.tweens.add({
            targets: [this.background, this.victoryText],
            alpha: 1,
            duration: CLIENT_CONFIG.VICTORY_SCREEN.FADE_IN_DURATION_MS,
            ease: 'Power2',
            onComplete: () => {
                // After display duration, fade out and show stats
                this.scene.time.delayedCall(
                    3000, // Show victory screen for 3 seconds
                    () => this.transitionToStats()
                );
            }
        });
    }

    private transitionToStats(): void {
        if (!this.background || !this.victoryText) return;
        
        this.fadeOutTween = this.scene.tweens.add({
            targets: [this.background, this.victoryText],
            alpha: 0,
            duration: CLIENT_CONFIG.VICTORY_SCREEN.FADE_OUT_DURATION_MS,
            ease: 'Power2',
            onComplete: () => {
                this.destroy();
                if (this.onShowStats) {
                    this.onShowStats(this.currentState, this.currentWinningTeam, this.currentPlayerTeam);
                }
            }
        });
    }

    private fadeOut(): void {
        if (!this.background || !this.victoryText) return;
        
        this.fadeOutTween = this.scene.tweens.add({
            targets: [this.background, this.victoryText],
            alpha: 0,
            duration: CLIENT_CONFIG.VICTORY_SCREEN.FADE_OUT_DURATION_MS,
            ease: 'Power2',
            onComplete: () => {
                this.destroy();
                if (this.onRestart) {
                    this.onRestart();
                }
            }
        });
    }

    destroy(): void {
        if (this.fadeInTween) {
            this.fadeInTween.stop();
            this.fadeInTween = null;
        }
        if (this.fadeOutTween) {
            this.fadeOutTween.stop();
            this.fadeOutTween = null;
        }
        
        if (this.hudContainer) {
            this.hudContainer.destroy();
            this.hudContainer = null;
        }
        
        this.background = null;
        this.victoryText = null;
        
        this.isActive = false;
    }

    isShowing(): boolean {
        return this.isActive;
    }
} 
