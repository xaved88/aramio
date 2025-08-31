import Phaser from 'phaser';
import { CLIENT_CONFIG, GAMEPLAY_CONFIG } from '../../Config';

export class VictoryScreen {
    private scene: Phaser.Scene;
    private background: Phaser.GameObjects.Graphics | null = null;
    private victoryText: Phaser.GameObjects.Text | null = null;
    private isActive = false;
    private fadeInTween: Phaser.Tweens.Tween | null = null;
    private fadeOutTween: Phaser.Tweens.Tween | null = null;
    private onRestart: (() => void) | null = null;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }

    setRestartCallback(callback: () => void): void {
        this.onRestart = callback;
    }

    showVictory(winningTeam: string, playerTeam: string): void {
        if (this.isActive) return;
        
        this.isActive = true;
        const isVictory = winningTeam === playerTeam;
        
        // Create stylish background overlay with translucent black
        this.background = this.scene.add.graphics();
        this.background.setDepth(CLIENT_CONFIG.RENDER_DEPTH.MODALS); // Set high depth to appear above game entities and UI
        this.background.fillStyle(0x000000, 0.7); // 70% opacity black
        this.background.fillRect(0, 0, CLIENT_CONFIG.GAME_CANVAS_WIDTH, CLIENT_CONFIG.GAME_CANVAS_HEIGHT);
        this.background.setAlpha(0); // Start transparent for fade in
        
        // Create victory/defeat text with better styling
        const text = isVictory ? 'VICTORY!' : 'DEFEAT!';
        const textColor = isVictory ? '#FFFFFF' : '#FF6B6B'; // White for victory, red for defeat
        
        this.victoryText = this.scene.add.text(
            CLIENT_CONFIG.GAME_CANVAS_WIDTH / 2,
            CLIENT_CONFIG.GAME_CANVAS_HEIGHT / 2,
            text,
            {
                fontSize: '72px',
                color: textColor,
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 4,
                shadow: {
                    offsetX: 2,
                    offsetY: 2,
                    color: '#000000',
                    blur: 4,
                    fill: true
                }
            }
        ).setOrigin(0.5).setDepth(CLIENT_CONFIG.RENDER_DEPTH.MODALS).setAlpha(0); // Set high depth to appear above other UI
        
        // Fade in animation
        this.fadeInTween = this.scene.tweens.add({
            targets: [this.background, this.victoryText],
            alpha: 1,
            duration: GAMEPLAY_CONFIG.VICTORY_SCREEN.FADE_IN_DURATION_MS,
            ease: 'Power2',
            onComplete: () => {
                // After display duration, fade out
                this.scene.time.delayedCall(
                    GAMEPLAY_CONFIG.VICTORY_SCREEN.DISPLAY_DURATION_MS,
                    () => this.fadeOut()
                );
            }
        });
    }

    private fadeOut(): void {
        if (!this.background || !this.victoryText) return;
        
        this.fadeOutTween = this.scene.tweens.add({
            targets: [this.background, this.victoryText],
            alpha: 0,
            duration: GAMEPLAY_CONFIG.VICTORY_SCREEN.FADE_OUT_DURATION_MS,
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
        
        if (this.background) {
            this.background.destroy();
            this.background = null;
        }
        if (this.victoryText) {
            this.victoryText.destroy();
            this.victoryText = null;
        }
        
        this.isActive = false;
    }

    isShowing(): boolean {
        return this.isActive;
    }
} 
