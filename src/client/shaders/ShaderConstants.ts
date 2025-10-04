/**
 * Constants for shader-based color replacement
 */

// The placeholder color in our PNG assets that we want to replace
export const SHADER_PLACEHOLDER_COLOR = 0x880088; // Dark magenta - should be unique in our assets

export function hexToRgb(hex: number): { r: number; g: number; b: number } {
    const r = ((hex >> 16) & 0xFF) / 255;
    const g = ((hex >> 8) & 0xFF) / 255;
    const b = (hex & 0xFF) / 255;
    return { r, g, b };
}
