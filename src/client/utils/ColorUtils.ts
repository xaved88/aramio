/**
 * Converts a hex number to a CSS color string
 * @param hex The hex color value (e.g., 0xffffff)
 * @returns CSS color string (e.g., "#ffffff")
 */
export function hexToColorString(hex: number): string {
    return `#${hex.toString(16).padStart(6, '0')}`;
} 
