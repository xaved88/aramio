import Phaser from 'phaser';
import { CLIENT_CONFIG } from '../../ClientConfig';
import { getCanvasWidth, getCanvasHeight } from '../utils/CanvasSize';
import { TextStyleHelper } from '../utils/TextStyleHelper';
import { HUDContainer } from './HUDContainer';
import { hexToColorString } from '../utils/ColorUtils';

/**
 * TutorialOverlay displays an introductory tutorial for new players
 */
export class TutorialOverlay {
    private scene: Phaser.Scene;
    private hudCamera: Phaser.Cameras.Scene2D.Camera | null = null;
    private cameraManager: any = null;
    private hudContainer: HUDContainer | null = null;
    private overlay: Phaser.GameObjects.Graphics | null = null;
    private contentContainer: Phaser.GameObjects.Container | null = null;
    private isVisible: boolean = false;
    private onDismiss?: () => void;

    constructor(scene: Phaser.Scene, onDismiss?: () => void) {
        this.scene = scene;
        this.onDismiss = onDismiss;
        this.createOverlay();
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

    private createOverlay(): void {
        // Create HUD container
        this.hudContainer = new HUDContainer(this.scene);
        this.hudContainer.setDepth(CLIENT_CONFIG.RENDER_DEPTH.GAME_UI + 50);
        
        if (this.cameraManager) {
            this.hudContainer.setCameraManager(this.cameraManager);
        }
        
        // Create dark overlay background
        this.overlay = this.scene.add.graphics();
        this.overlay.setDepth(CLIENT_CONFIG.RENDER_DEPTH.GAME_UI + 50);
        this.overlay.setScrollFactor(0, 0);
        this.overlay.setVisible(false); // Start hidden
        this.hudContainer.add(this.overlay);
        
        // Create content container
        this.contentContainer = this.scene.add.container(0, 0);
        this.contentContainer.setDepth(CLIENT_CONFIG.RENDER_DEPTH.GAME_UI + 50);
        this.contentContainer.setScrollFactor(0, 0);
        this.contentContainer.setVisible(false); // Start hidden
        this.hudContainer.add(this.contentContainer);
        
        this.buildContent();
    }

    private buildContent(): void {
        if (!this.contentContainer) return;
        
        const centerX = getCanvasWidth() / 2;
        const centerY = getCanvasHeight() / 2;
        const contentWidth = 600;
        const contentHeight = Math.min(700, getCanvasHeight() - 60); // Max 700px height, with 30px margin
        const leftX = centerX - contentWidth / 2;
        const startY = centerY - contentHeight / 2;
        
        // Panel background - centered
        const panelHeight = contentHeight;
        const panelBg = this.scene.add.graphics();
        panelBg.fillStyle(CLIENT_CONFIG.UI.BACKGROUND.LOBBY);
        panelBg.fillRoundedRect(leftX - 20, startY - 20, contentWidth + 40, panelHeight + 40, 10);
        panelBg.lineStyle(2, 0x3498db, 1);
        panelBg.strokeRoundedRect(leftX - 20, startY - 20, contentWidth + 40, panelHeight + 40, 10);
        this.contentContainer.add(panelBg);
        
        // Close button (X) in top right corner of panel
        const closeButtonSize = 30;
        const closeButtonX = leftX + contentWidth + 20 - closeButtonSize / 2 - 10; // 10px from right edge
        const closeButtonY = startY - 20 + closeButtonSize / 2 + 10; // 10px from top edge
        
        const closeBg = this.scene.add.circle(closeButtonX, closeButtonY, closeButtonSize / 2, CLIENT_CONFIG.UI.BUTTON_COLORS.SUBTLE);
        closeBg.setStrokeStyle(2, CLIENT_CONFIG.UI.COLORS.BORDER);
        this.contentContainer.add(closeBg);
        
        const closeText = this.scene.add.text(closeButtonX, closeButtonY, '×', 
            TextStyleHelper.getStyle('TITLE_MEDIUM'));
        closeText.setOrigin(0.5);
        this.contentContainer.add(closeText);
        
        // Make close button interactive
        const closeZone = this.scene.add.zone(closeButtonX - closeButtonSize / 2, closeButtonY - closeButtonSize / 2, closeButtonSize, closeButtonSize);
        closeZone.setOrigin(0, 0);
        closeZone.setInteractive();
        closeZone.setScrollFactor(0, 0);
        this.contentContainer.add(closeZone);
        
        closeZone.on('pointerover', () => {
            closeBg.setFillStyle(CLIENT_CONFIG.UI.BUTTON_COLORS.SUBTLE_HOVER);
        });
        
        closeZone.on('pointerout', () => {
            closeBg.setFillStyle(CLIENT_CONFIG.UI.BUTTON_COLORS.SUBTLE);
        });
        
        closeZone.on('pointerdown', (pointer: Phaser.Input.Pointer, localX: number, localY: number, event: Phaser.Types.Input.EventData) => {
            // Stop event propagation to prevent ability firing
            event.stopPropagation();
            
            this.hide();
            if (this.onDismiss) {
                this.onDismiss();
            }
        });
        
        let currentY = startY;
        
        // Title
        const title = this.scene.add.text(centerX, currentY, 'Welcome to ARAM.IO!', 
            TextStyleHelper.getStyleWithColor('TITLE_MEDIUM', '#3498db'));
        title.setOrigin(0.5, 0);
        this.contentContainer.add(title);
        currentY += 50;
        
        // Welcome text
        const welcomeText = this.scene.add.text(centerX, currentY, 
            'Casual MOBA action! Level up, unlock abilities,\nand destroy the enemy Cradle to claim victory!', 
            TextStyleHelper.getStyleWithCustom('BODY_MEDIUM', {
                align: 'center',
                wordWrap: { width: contentWidth - 40 }
            })
        );
        welcomeText.setOrigin(0.5, 0);
        this.contentContainer.add(welcomeText);
        currentY += 70;
        
        // Controls section
        const controlsTitle = this.scene.add.text(leftX, currentY, 'How to Play:', 
            TextStyleHelper.getStyleWithColor('HEADER', '#f1c40f'));
        this.contentContainer.add(controlsTitle);
        currentY += 30;
        
        const controlsStartY = currentY;
        
        const controlsList = [
            '- Your hero follows your mouse cursor',
            '- An enemy within your attack radius will be auto-attacked',
            '- Click to aim your special Ability, release to fire',
            '- Gather xp from defeating enemies',
            '- Choose level-up rewards while respawning',
            '',
            '\'T\': Toggle this tutorial',
        ];
        
        const controlsText = this.scene.add.text(leftX + 20, currentY, controlsList.join('\n'), 
            TextStyleHelper.getStyleWithCustom('BODY_SMALL', {
                lineSpacing: 5
            }));
        this.contentContainer.add(controlsText);
        
        // Hero visualization with attack radius (right side of controls) - moved up
        const heroVisualizationX = leftX + 480;
        const heroVisualizationY = controlsStartY + 20;
        
        // Draw attack radius circle (using same style as in-game, but larger for label space)
        const radiusGraphics = this.scene.add.graphics();
        radiusGraphics.lineStyle(
            CLIENT_CONFIG.RADIUS_INDICATOR.LINE_THICKNESS, 
            CLIENT_CONFIG.RADIUS_INDICATOR.LINE_COLOR, 
            CLIENT_CONFIG.RADIUS_INDICATOR.LINE_ALPHA
        );
        radiusGraphics.strokeCircle(heroVisualizationX, heroVisualizationY, 55); // Slightly larger than default 50 for label space
        this.contentContainer.add(radiusGraphics);
        
        // Draw hero image
        const heroVisual = this.scene.add.image(heroVisualizationX, heroVisualizationY, 'hero-base');
        heroVisual.setScale(40 / heroVisual.width); // Scale proportionally based on width
        this.contentContainer.add(heroVisual);
        
        // Add "Your Hero" label beneath the hero
        const heroLabel = this.scene.add.text(heroVisualizationX, heroVisualizationY + 27, 'Your Hero', 
            TextStyleHelper.getSubtleHintStyle());
        heroLabel.setOrigin(0.5);
        this.contentContainer.add(heroLabel);
        
        // Add label for attack radius (to the right of the circle)
        const radiusLabel = this.scene.add.text(heroVisualizationX + 62, heroVisualizationY, 'Auto-Attack\nRadius', 
            TextStyleHelper.getSubtleHintStyle());
        radiusLabel.setOrigin(0, 0.5);
        this.contentContainer.add(radiusLabel);
        
        // Game entities visualization (below hero visualization) - horizontal layout
        const entitiesY = heroVisualizationY + 80;
        const entitiesStartX = heroVisualizationX - 80;
        
        // Minions section (left side)
        const minionData = [
            { key: 'minion-warrior', name: 'Warrior', size: 24 },
            { key: 'minion-archer', name: 'Archer', size: 24 }
        ];
        
        const minionsTitle = this.scene.add.text(entitiesStartX - 14, entitiesY, 'Minions:', 
            TextStyleHelper.getSubtleHintStyle());
        minionsTitle.setOrigin(0, 0.5);
        this.contentContainer.add(minionsTitle);
        
        let minionY = entitiesY + 28;
        for (const entity of minionData) {
            // Entity image
            const entityImage = this.scene.add.image(entitiesStartX, minionY, entity.key);
            entityImage.setScale(entity.size / entityImage.width); // Scale proportionally
            this.contentContainer.add(entityImage);
            
            // Entity label
            const entityLabel = this.scene.add.text(entitiesStartX + entity.size / 2 + 10, minionY, entity.name, 
                TextStyleHelper.getStyleWithColor('BODY_SMALL', '#cccccc'));
            entityLabel.setOrigin(0, 0.5);
            this.contentContainer.add(entityLabel);
            
            minionY += 35;
        }
        
        // Structures section (right side)
        const structuresStartX = entitiesStartX + 120;
        const structureData = [
            { key: 'structure-turret', name: 'Turret', size: 26 },
            { key: 'structure-cradle', name: 'Cradle', size: 28 }
        ];
        
        const structuresTitle = this.scene.add.text(structuresStartX - 14, entitiesY, 'Structures:', 
            TextStyleHelper.getSubtleHintStyle());
        structuresTitle.setOrigin(0, 0.5);
        this.contentContainer.add(structuresTitle);
        
        let structureY = entitiesY + 28;
        for (const entity of structureData) {
            // Entity image
            const entityImage = this.scene.add.image(structuresStartX, structureY, entity.key);
            // Both structures get squashed to square
            entityImage.setDisplaySize(entity.size, entity.size);
            this.contentContainer.add(entityImage);
            
            // Entity label
            const entityLabel = this.scene.add.text(structuresStartX + entity.size / 2 + 10, structureY, entity.name, 
                TextStyleHelper.getStyleWithColor('BODY_SMALL', '#cccccc'));
            entityLabel.setOrigin(0, 0.5);
            this.contentContainer.add(entityLabel);
            
            structureY += 35;
        }
        
        currentY += 170;
        
        // Heroes section
        const heroesTitle = this.scene.add.text(leftX, currentY, 'Hero Abilities:', 
            TextStyleHelper.getStyleWithColor('HEADER', '#f1c40f'));
        this.contentContainer.add(heroesTitle);
        currentY += 60;
        
        // Display hero types with images and descriptions - use CLIENT_CONFIG to avoid duplication
        // Strip "Ability: " prefix from titles for cleaner display
        const heroData = [
            { type: 'default', name: 'Starter', desc: 'Basic projectile attack' },
            { type: 'hookshot', name: CLIENT_CONFIG.REWARDS.DISPLAY['ability:hookshot'].title.replace('Ability: ', ''), desc: CLIENT_CONFIG.REWARDS.DISPLAY['ability:hookshot'].description },
            { type: 'mercenary', name: CLIENT_CONFIG.REWARDS.DISPLAY['ability:mercenary'].title.replace('Ability: ', ''), desc: CLIENT_CONFIG.REWARDS.DISPLAY['ability:mercenary'].description },
            { type: 'pyromancer', name: CLIENT_CONFIG.REWARDS.DISPLAY['ability:pyromancer'].title.replace('Ability: ', ''), desc: CLIENT_CONFIG.REWARDS.DISPLAY['ability:pyromancer'].description },
            { type: 'sniper', name: CLIENT_CONFIG.REWARDS.DISPLAY['ability:sniper'].title.replace('Ability: ', ''), desc: CLIENT_CONFIG.REWARDS.DISPLAY['ability:sniper'].description },
            { type: 'thorndive', name: CLIENT_CONFIG.REWARDS.DISPLAY['ability:thorndive'].title.replace('Ability: ', ''), desc: CLIENT_CONFIG.REWARDS.DISPLAY['ability:thorndive'].description }
        ];
        
        const heroIconSize = 40;
        const heroSpacing = 95;
        const heroStartX = leftX + 30;
        
        for (let i = 0; i < heroData.length; i++) {
            const hero = heroData[i];
            const col = i % 3;
            const row = Math.floor(i / 3);
            const x = heroStartX + col * (heroSpacing * 2);
            const y = currentY + row * 50;
            
            // Hero image
            const heroKey = hero.type === 'default' ? 'hero-base' : `hero-${hero.type}`;
            const heroImage = this.scene.add.image(x, y, heroKey);
            heroImage.setScale(heroIconSize / heroImage.width); // Scale proportionally
            // No tint - show original sprite colors (team colors are applied via shaders in-game)
            this.contentContainer.add(heroImage);
            
            // Hero name (bold and larger)
            const heroName = this.scene.add.text(x + heroIconSize / 2 + 10, y - 15, 
                hero.name, 
                TextStyleHelper.getStyle('BODY_SMALL')
            );
            this.contentContainer.add(heroName);
            
            // Hero description (smaller and normal weight)
            const heroDesc = this.scene.add.text(x + heroIconSize / 2 + 10, y + 2, 
                hero.desc, 
                TextStyleHelper.getStyleWithCustom('BODY_TINY', {
                    wordWrap: { width: 120 }
                })
            );
            this.contentContainer.add(heroDesc);
        }
        currentY += 100;
        
        // Advanced Controls section
        const advancedControlsTitle = this.scene.add.text(leftX, currentY, 'Advanced Controls:', 
            TextStyleHelper.getStyleWithColor('HEADER', '#f1c40f'));
        this.contentContainer.add(advancedControlsTitle);
        currentY += 30;
        
        const advancedControlsList = [
            '- \'Tab\': Hold to open Stats',
            '- \'Shift\': Hold to open Damage Summary',
            '- \'Ctrl\': Hold to open Cheat Menu (sneaky)',
            '',
            'Toggle Control Mode in bottom right',
            '- Keyboard Mode: \'WASD\' to move',
        ];
        
        const advancedControlsText = this.scene.add.text(leftX + 20, currentY, advancedControlsList.join('\n'), 
            TextStyleHelper.getStyleWithCustom('BODY_SMALL', {
                lineSpacing: 5
            }));
        this.contentContainer.add(advancedControlsText);
        
        // Pyromancer icon visualization (right side of advanced controls)
        const pyroIconX = leftX + 480;
        const pyroIconY = currentY + 50;
        
        const pyroIcon = this.scene.add.image(pyroIconX, pyroIconY, 'pyromancer-icon');
        pyroIcon.setScale(100 / pyroIcon.width); // Scale proportionally
        this.contentContainer.add(pyroIcon);
    }

    show(): void {
        if (this.overlay && this.contentContainer) {
            // Kill any existing tweens to prevent animation conflicts
            this.scene.tweens.killTweensOf([this.overlay, this.contentContainer]);
            
            this.updateBackground();
            
            this.overlay.setAlpha(0).setVisible(true);
            this.contentContainer.setAlpha(0).setVisible(true);
            
            this.scene.tweens.add({
                targets: [this.overlay, this.contentContainer],
                alpha: 1,
                duration: 300,
                ease: 'Power2'
            });
            
            this.isVisible = true;
        }
    }

    hide(): void {
        if (this.overlay && this.contentContainer) {
            // Kill any existing tweens to prevent animation conflicts
            this.scene.tweens.killTweensOf([this.overlay, this.contentContainer]);
            
            this.scene.tweens.add({
                targets: [this.overlay, this.contentContainer],
                alpha: 0,
                duration: 300,
                ease: 'Power2',
                onComplete: () => {
                    if (this.overlay && this.contentContainer) {
                        this.overlay.setVisible(false);
                        this.contentContainer.setVisible(false);
                    }
                }
            });
            
            this.isVisible = false;
        }
    }

    private updateBackground(): void {
        if (this.overlay) {
            this.overlay.clear();
            this.overlay.fillStyle(CLIENT_CONFIG.UI.OVERLAY.BACKGROUND, CLIENT_CONFIG.UI.OVERLAY.ALPHA);
            this.overlay.fillRect(0, 0, getCanvasWidth(), getCanvasHeight());
        }
    }

    isShowing(): boolean {
        return this.isVisible;
    }

    toggle(): void {
        if (this.isVisible) {
            this.hide();
            if (this.onDismiss) {
                this.onDismiss();
            }
        } else {
            this.show();
        }
    }

    destroy(): void {
        if (this.hudContainer) {
            this.hudContainer.destroy();
            this.hudContainer = null;
        }
        
        this.overlay = null;
        this.contentContainer = null;
        this.isVisible = false;
    }
}

