import Phaser from 'phaser';
import { CLIENT_CONFIG } from '../../../ClientConfig';
import { getCanvasWidth, getCanvasHeight } from '../../utils/CanvasSize';
import { TextStyleHelper } from '../../utils/TextStyleHelper';
import { TutorialStep } from '../TutorialStep';

export class XPStep extends TutorialStep {
    buildContent(): void {
        if (!this.contentContainer) return;
        
        const centerX = getCanvasWidth() / 2;
        const centerY = getCanvasHeight() / 2;
        const contentWidth = 500;
        const panelHeight = 320;
        const leftX = centerX - contentWidth / 2;
        const startY = centerY - panelHeight / 2;
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
        
        const title = this.scene.add.text(centerX, currentY, 'Gain Experience!', 
            TextStyleHelper.getStyle('PAGE_TITLE'));
        title.setOrigin(0.5, 0);
        this.contentContainer.add(title);
        currentY += 50;
        
        const welcomeText = this.scene.add.text(centerX, currentY, 
            'You got some XP! Gather XP to level up and get stronger!\n\n💡 If you are far away from a fight, you won\'t get experience - stay close to grow strong!', 
            TextStyleHelper.getStyleWithCustom('BODY_MEDIUM', {
                align: 'center',
                wordWrap: { width: contentWidth - 40 }
            })
        );
        welcomeText.setOrigin(0.5, 0);
        this.contentContainer.add(welcomeText);
        currentY += 110;
        
        // Draw circular XP indicator (level 1, halfway filled)
        const xpX = centerX;
        const xpY = centerY + 40;
        const config = CLIENT_CONFIG.UI.XP_INDICATOR;
        
        // Background circle
        const xpBg = this.scene.add.graphics();
        xpBg.fillStyle(config.BACKGROUND_COLOR, config.BACKGROUND_ALPHA);
        xpBg.fillCircle(xpX, xpY, config.RADIUS);
        xpBg.lineStyle(2, 0x444444);
        xpBg.strokeCircle(xpX, xpY, config.RADIUS);
        this.contentContainer.add(xpBg);
        
        // XP arc (halfway)
        const xpArc = this.scene.add.graphics();
        xpArc.lineStyle(config.LINE_WIDTH, config.EXPERIENCE_COLOR, 1);
        xpArc.beginPath();
        xpArc.arc(xpX, xpY, config.RADIUS, -Math.PI / 2, Math.PI); // From top to bottom (half circle)
        xpArc.strokePath();
        this.contentContainer.add(xpArc);
        
        // Level text in center
        const levelText = this.scene.add.text(xpX, xpY, '1', 
            TextStyleHelper.getStyle('BODY_SMALL'));
        levelText.setOrigin(0.5);
        levelText.setTint(0xffffff);
        this.contentContainer.add(levelText);
        
        // Add +5XP text
        const xpGainText = this.scene.add.text(xpX + 50, xpY - 30, '+5 XP', 
            TextStyleHelper.getStyleWithColor('BODY_SMALL', '#f1c40f'));
        xpGainText.setOrigin(0.5);
        this.contentContainer.add(xpGainText);
        
        const nextButtonY = startY + panelHeight + 20 - 40;
        const nextButton = this.scene.add.rectangle(centerX, nextButtonY, 120, 40, CLIENT_CONFIG.UI.BUTTON_COLORS.PROCEED);
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
