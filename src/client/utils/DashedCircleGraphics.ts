import Phaser from 'phaser';

/** Dash length in radians — keep in sync with tutorial dashed attack-radius visuals */
const DASH_ANGLE = 0.15;
/** Gap length in radians */
const GAP_ANGLE = 0.1;

/**
 * Stroke a dashed circle (arc segments). Used for auto-attack range rings and ability max-range.
 * @param rotationRad Optional phase offset so the dash pattern can rotate (e.g. tied to gameTime).
 */
export function drawDashedCircle(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    radius: number,
    color: number,
    alpha: number,
    thickness: number,
    rotationRad: number = 0
): void {
    const angleStep = DASH_ANGLE + GAP_ANGLE;
    graphics.lineStyle(thickness, color, alpha);

    let currentAngle = 0;
    while (currentAngle < Math.PI * 2) {
        const endAngle = Math.min(currentAngle + DASH_ANGLE, Math.PI * 2);
        const arcStart = currentAngle + rotationRad;
        const arcEnd = endAngle + rotationRad;
        graphics.beginPath();
        graphics.arc(x, y, radius, arcStart, arcEnd);
        graphics.strokePath();
        currentAngle += angleStep;
    }
}
