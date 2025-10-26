import Phaser from 'phaser';
import { CLIENT_CONFIG } from '../../../ClientConfig';
import { getCanvasWidth, getCanvasHeight } from '../../utils/CanvasSize';
import { TextStyleHelper } from '../../utils/TextStyleHelper';
import { TutorialStep } from '../TutorialStep';

export class AutoAttackStep extends TutorialStep {
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
        
        const title = this.scene.add.text(centerX, currentY, 'Auto-Attack!', 
            TextStyleHelper.getStyle('PAGE_TITLE'));
        title.setOrigin(0.5, 0);
        this.contentContainer.add(title);
        currentY += 50;
        
        const welcomeText = this.scene.add.text(centerX, currentY, 
            'You\'ll automatically attack anything within this ring. Keep them inside the ring to keep doing damage.\n\nNow go attack those enemy minions!', 
            TextStyleHelper.getStyleWithCustom('BODY_MEDIUM', {
                align: 'center',
                wordWrap: { width: contentWidth - 40 }
            })
        );
        welcomeText.setOrigin(0.5, 0);
        this.contentContainer.add(welcomeText);
        currentY += 90;
        
        // Add visualization of attack radius with bigger hero
        const attackVisualX = centerX;
        const attackVisualY = centerY + 20;
        
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
            radiusGraphics.arc(attackVisualX, attackVisualY, 70, currentAngle, endAngle);
            radiusGraphics.strokePath();
            currentAngle += angleStep;
        }
        this.contentContainer.add(radiusGraphics);
        
        const heroVisual = this.scene.add.image(attackVisualX, attackVisualY, 'hero-base');
        heroVisual.setScale(50 / heroVisual.width);
        this.contentContainer.add(heroVisual);
        
        // Add enemy minions vertically aligned
        const minionY = centerY + 20;
        const minion1 = this.scene.add.image(attackVisualX + 100, minionY - 40, 'minion-warrior');
        minion1.setScale(0.25);
        minion1.setTint(0xe74c3c); // Red tint for enemy
        this.contentContainer.add(minion1);
        
        const minion2 = this.scene.add.image(attackVisualX + 100, minionY, 'minion-archer');
        minion2.setScale(0.25);
        minion2.setTint(0xe74c3c); // Red tint for enemy
        this.contentContainer.add(minion2);
        
        const minionsLabel = this.scene.add.text(attackVisualX + 125, minionY - 20, 'Enemy Minions', 
            TextStyleHelper.getStyle('BODY_SMALL'));
        minionsLabel.setOrigin(0, 0.5);
        minionsLabel.setTint(0xffffff);
        this.contentContainer.add(minionsLabel);
        
        // Add tip text below
        currentY = centerY + 130;
        const tipText = this.scene.add.text(centerX, currentY, 
            '💡 Be warned though, you can only attack one target at a time!', 
            TextStyleHelper.getStyleWithCustom('BODY_SMALL', {
                align: 'center',
                fontStyle: 'italic'
            })
        );
        tipText.setOrigin(0.5, 0);
        this.contentContainer.add(tipText);
        
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
