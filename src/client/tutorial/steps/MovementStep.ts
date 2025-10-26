import Phaser from 'phaser';
import { CLIENT_CONFIG } from '../../../ClientConfig';
import { getCanvasWidth, getCanvasHeight } from '../../utils/CanvasSize';
import { TextStyleHelper } from '../../utils/TextStyleHelper';
import { TutorialStep } from '../TutorialStep';

export class MovementStep extends TutorialStep {
    buildContent(): void {
        if (!this.contentContainer) return;
        
        const centerX = getCanvasWidth() / 2;
        const centerY = getCanvasHeight() / 2;
        const contentWidth = 500;
        const panelHeight = 400;
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
        
        const title = this.scene.add.text(centerX, currentY, 'Take Your First Steps!', 
            TextStyleHelper.getStyle('PAGE_TITLE'));
        title.setOrigin(0.5, 0);
        this.contentContainer.add(title);
        currentY += 50;
        
        const welcomeText = this.scene.add.text(centerX, currentY, 
            'Welcome to Aramio! Time to take your first steps.\n\nUse WASD to move around the battlefield!', 
            TextStyleHelper.getStyleWithCustom('BODY_MEDIUM', {
                align: 'center',
                wordWrap: { width: contentWidth - 40 }
            })
        );
        welcomeText.setOrigin(0.5, 0);
        this.contentContainer.add(welcomeText);
        currentY += 180;
        
        // Add visualization of WASD keys in proper T-shape
        const keysY = currentY;
        const keySize = 40;
        const keySpacing = 50;
        
        // W key (top)
        const wKey = this.scene.add.rectangle(centerX, keysY - keySpacing, keySize, keySize, CLIENT_CONFIG.UI.BUTTON_COLORS.SUBTLE);
        wKey.setStrokeStyle(2, CLIENT_CONFIG.UI.COLORS.BORDER);
        wKey.setOrigin(0.5);
        this.contentContainer.add(wKey);
        const wText = this.scene.add.text(centerX, keysY - keySpacing, 'W', TextStyleHelper.getStyle('BUTTON_TEXT'));
        wText.setOrigin(0.5);
        this.contentContainer.add(wText);
        
        // A key (left)
        const aKey = this.scene.add.rectangle(centerX - keySpacing, keysY, keySize, keySize, CLIENT_CONFIG.UI.BUTTON_COLORS.SUBTLE);
        aKey.setStrokeStyle(2, CLIENT_CONFIG.UI.COLORS.BORDER);
        aKey.setOrigin(0.5);
        this.contentContainer.add(aKey);
        const aText = this.scene.add.text(centerX - keySpacing, keysY, 'A', TextStyleHelper.getStyle('BUTTON_TEXT'));
        aText.setOrigin(0.5);
        this.contentContainer.add(aText);
        
        // S key (center/bottom)
        const sKey = this.scene.add.rectangle(centerX, keysY, keySize, keySize, CLIENT_CONFIG.UI.BUTTON_COLORS.SUBTLE);
        sKey.setStrokeStyle(2, CLIENT_CONFIG.UI.COLORS.BORDER);
        sKey.setOrigin(0.5);
        this.contentContainer.add(sKey);
        const sText = this.scene.add.text(centerX, keysY, 'S', TextStyleHelper.getStyle('BUTTON_TEXT'));
        sText.setOrigin(0.5);
        this.contentContainer.add(sText);
        
        // D key (right)
        const dKey = this.scene.add.rectangle(centerX + keySpacing, keysY, keySize, keySize, CLIENT_CONFIG.UI.BUTTON_COLORS.SUBTLE);
        dKey.setStrokeStyle(2, CLIENT_CONFIG.UI.COLORS.BORDER);
        dKey.setOrigin(0.5);
        this.contentContainer.add(dKey);
        const dText = this.scene.add.text(centerX + keySpacing, keysY, 'D', TextStyleHelper.getStyle('BUTTON_TEXT'));
        dText.setOrigin(0.5);
        this.contentContainer.add(dText);
        
        currentY += keySpacing + 30;
        
        const hintText = this.scene.add.text(centerX, currentY, 
            '💡 Tip: Right-click to toggle mouse-only movement mode!', 
            TextStyleHelper.getStyleWithCustom('BODY_SMALL', {
                align: 'center',
                fontStyle: 'italic'
            })
        );
        hintText.setOrigin(0.5, 0);
        this.contentContainer.add(hintText);
        currentY += 40;
        
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