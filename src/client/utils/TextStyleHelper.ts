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
     * Gets team color for a given team name
     */
    static getTeamColor(team: 'blue' | 'red'): number {
        return team === 'blue' 
            ? CLIENT_CONFIG.TEAM_COLORS.BLUE
            : CLIENT_CONFIG.TEAM_COLORS.RED;
    }

    /**
     * Gets the subtle hint text style for secondary information
     */
    static getSubtleHintStyle(): Phaser.Types.GameObjects.Text.TextStyle {
        return this.getStyle('SUBTLE_HINT');
    }

}
