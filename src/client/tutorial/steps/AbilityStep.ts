import Phaser from 'phaser';
import { CLIENT_CONFIG } from '../../../ClientConfig';
import { getCanvasWidth, getCanvasHeight } from '../../utils/CanvasSize';
import { TextStyleHelper } from '../../utils/TextStyleHelper';
import { TutorialStep } from '../TutorialStep';

export class AbilityStep extends TutorialStep {
    buildContent(): void {
        if (!this.contentContainer) return;
        
        const centerX = getCanvasWidth() / 2;
        const centerY = getCanvasHeight() / 2;
        const contentWidth = 500;
        const leftX = centerX - contentWidth / 2;
        const startY = centerY - 150;
        
        const panelHeight = 420;
        const panelBg = this.scene.add.graphics();
        panelBg.setScrollFactor(0, 0);
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
        
        const title = this.scene.add.text(centerX, currentY, 'Cast Your Ability!', 
            TextStyleHelper.getStyle('PAGE_TITLE'));
        title.setOrigin(0.5, 0);
        this.contentContainer.add(title);
        currentY += 50;
        
        const welcomeText = this.scene.add.text(centerX, currentY, 
            'Just auto-attacks alone won\'t cut it. Try casting your ability instead!\n\nLeft-click (or Space) to aim, then release to fire. See your cooldown on the cursor, or with the icon to the right of your health bar.', 
            TextStyleHelper.getStyleWithCustom('BODY_MEDIUM', {
                align: 'center',
                wordWrap: { width: contentWidth - 40 }
            })
        );
        welcomeText.setOrigin(0.5, 0);
        this.contentContainer.add(welcomeText);
        currentY += 130;
        
        // Add graphics showing ability system - moved down significantly
        const abilityVisualX = centerX;
        const abilityVisualY = centerY + 100;
        
        // Draw hero with purple ring (ability range)
        const abilityRadiusGraphics = this.scene.add.graphics();
        abilityRadiusGraphics.lineStyle(3, CLIENT_CONFIG.SELF_COLORS.PRIMARY, 0.8);
        abilityRadiusGraphics.strokeCircle(abilityVisualX - 60, abilityVisualY, 80);
        this.contentContainer.add(abilityRadiusGraphics);
        
        const heroVisual = this.scene.add.image(abilityVisualX - 60, abilityVisualY, 'hero-base');
        heroVisual.setScale(40 / heroVisual.width);
        this.contentContainer.add(heroVisual);
        
        // Draw targeting arrow
        const arrowGraphics = this.scene.add.graphics();
        arrowGraphics.lineStyle(4, CLIENT_CONFIG.SELF_COLORS.PRIMARY, 1);
        arrowGraphics.beginPath();
        arrowGraphics.moveTo(abilityVisualX - 20, abilityVisualY);
        arrowGraphics.lineTo(abilityVisualX + 30, abilityVisualY);
        arrowGraphics.lineTo(abilityVisualX + 25, abilityVisualY - 8);
        arrowGraphics.moveTo(abilityVisualX + 30, abilityVisualY);
        arrowGraphics.lineTo(abilityVisualX + 25, abilityVisualY + 8);
        arrowGraphics.strokePath();
        this.contentContainer.add(arrowGraphics);
        
        // Draw ability icon (circular with actual icon) - make circle 50% larger than HUD size
        const abilityIconSize = CLIENT_CONFIG.UI.ABILITY_COOLDOWN.SIZE / 2 * 1.5; // 37.5px radius (50% larger)
        const abilityIconBg = this.scene.add.graphics();
        abilityIconBg.fillStyle(CLIENT_CONFIG.UI.ABILITY_COOLDOWN.BACKGROUND_COLOR, 0.8);
        abilityIconBg.fillCircle(abilityVisualX + 80, abilityVisualY, abilityIconSize);
        abilityIconBg.lineStyle(2, 0xffffff);
        abilityIconBg.strokeCircle(abilityVisualX + 80, abilityVisualY, abilityIconSize);
        this.contentContainer.add(abilityIconBg);
        
        // Add actual ability icon image - shrink to fit within the larger circle
        if (this.scene.textures.exists('icon_ability:default')) {
            const abilityIconImg = this.scene.add.image(abilityVisualX + 80, abilityVisualY, 'icon_ability:default');
            abilityIconImg.setScale(0.2); // Shrink to fit within the larger circular background
            this.contentContainer.add(abilityIconImg);
        }
        
        const nextButtonY = startY + panelHeight - 40;
        const nextButton = this.scene.add.rectangle(centerX, nextButtonY, 120, 40, CLIENT_CONFIG.UI.BUTTON_COLORS.PROCEED);
        nextButton.setStrokeStyle(2, CLIENT_CONFIG.UI.COLORS.BORDER);
        const nextText = this.scene.add.text(centerX, nextButtonY, 'Continue', 
            TextStyleHelper.getStyle('BUTTON_TEXT'));
        nextText.setOrigin(0.5);
        this.contentContainer.add(nextButton);
        this.contentContainer.add(nextText);
        
        const nextZone = this.scene.add.zone(centerX - 60, nextButtonY - 20, 120, 40);
        nextZone.setOrigin(0, 0);
        nextZone.setInteractive();
        nextZone.setScrollFactor(0, 0);
        this.contentContainer.add(nextZone);
        
        nextZone.on('pointerover', () => {
            nextButton.setFillStyle(CLIENT_CONFIG.UI.BUTTON_COLORS.PROCEED_HOVER);
        });
        
        nextZone.on('pointerout', () => {
            nextButton.setFillStyle(CLIENT_CONFIG.UI.BUTTON_COLORS.PROCEED);
        });
        
        nextZone.on('pointerdown', (pointer: Phaser.Input.Pointer, localX: number, localY: number, event: Phaser.Types.Input.EventData) => {
            event.stopPropagation();
            this.hide();
            if (this.onDismiss) {
                this.onDismiss();
            }
        });
    }
}
