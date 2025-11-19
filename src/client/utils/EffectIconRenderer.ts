import Phaser from 'phaser';
import { CLIENT_CONFIG } from '../../ClientConfig';

/**
 * Utility class for drawing effect icons consistently across EntityRenderer and HUDRenderer
 */
export class EffectIconRenderer {
    /**
     * Draws an effect icon at the specified position
     * @param graphics Phaser Graphics object to draw on
     * @param x X coordinate (center of icon)
     * @param y Y coordinate (center of icon)
     * @param effectType Type of effect (e.g., 'stun', 'burning', 'reflect')
     * @param iconSize Size of the icon in pixels
     * @param color Optional color override (defaults to effect's color from config)
     * @param lineWidth Optional line width override (defaults to effect's icon line width from config)
     */
    static drawEffectIcon(
        graphics: Phaser.GameObjects.Graphics,
        x: number,
        y: number,
        effectType: string,
        iconSize: number,
        color?: number,
        lineWidth?: number
    ): void {
        const effectConfigKey = effectType.toUpperCase() as keyof typeof CLIENT_CONFIG.EFFECT_VISUALS;
        const effectConfig = CLIENT_CONFIG.EFFECT_VISUALS[effectConfigKey];

        const effectColor = color !== undefined ? color : this.getEffectColor(effectType);

        if (!effectConfig || typeof effectConfig === 'number') {
            // Fallback for unknown effects - draw a simple circle
            graphics.lineStyle(2, effectColor, 1);
            graphics.strokeCircle(x, y, iconSize / 2);
            return;
        }

        const iconLineWidth = lineWidth !== undefined ? lineWidth : ('ICON_LINE_WIDTH' in effectConfig ? effectConfig.ICON_LINE_WIDTH : 3);

        graphics.lineStyle(iconLineWidth, effectColor, 1);

        switch (effectType) {
            case 'stun': {
                // Lightning bolt shape (uses full iconSize for height)
                graphics.moveTo(x, y - iconSize);
                graphics.lineTo(x - iconSize / 4, y);
                graphics.lineTo(x, y);
                graphics.lineTo(x - iconSize / 4, y + iconSize);
                graphics.strokePath();
                break;
            }
            case 'reflect': {
                // Draw a simple shield/spiky circle icon
                const radius = iconSize / 2;
                const numSpikes = 8;
                for (let i = 0; i < numSpikes; i++) {
                    const angle = (i / numSpikes) * Math.PI * 2;
                    const spikeAngle = angle + (Math.PI / numSpikes);
                    const startAngle = spikeAngle - 0.2;
                    const endAngle = spikeAngle + 0.2;
                    graphics.beginPath();
                    graphics.arc(x, y, radius, startAngle, endAngle);
                    graphics.strokePath();
                }
                break;
            }
            case 'taunt': {
                // Target/eye shape
                graphics.strokeCircle(x, y, iconSize / 2);
                if (effectConfig && typeof effectConfig === 'object' && 'FILL_COLOR' in effectConfig && 'FILL_ALPHA' in effectConfig) {
                    graphics.fillStyle(effectConfig.FILL_COLOR as number, effectConfig.FILL_ALPHA as number);
                    graphics.fillCircle(x, y, iconSize / 4);
                }
                if (effectConfig && typeof effectConfig === 'object' && 'INNER_DOT_COLOR' in effectConfig) {
                    graphics.fillStyle(effectConfig.INNER_DOT_COLOR as number, 1);
                    graphics.fillCircle(x, y, iconSize * 0.15);
                }
                graphics.fillStyle(0x000000, 0); // Reset
                break;
            }
            case 'passive_healing': {
                // Cross/plus shape (uses full iconSize for line length)
                graphics.moveTo(x - iconSize, y);
                graphics.lineTo(x + iconSize, y);
                graphics.moveTo(x, y - iconSize);
                graphics.lineTo(x, y + iconSize);
                graphics.strokePath();
                break;
            }
            case 'hunter': {
                // Flame/anger zigzag pattern
                const width = iconSize * 3 / 4;
                graphics.moveTo(x - width, y + iconSize / 2);
                graphics.lineTo(x - iconSize / 2, y);
                graphics.lineTo(x, y + iconSize / 3);
                graphics.lineTo(x + iconSize / 2, y);
                graphics.lineTo(x + width, y + iconSize / 2);
                graphics.strokePath();
                break;
            }
            case 'burning': {
                // Filled flame shape
                graphics.beginPath();
                graphics.moveTo(x, y + iconSize); // Bottom center
                graphics.lineTo(x - iconSize / 2, y + iconSize * 3 / 10); // Left middle
                graphics.lineTo(x - iconSize * 3 / 10, y - iconSize * 3 / 10); // Left upper
                graphics.lineTo(x, y - iconSize); // Top point
                graphics.lineTo(x + iconSize * 3 / 10, y - iconSize * 3 / 10); // Right upper
                graphics.lineTo(x + iconSize / 2, y + iconSize * 3 / 10); // Right middle
                graphics.closePath();

                if (effectConfig && typeof effectConfig === 'object' && 'FILL_ALPHA' in effectConfig) {
                    graphics.fillStyle(effectColor, effectConfig.FILL_ALPHA as number);
                    graphics.fillPath();
                }
                graphics.strokePath();
                graphics.fillStyle(0x000000, 0); // Reset
                break;
            }
            default: {
                // Fallback for other effects (move, nocollision, statmod, etc.)
                graphics.lineStyle(2, 0xcccccc, 1);
                graphics.strokeCircle(x, y, iconSize / 2);
                break;
            }
        }
    }

    /**
     * Gets the color for an effect type from config
     */
    static getEffectColor(effectType: string): number {
        const effectConfigKey = effectType.toUpperCase() as keyof typeof CLIENT_CONFIG.EFFECT_VISUALS;
        const effectConfig = CLIENT_CONFIG.EFFECT_VISUALS[effectConfigKey];

        if (!effectConfig || typeof effectConfig === 'number') {
            return 0xcccccc; // Fallback gray
        }

        return 'COLOR' in effectConfig ? effectConfig.COLOR : 0xffffff;
    }
}

