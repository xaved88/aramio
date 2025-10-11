/**
 * Calculates the direction angle from a movement vector.
 * The angle is in degrees where:
 * - 0° points up (north)
 * - 90° points right (east)
 * - 180° points down (south)
 * - 270° points left (west)
 * 
 * @param dx The x component of the movement vector
 * @param dy The y component of the movement vector
 * @returns The direction angle in degrees (0-360)
 */
export function calculateDirectionFromVector(dx: number, dy: number): number {
    const angleInRadians = Math.atan2(dy, dx);
    const angleInDegrees = (angleInRadians * 180 / Math.PI + 90 + 360) % 360;
    return angleInDegrees;
}

