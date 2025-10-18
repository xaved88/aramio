import Phaser from 'phaser';
import { CLIENT_CONFIG } from '../../ClientConfig';
import { hexToColorString } from '../utils/ColorUtils';
import { TextStyleHelper } from '../utils/TextStyleHelper';

export type ButtonType = 'standard' | 'proceed' | 'disabled';

export interface ButtonConfig {
    x: number;
    y: number;
    text: string;
    type?: ButtonType;
    onClick?: () => void;
    enabled?: boolean;
    origin?: { x: number; y: number };
}

/**
 * Unified Button component that handles all button styling, hover effects, and interactions
 */
export class Button extends Phaser.GameObjects.Text {
    private buttonType: ButtonType;
    private enabled: boolean;
    private onClick?: () => void;

    constructor(scene: Phaser.Scene, config: ButtonConfig) {
        const { x, y, text, type = 'standard', onClick, enabled = true, origin = { x: 0.5, y: 0.5 } } = config;
        
        // Get the appropriate style based on button type
        const style = Button.getButtonStyle(type, enabled);
        
        super(scene, x, y, text, style);
        
        this.buttonType = type;
        this.enabled = enabled;
        this.onClick = onClick;
        
        this.setOrigin(origin.x, origin.y);
        
        if (enabled) {
            this.setInteractive();
            this.setupHoverEffects();
            this.setupClickHandler();
        }
    }

    /**
     * Gets the appropriate button style based on type and enabled state
     */
    private static getButtonStyle(type: ButtonType, enabled: boolean): Phaser.Types.GameObjects.Text.TextStyle {
        // Get base text style from TextStyleHelper
        const baseTextStyle = enabled ? TextStyleHelper.getStyle('BUTTON_TEXT') : TextStyleHelper.getStyle('BUTTON_TEXT_DISABLED');
        
        // Add button-specific properties
        const buttonStyle = {
            ...baseTextStyle,
            padding: { x: 15, y: 8 }
        };

        // Set background color based on button type and enabled state
        if (!enabled || type === 'disabled') {
            buttonStyle.backgroundColor = hexToColorString(CLIENT_CONFIG.UI.BUTTON_COLORS.DISABLED);
        } else if (type === 'proceed') {
            buttonStyle.backgroundColor = hexToColorString(CLIENT_CONFIG.UI.BUTTON_COLORS.PROCEED);
        } else {
            // standard type
            buttonStyle.backgroundColor = hexToColorString(CLIENT_CONFIG.UI.BUTTON_COLORS.STANDARD);
        }

        return buttonStyle;
    }

    /**
     * Gets the appropriate hover color based on button type
     */
    private getHoverColor(): number {
        if (!this.enabled) {
            return CLIENT_CONFIG.UI.BUTTON_COLORS.DISABLED;
        }

        switch (this.buttonType) {
            case 'standard':
                return CLIENT_CONFIG.UI.BUTTON_COLORS.STANDARD_HOVER;
            case 'proceed':
                return CLIENT_CONFIG.UI.BUTTON_COLORS.PROCEED_HOVER;
            case 'disabled':
                return CLIENT_CONFIG.UI.BUTTON_COLORS.DISABLED;
            default:
                return CLIENT_CONFIG.UI.BUTTON_COLORS.STANDARD_HOVER;
        }
    }

    /**
     * Gets the appropriate normal color based on button type
     */
    private getNormalColor(): number {
        if (!this.enabled) {
            return CLIENT_CONFIG.UI.BUTTON_COLORS.DISABLED;
        }

        switch (this.buttonType) {
            case 'standard':
                return CLIENT_CONFIG.UI.BUTTON_COLORS.STANDARD;
            case 'proceed':
                return CLIENT_CONFIG.UI.BUTTON_COLORS.PROCEED;
            case 'disabled':
                return CLIENT_CONFIG.UI.BUTTON_COLORS.DISABLED;
            default:
                return CLIENT_CONFIG.UI.BUTTON_COLORS.STANDARD;
        }
    }

    /**
     * Sets up hover effects for the button
     */
    private setupHoverEffects(): void {
        // Remove existing hover listeners to prevent duplicates
        this.off('pointerover');
        this.off('pointerout');
        
        const normalColor = this.getNormalColor();
        const hoverColor = this.getHoverColor();

        this.on('pointerover', () => {
            this.setStyle({ backgroundColor: hexToColorString(hoverColor) });
        });

        this.on('pointerout', () => {
            this.setStyle({ backgroundColor: hexToColorString(normalColor) });
        });
    }

    /**
     * Sets up the click handler for the button
     */
    private setupClickHandler(): void {
        // Remove existing click listener to prevent duplicates
        this.off('pointerdown');
        
        if (this.onClick) {
            this.on('pointerdown', () => {
                if (this.enabled) {
                    this.onClick!();
                }
            });
        }
    }

    /**
     * Updates the button's enabled state
     */
    setEnabled(enabled: boolean): void {
        this.enabled = enabled;
        
        if (enabled) {
            this.setInteractive();
            this.setStyle(Button.getButtonStyle(this.buttonType, true));
            this.setupHoverEffects();
            this.setupClickHandler();
        } else {
            this.disableInteractive();
            this.setStyle(Button.getButtonStyle(this.buttonType, false));
        }
    }

    /**
     * Updates the button's type
     */
    setType(type: ButtonType): void {
        this.buttonType = type;
        this.setStyle(Button.getButtonStyle(type, this.enabled));
        this.setupHoverEffects();
    }

    /**
     * Updates the button's click handler
     */
    setOnClick(handler: () => void): void {
        this.onClick = handler;
        this.setupClickHandler();
    }
}
