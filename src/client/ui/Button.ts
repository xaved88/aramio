import Phaser from 'phaser';
import { CLIENT_CONFIG } from '../../ClientConfig';
import { hexToColorString } from '../utils/ColorUtils';
import { TextStyleHelper } from '../utils/TextStyleHelper';

export type ButtonType = 'standard' | 'proceed' | 'disabled' | 'subtle' | 'dropdown' | 'icon';

export interface ButtonConfig {
    x: number;
    y: number;
    text: string;
    type?: ButtonType;
    onClick?: () => void;
    enabled?: boolean;
    origin?: { x: number; y: number };
}

interface ButtonTypeConfig {
    textStyle: string;
    padding: { x: number; y: number };
    buttonColor: number;
    hoverColor: number;
}

// Button type configurations - centralized and easy to maintain
const BUTTON_TYPE_CONFIGS: Record<ButtonType, ButtonTypeConfig> = {
    standard: {
        textStyle: 'BUTTON_TEXT',
        padding: { x: 15, y: 8 },
        buttonColor: CLIENT_CONFIG.UI.BUTTON_COLORS.STANDARD,
        hoverColor: CLIENT_CONFIG.UI.BUTTON_COLORS.STANDARD_HOVER
    },
    proceed: {
        textStyle: 'BUTTON_TEXT',
        padding: { x: 15, y: 8 },
        buttonColor: CLIENT_CONFIG.UI.BUTTON_COLORS.PROCEED,
        hoverColor: CLIENT_CONFIG.UI.BUTTON_COLORS.PROCEED_HOVER
    },
    disabled: {
        textStyle: 'BUTTON_TEXT_DISABLED',
        padding: { x: 15, y: 8 },
        buttonColor: CLIENT_CONFIG.UI.BUTTON_COLORS.DISABLED,
        hoverColor: CLIENT_CONFIG.UI.BUTTON_COLORS.DISABLED
    },
    subtle: {
        textStyle: 'BUTTON_TEXT',
        padding: { x: 15, y: 8 },
        buttonColor: CLIENT_CONFIG.UI.BUTTON_COLORS.SUBTLE,
        hoverColor: CLIENT_CONFIG.UI.BUTTON_COLORS.SUBTLE_HOVER
    },
    dropdown: {
        textStyle: 'BODY_SMALL',
        padding: { x: 8, y: 3 },
        buttonColor: CLIENT_CONFIG.UI.BUTTON_COLORS.SUBTLE,
        hoverColor: CLIENT_CONFIG.UI.BUTTON_COLORS.SUBTLE_HOVER
    },
    icon: {
        textStyle: 'BODY_TINY',
        padding: { x: 5, y: 4 },
        buttonColor: CLIENT_CONFIG.UI.BUTTON_COLORS.SUBTLE,
        hoverColor: CLIENT_CONFIG.UI.BUTTON_COLORS.SUBTLE_HOVER
    }
};

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
        const config = BUTTON_TYPE_CONFIGS[type];
        const textStyle = enabled ? config.textStyle : 'BUTTON_TEXT_DISABLED';
        const baseTextStyle = TextStyleHelper.getStyle(textStyle as any);
        
        return {
            ...baseTextStyle,
            padding: config.padding,
            backgroundColor: hexToColorString(config.buttonColor)
        };
    }

    /**
     * Gets the appropriate hover color based on button type
     */
    private getHoverColor(): number {
        if (!this.enabled) {
            return CLIENT_CONFIG.UI.BUTTON_COLORS.DISABLED;
        }
        return BUTTON_TYPE_CONFIGS[this.buttonType].hoverColor;
    }

    /**
     * Gets the appropriate normal color based on button type
     */
    private getNormalColor(): number {
        if (!this.enabled) {
            return CLIENT_CONFIG.UI.BUTTON_COLORS.DISABLED;
        }
        return BUTTON_TYPE_CONFIGS[this.buttonType].buttonColor;
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
