import { CLIENT_CONFIG } from '../../ClientConfig';
import { hexToColorString } from './ColorUtils';

/**
 * TextStyleHelper provides utilities for creating consistent text styles across the UI
 */
export class TextStyleHelper {
    /**
     * Gets a text style from the centralized configuration
     */
    static getStyle(styleName: keyof typeof CLIENT_CONFIG.UI.TEXT_STYLES): Phaser.Types.GameObjects.Text.TextStyle {
        return { ...CLIENT_CONFIG.UI.TEXT_STYLES[styleName] };
    }

    /**
     * Gets a text style with custom color override
     */
    static getStyleWithColor(
        styleName: keyof typeof CLIENT_CONFIG.UI.TEXT_STYLES, 
        color: string | number
    ): Phaser.Types.GameObjects.Text.TextStyle {
        const style = this.getStyle(styleName);
        style.color = typeof color === 'number' ? hexToColorString(color) : color;
        return style;
    }

    /**
     * Gets a text style with custom font size override
     */
    static getStyleWithSize(
        styleName: keyof typeof CLIENT_CONFIG.UI.TEXT_STYLES, 
        fontSize: string
    ): Phaser.Types.GameObjects.Text.TextStyle {
        const style = this.getStyle(styleName);
        style.fontSize = fontSize;
        return style;
    }

    /**
     * Gets a text style with custom color and size overrides
     */
    static getStyleWithCustom(
        styleName: keyof typeof CLIENT_CONFIG.UI.TEXT_STYLES,
        overrides: Partial<Phaser.Types.GameObjects.Text.TextStyle>
    ): Phaser.Types.GameObjects.Text.TextStyle {
        return { ...this.getStyle(styleName), ...overrides };
    }

    /**
     * Creates a button style with custom background color
     */
    static getButtonStyle(
        enabled: boolean = true,
        backgroundColor?: string | number
    ): Phaser.Types.GameObjects.Text.TextStyle {
        const baseStyle = enabled ? 'BUTTON_PRIMARY' : 'BUTTON_DISABLED';
        const style = this.getStyle(baseStyle);
        
        if (backgroundColor !== undefined) {
            style.backgroundColor = typeof backgroundColor === 'number' 
                ? hexToColorString(backgroundColor) 
                : backgroundColor;
        }
        
        return style;
    }

    /**
     * Creates a title style with custom color
     */
    static getTitleStyle(
        size: 'large' | 'medium' | 'small' = 'medium',
        color?: string | number
    ): Phaser.Types.GameObjects.Text.TextStyle {
        const styleName = `TITLE_${size.toUpperCase()}` as keyof typeof CLIENT_CONFIG.UI.TEXT_STYLES;
        const style = this.getStyle(styleName);
        
        if (color !== undefined) {
            style.color = typeof color === 'number' ? hexToColorString(color) : color;
        }
        
        return style;
    }

    /**
     * Creates a body text style with custom size and color
     */
    static getBodyStyle(
        size: 'large' | 'medium' | 'small' | 'tiny' = 'medium',
        color?: string | number
    ): Phaser.Types.GameObjects.Text.TextStyle {
        const styleName = `BODY_${size.toUpperCase()}` as keyof typeof CLIENT_CONFIG.UI.TEXT_STYLES;
        const style = this.getStyle(styleName);
        
        if (color !== undefined) {
            style.color = typeof color === 'number' ? hexToColorString(color) : color;
        }
        
        return style;
    }

}
