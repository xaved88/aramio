import Phaser from 'phaser';
import { HUDContainer } from './HUDContainer';
import { CLIENT_CONFIG } from '../../ClientConfig';
import { TextStyleHelper } from '../utils/TextStyleHelper';
import { getCanvasWidth, getCanvasHeight } from '../utils/CanvasSize';

export enum NotificationType {
    SUPERMINION_SPAWN = 'superminion_spawn',
    KILLING_SPREE = 'killing_spree',      // 5 kills without dying
    RAMPAGE = 'rampage',                  // 10 kills without dying
    UNSTOPPABLE = 'unstoppable'           // 15 kills without dying
    // Add more notification types as needed
}

// Priority levels - higher number = higher priority (shown on top)
export enum NotificationPriority {
    KILLING_SPREE = 1,
    RAMPAGE = 2,
    UNSTOPPABLE = 3,
    SUPERMINION_SPAWN = 4
}

export interface NotificationContent {
    title: string | ((team: string, heroName?: string) => string);
    subtitle: string | ((team: string, heroName?: string) => string);
}

export interface NotificationConfig {
    type: NotificationType;
    team: string;
    heroName?: string; // Hero display name (required for kill streak notifications)
    priority?: NotificationPriority; // Optional priority override
}

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
    private currentConfig: NotificationConfig | null = null;

    // Notification content configuration
    private notificationContent: Record<NotificationType, NotificationContent> = {
        [NotificationType.SUPERMINION_SPAWN]: {
            title: (team: string) => `${team} Super Minions will now spawn!`,
            subtitle: (team: string) => {
                const opposingTeam = team.toLowerCase() === 'blue' ? 'red' : 'blue';
                return `All ${opposingTeam} turrets destroyed!`;
            }
        },
        [NotificationType.KILLING_SPREE]: {
            title: (team: string, heroName?: string) => `${heroName} Killing Spree!`,
            subtitle: (team: string, heroName?: string) => `${heroName} has 5 kills without dying!`
        },
        [NotificationType.RAMPAGE]: {
            title: (team: string, heroName?: string) => `${heroName} Rampage!`,
            subtitle: (team: string, heroName?: string) => `${heroName} has 10 kills without dying!`
        },
        [NotificationType.UNSTOPPABLE]: {
            title: (team: string, heroName?: string) => `${heroName} Unstoppable!`,
            subtitle: (team: string, heroName?: string) => `${heroName} has 15 kills without dying!`
        }
    };

    // Default priority mapping for notification types
    private defaultPriority: Record<NotificationType, NotificationPriority> = {
        [NotificationType.KILLING_SPREE]: NotificationPriority.KILLING_SPREE,
        [NotificationType.RAMPAGE]: NotificationPriority.RAMPAGE,
        [NotificationType.UNSTOPPABLE]: NotificationPriority.UNSTOPPABLE,
        [NotificationType.SUPERMINION_SPAWN]: NotificationPriority.SUPERMINION_SPAWN
    };

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
        this.titleText = this.scene.add.text(0, 0, '', 
            TextStyleHelper.getStyleWithCustom('TITLE_SMALL', {
                align: 'center'
            }));
        this.titleText.setDepth(CLIENT_CONFIG.RENDER_DEPTH.MODALS);
        this.titleText.setScrollFactor(0);
        this.titleText.setOrigin(0.5, 0.5);
        this.titleText.setAlpha(0);
        this.hudContainer.add(this.titleText);
        
        // Create subtitle text
        this.subtitleText = this.scene.add.text(0, 0, '', 
            TextStyleHelper.getStyleWithCustom('BODY_SMALL', {
                align: 'center'
            }));
        this.subtitleText.setDepth(CLIENT_CONFIG.RENDER_DEPTH.MODALS);
        this.subtitleText.setScrollFactor(0);
        this.subtitleText.setOrigin(0.5, 0.5);
        this.subtitleText.setAlpha(0);
        this.hudContainer.add(this.subtitleText);
        
        // Initially hide the container
        this.hudContainer.setVisible(false);
    }

    showNotification(config: NotificationConfig): void {
        // Get the priority for this notification
        const priority = config.priority || this.defaultPriority[config.type];
        
        // If a notification is already visible, check if this one has higher priority
        if (this.isVisible && this.currentConfig) {
            const currentPriority = this.currentConfig.priority || this.defaultPriority[this.currentConfig.type];
            
            // If current notification has equal or higher priority, don't interrupt it
            if (currentPriority >= priority) {
                return;
            }
            
            // Higher priority notification - interrupt the current one
            this.hide();
        }
        
        this.currentConfig = config;
        this.isVisible = true;
        this.hudContainer?.setVisible(true);
        
        // Set team colors
        const isBlue = config.team === 'blue';
        const teamColor = isBlue ? 0x4A90E2 : 0xE24A4A; // Blue for blue team, Red for red team
        const teamName = isBlue ? 'Blue' : 'Red';
        
        // Get notification content
        const content = this.notificationContent[config.type];
        const titleText = typeof content.title === 'function' ? content.title(teamName, config.heroName) : content.title;
        const subtitleText = typeof content.subtitle === 'function' ? content.subtitle(teamName, config.heroName) : content.subtitle;
        
        // Create background with team color
        const overlayWidth = 400;
        const overlayHeight = 80;
        const centerX = getCanvasWidth() / 2;
        const centerY = getCanvasHeight() / 4; // Top quarter of screen
        
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
        this.titleText?.setText(titleText);
        this.subtitleText?.setText(subtitleText);
        
        // Position text in center of overlay
        this.titleText?.setPosition(centerX, centerY - 10);
        this.subtitleText?.setPosition(centerX, centerY + 15);
        
        // Fade in animation
        this.fadeTween?.destroy();
        this.fadeTween = this.scene.tweens.add({
            targets: [this.background, this.titleText, this.subtitleText],
            alpha: 1,
            duration: 500,
            ease: 'Power2',
            onComplete: () => {
                // Auto-hide after 2 seconds
                this.scene.time.delayedCall(2000, () => {
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
                this.currentConfig = null;
                this.hudContainer?.setVisible(false);
            }
        });
    }

    destroy(): void {
        this.fadeTween?.destroy();
        this.hudContainer?.destroy();
    }
}
