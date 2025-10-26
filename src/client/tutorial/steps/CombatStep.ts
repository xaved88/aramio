import Phaser from 'phaser';
import { CLIENT_CONFIG } from '../../../ClientConfig';
import { getCanvasWidth, getCanvasHeight } from '../../utils/CanvasSize';
import { TextStyleHelper } from '../../utils/TextStyleHelper';
import { TutorialStep } from '../TutorialStep';

export class CombatStep extends TutorialStep {
    buildContent(): void {
        if (!this.contentContainer) return;
        
        const centerX = getCanvasWidth() / 2;
        const centerY = getCanvasHeight() / 2;
        const contentWidth = 500;
        const leftX = centerX - contentWidth / 2;
        const startY = centerY - 150;
        
        const panelHeight = 300;
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
        
        closeZone.on('pointerdown', () => {
            this.hide();
            if (this.onDismiss) {
                this.onDismiss();
            }
        });
        
        let currentY = startY;
        
        const title = this.scene.add.text(centerX, currentY, 'Combat Basics', 
            TextStyleHelper.getStyle('HEADER'));
        title.setOrigin(0.5, 0);
        this.contentContainer.add(title);
        currentY += 40;
        
        const text = this.scene.add.text(centerX, currentY, 
            '• Auto-attack enemies within your attack radius\n' +
            '• Gather XP from defeating enemies\n' +
            '• Choose level-up rewards when you respawn', 
            TextStyleHelper.getStyleWithCustom('BODY_MEDIUM', {
                align: 'center',
                wordWrap: { width: contentWidth - 40 }
            })
        );
        text.setOrigin(0.5, 0);
        this.contentContainer.add(text);
        currentY += 100;
        
        const nextButton = this.scene.add.rectangle(centerX, currentY, 120, 40, CLIENT_CONFIG.UI.BUTTON_COLORS.PROCEED);
        nextButton.setStrokeStyle(2, CLIENT_CONFIG.UI.COLORS.BORDER);
        const nextText = this.scene.add.text(centerX, currentY, 'Got it!', 
            TextStyleHelper.getStyle('BUTTON_TEXT'));
        nextText.setOrigin(0.5);
        this.contentContainer.add(nextButton);
        this.contentContainer.add(nextText);
        
        const nextZone = this.scene.add.zone(centerX - 60, currentY - 20, 120, 40);
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

