import Phaser from 'phaser';
import { CLIENT_CONFIG } from '../../../ClientConfig';
import { getCanvasWidth, getCanvasHeight } from '../../utils/CanvasSize';
import { TextStyleHelper } from '../../utils/TextStyleHelper';
import { TutorialStep } from '../TutorialStep';

export class HowToPlay extends TutorialStep {
    buildContent(): void {
        if (!this.contentContainer) return;
        
        const centerX = getCanvasWidth() / 2;
        const centerY = getCanvasHeight() / 2;
        const contentWidth = 600;
        const contentHeight = Math.min(700, getCanvasHeight() - 60);
        const leftX = centerX - contentWidth / 2;
        const startY = centerY - contentHeight / 2;
        
        const panelHeight = contentHeight;
        const panelBg = this.scene.add.graphics();
        panelBg.fillStyle(CLIENT_CONFIG.UI.BACKGROUND.LOBBY);
        panelBg.fillRoundedRect(leftX - 20, startY - 20, contentWidth + 40, panelHeight + 40, 10);
        panelBg.lineStyle(2, 0xf1c40f, 1);
        panelBg.strokeRoundedRect(leftX - 20, startY - 20, contentWidth + 40, panelHeight + 40, 10);
        this.contentContainer.add(panelBg);
        
        const closeButtonSize = 30;
        const closeButtonX = leftX + contentWidth + 20 - closeButtonSize / 2 - 10;
        const closeButtonY = startY - 20 + closeButtonSize / 2 + 10;
        
        const closeBg = this.scene.add.circle(closeButtonX, closeButtonY, closeButtonSize / 2, CLIENT_CONFIG.UI.BUTTON_COLORS.SUBTLE);
        closeBg.setStrokeStyle(2, CLIENT_CONFIG.UI.COLORS.BORDER);
        this.contentContainer.add(closeBg);
        
        const closeText = this.scene.add.text(closeButtonX, closeButtonY, '×', 
            TextStyleHelper.getStyle('BUTTON_TEXT'));
        closeText.setOrigin(0.5);
        this.contentContainer.add(closeText);
        
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
            event.stopPropagation();
            
            this.hide();
            if (this.onDismiss) {
                this.onDismiss();
            }
        });
        
        let currentY = startY;
        
        const title = this.scene.add.text(centerX, currentY, 'Welcome to ARAM.IO!', 
            TextStyleHelper.getStyle('PAGE_TITLE'));
        title.setOrigin(0.5, 0);
        this.contentContainer.add(title);
        currentY += 50;
        
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
        
        const controlsTitle = this.scene.add.text(leftX, currentY, 'How to Play:', 
            TextStyleHelper.getStyle('HEADER'));
        this.contentContainer.add(controlsTitle);
        currentY += 30;
        
        const controlsStartY = currentY;
        
        const controlsList = [
            '- WASD keys to move your hero',
            '- Space OR Left-click: Hold to aim Class Ability, release to fire',
            '- An enemy within your attack radius will be auto-attacked',
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
        
        const heroVisualizationX = leftX + 480;
        const heroVisualizationY = controlsStartY + 20;
        
        const radiusGraphics = this.scene.add.graphics();
        // Draw dashed circle to match game visuals (auto-attack ranges are dashed)
        const dashAngle = 0.15; // angle of each dash in radians
        const gapAngle = 0.1; // angle of each gap in radians
        const angleStep = dashAngle + gapAngle;
        radiusGraphics.lineStyle(
            CLIENT_CONFIG.RADIUS_INDICATOR.LINE_THICKNESS, 
            CLIENT_CONFIG.RADIUS_INDICATOR.LINE_COLOR, 
            CLIENT_CONFIG.RADIUS_INDICATOR.LINE_ALPHA
        );
        
        let currentAngle = 0;
        while (currentAngle < Math.PI * 2) {
            const endAngle = Math.min(currentAngle + dashAngle, Math.PI * 2);
            radiusGraphics.beginPath();
            radiusGraphics.arc(heroVisualizationX, heroVisualizationY, 55, currentAngle, endAngle);
            radiusGraphics.strokePath();
            currentAngle += angleStep;
        }
        this.contentContainer.add(radiusGraphics);
        
        const heroVisual = this.scene.add.image(heroVisualizationX, heroVisualizationY, 'hero-base');
        heroVisual.setScale(40 / heroVisual.width);
        this.contentContainer.add(heroVisual);
        
        const heroLabel = this.scene.add.text(heroVisualizationX, heroVisualizationY + 27, 'Your Hero', 
            TextStyleHelper.getSubtleHintStyle());
        heroLabel.setOrigin(0.5);
        this.contentContainer.add(heroLabel);
        
        const radiusLabel = this.scene.add.text(heroVisualizationX + 62, heroVisualizationY, 'Auto-Attack\nRadius', 
            TextStyleHelper.getSubtleHintStyle());
        radiusLabel.setOrigin(0, 0.5);
        this.contentContainer.add(radiusLabel);
        
        const entitiesY = heroVisualizationY + 80;
        const entitiesStartX = heroVisualizationX - 80;
        
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
            const entityImage = this.scene.add.image(entitiesStartX, minionY, entity.key);
            entityImage.setScale(entity.size / entityImage.width);
            this.contentContainer.add(entityImage);
            
            const entityLabel = this.scene.add.text(entitiesStartX + entity.size / 2 + 10, minionY, entity.name, 
                TextStyleHelper.getStyleWithColor('BODY_SMALL', '#cccccc'));
            entityLabel.setOrigin(0, 0.5);
            this.contentContainer.add(entityLabel);
            
            minionY += 35;
        }
        
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
            const entityImage = this.scene.add.image(structuresStartX, structureY, entity.key);
            entityImage.setScale(entity.size / entityImage.width);
            this.contentContainer.add(entityImage);
            
            const entityLabel = this.scene.add.text(structuresStartX + entity.size / 2 + 10, structureY, entity.name, 
                TextStyleHelper.getStyleWithColor('BODY_SMALL', '#cccccc'));
            entityLabel.setOrigin(0, 0.5);
            this.contentContainer.add(entityLabel);
            
            structureY += 35;
        }
        
        currentY += 170;
        
        const heroesTitle = this.scene.add.text(leftX, currentY, 'Hero Classes:', 
            TextStyleHelper.getStyle('HEADER'));
        this.contentContainer.add(heroesTitle);
        currentY += 60;
        
        const heroData = [
            { type: 'default', name: CLIENT_CONFIG.REWARDS.DISPLAY['ability:default'].title.replace('Class: ', ''), desc: CLIENT_CONFIG.REWARDS.DISPLAY['ability:default'].description },
            { type: 'hookshot', name: CLIENT_CONFIG.REWARDS.DISPLAY['ability:hookshot'].title.replace('Class: ', ''), desc: CLIENT_CONFIG.REWARDS.DISPLAY['ability:hookshot'].description },
            { type: 'mercenary', name: CLIENT_CONFIG.REWARDS.DISPLAY['ability:mercenary'].title.replace('Class: ', ''), desc: CLIENT_CONFIG.REWARDS.DISPLAY['ability:mercenary'].description },
            { type: 'pyromancer', name: CLIENT_CONFIG.REWARDS.DISPLAY['ability:pyromancer'].title.replace('Class: ', ''), desc: CLIENT_CONFIG.REWARDS.DISPLAY['ability:pyromancer'].description },
            { type: 'sniper', name: CLIENT_CONFIG.REWARDS.DISPLAY['ability:sniper'].title.replace('Class: ', ''), desc: CLIENT_CONFIG.REWARDS.DISPLAY['ability:sniper'].description },
            { type: 'thorndive', name: CLIENT_CONFIG.REWARDS.DISPLAY['ability:thorndive'].title.replace('Class: ', ''), desc: CLIENT_CONFIG.REWARDS.DISPLAY['ability:thorndive'].description }
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
            
            const heroKey = hero.type === 'default' ? 'hero-base' : `hero-${hero.type}`;
            const heroImage = this.scene.add.image(x, y, heroKey);
            
            const maxDimension = Math.max(heroImage.width, heroImage.height);
            const baseScale = heroIconSize / maxDimension;
            const heroScale = CLIENT_CONFIG.HERO_SPRITE_SCALES[hero.type] || 1.0;
            heroImage.setScale(baseScale * heroScale);
            
            this.contentContainer.add(heroImage);
            
            const heroName = this.scene.add.text(x + heroIconSize / 2 + 10, y - 15, 
                hero.name, 
                TextStyleHelper.getStyle('BODY_SMALL')
            );
            this.contentContainer.add(heroName);
            
            const heroDesc = this.scene.add.text(x + heroIconSize / 2 + 10, y + 2, 
                hero.desc, 
                TextStyleHelper.getStyleWithCustom('BODY_TINY', {
                    wordWrap: { width: 120 }
                })
            );
            this.contentContainer.add(heroDesc);
        }
        currentY += 100;
        
        const advancedControlsTitle = this.scene.add.text(leftX, currentY, 'Advanced Controls:', 
            TextStyleHelper.getStyle('HEADER'));
        this.contentContainer.add(advancedControlsTitle);
        currentY += 30;
        
        const advancedControlsList = [
            '- \'Tab\': Hold to open Stats',
            '- \'Shift\': Hold to open Damage Summary',
            '- \'Ctrl\': Hold to open Cheat Menu (sneaky)',
            '',
            'Right-click toggles mouse-follow mode:',
            '- While active, hero moves toward mouse cursor',
            '- WASD or right-click again to disable',
        ];
        
        const advancedControlsText = this.scene.add.text(leftX + 20, currentY, advancedControlsList.join('\n'), 
            TextStyleHelper.getStyleWithCustom('BODY_SMALL', {
                lineSpacing: 5
            }));
        this.contentContainer.add(advancedControlsText);
        
        // Hero ability icons visualization (right side of advanced controls)
        const iconSize = 50;
        const iconStartX = leftX + 480;
        const iconStartY = currentY + 50;
        const iconSpacing = 50;
        const numIcons = 3;
        
        // Show 3 ability icons equally spaced
        const abilityIcons = [
            'icon_ability:default',
            'icon_ability:hookshot',
            'icon_ability:mercenary'
        ];
        
        for (let i = 0; i < numIcons; i++) {
            const x = iconStartX + (i - (numIcons - 1) / 2) * iconSpacing;
            const y = iconStartY;
            
            const abilityIcon = this.scene.add.image(x, y, abilityIcons[i]);
            abilityIcon.setDisplaySize(iconSize, iconSize);
            this.contentContainer.add(abilityIcon);
        }
    }
}

