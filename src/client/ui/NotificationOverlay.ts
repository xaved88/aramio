import Phaser from 'phaser';
import { HUDContainer } from './HUDContainer';
import { CLIENT_CONFIG } from '../../ClientConfig';

export class NotificationOverlay {
    private scene: Phaser.Scene;
    private hudCamera: Phaser.Cameras.Scene2D.Camera | null = null;
    private cameraManager: any = null;
    private hudContainer: HUDContainer | null = null;
    private background: Phaser.GameObjects.Graphics | null = null;
    private titleText: Phaser.GameObjects.Text | null = null;
    private subtitleText: Phaser.GameObjects.Text | null = null;
    private isVisible: boolean = false;
    private fadeTween: Phaser.Tweens.Tween | null = null;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.createContainer();
    }

    setHUDCamera(camera: Phaser.Cameras.Scene2D.Camera): void {
        this.hudCamera = camera;
    }

    setCameraManager(cameraManager: any): void {
        this.cameraManager = cameraManager;
        if (this.hudContainer) {
            this.hudContainer.setCameraManager(cameraManager);
        }
    }

    private createContainer(): void {
        // Create HUD container
        this.hudContainer = new HUDContainer(this.scene);
        this.hudContainer.setDepth(CLIENT_CONFIG.RENDER_DEPTH.MODALS);
        
        // Create background overlay
        this.background = this.scene.add.graphics();
        this.background.setDepth(CLIENT_CONFIG.RENDER_DEPTH.MODALS);
        this.background.setScrollFactor(0); // Make background camera-independent
        this.background.setAlpha(0);
        this.hudContainer.add(this.background);
        
        // Create title text
        this.titleText = this.scene.add.text(0, 0, '', {
            fontSize: '32px',
            fontFamily: 'Arial',
            color: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 3,
            align: 'center'
        });
        this.titleText.setDepth(CLIENT_CONFIG.RENDER_DEPTH.MODALS);
        this.titleText.setScrollFactor(0);
        this.titleText.setOrigin(0.5, 0.5);
        this.titleText.setAlpha(0);
        this.hudContainer.add(this.titleText);
        
        // Create subtitle text
        this.subtitleText = this.scene.add.text(0, 0, '', {
            fontSize: '18px',
            fontFamily: 'Arial',
            color: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 2,
            align: 'center'
        });
        this.subtitleText.setDepth(CLIENT_CONFIG.RENDER_DEPTH.MODALS);
        this.subtitleText.setScrollFactor(0);
        this.subtitleText.setOrigin(0.5, 0.5);
        this.subtitleText.setAlpha(0);
        this.hudContainer.add(this.subtitleText);
        
        // Initially hide the container
        this.hudContainer.setVisible(false);
    }

    showSuperMinionTriggerNotification(triggeredTeam: string): void {
        // If already visible, just return - don't show duplicate notifications
        if (this.isVisible) {
            return;
        }
        
        this.isVisible = true;
        this.hudContainer?.setVisible(true);
        
        // Set team colors (show the team whose super minions are triggered)
        const isBlue = triggeredTeam === 'blue';
        const teamColor = isBlue ? 0x4A90E2 : 0xE24A4A; // Blue for blue team, Red for red team
        const teamName = isBlue ? 'Blue' : 'Red';
        
        // Create background with team color
        const overlayWidth = 600;
        const overlayHeight = 150;
        const centerX = CLIENT_CONFIG.GAME_CANVAS_WIDTH / 2;
        const centerY = CLIENT_CONFIG.GAME_CANVAS_HEIGHT / 4; // Top quarter of screen
        
        this.background?.clear();
        this.background?.fillStyle(teamColor, 0.9);
        this.background?.fillRoundedRect(
            centerX - overlayWidth / 2, 
            centerY - overlayHeight / 2, 
            overlayWidth, 
            overlayHeight, 
            20
        );
        
        // Add border
        this.background?.lineStyle(4, 0xFFFFFF, 1);
        this.background?.strokeRoundedRect(
            centerX - overlayWidth / 2, 
            centerY - overlayHeight / 2, 
            overlayWidth, 
            overlayHeight, 
            20
        );
        
        // Set text content
        this.titleText?.setText(`${teamName} Super Minions will now spawn!`);
        // Show the opposing team's turrets that were destroyed (the trigger)
        const destroyedTeamName = teamName.toLowerCase() === 'blue' ? 'red' : 'blue';
        this.subtitleText?.setText(`All ${destroyedTeamName} turrets destroyed!`);
        
        // Position text in center of overlay
        this.titleText?.setPosition(centerX, centerY - 15);
        this.subtitleText?.setPosition(centerX, centerY + 15);
        
        // Fade in animation
        this.fadeTween?.destroy();
        this.fadeTween = this.scene.tweens.add({
            targets: [this.background, this.titleText, this.subtitleText],
            alpha: 1,
            duration: 500,
            ease: 'Power2',
            onComplete: () => {
                // Auto-hide after 4 seconds
                this.scene.time.delayedCall(4000, () => {
                    this.hide();
                });
            }
        });
    }

    hide(): void {
        if (!this.isVisible) return;
        
        this.fadeTween?.destroy();
        this.fadeTween = this.scene.tweens.add({
            targets: [this.background, this.titleText, this.subtitleText],
            alpha: 0,
            duration: 500,
            ease: 'Power2',
            onComplete: () => {
                this.isVisible = false;
                this.hudContainer?.setVisible(false);
            }
        });
    }

    destroy(): void {
        this.fadeTween?.destroy();
        this.hudContainer?.destroy();
    }
}
