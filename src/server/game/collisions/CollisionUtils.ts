/**
 * Utility functions for collision detection and resolution
 */

/**
 * Calculate distance from a point to a circle
 */
export function pointToCircleDistance(pointX: number, pointY: number, circleX: number, circleY: number, radius: number): number {
    const dx = pointX - circleX;
    const dy = pointY - circleY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return Math.max(0, distance - radius);
}

/**
 * Calculate distance from a point to a rectangle (axis-aligned)
 */
export function pointToRectangleDistance(pointX: number, pointY: number, rectX: number, rectY: number, width: number, height: number): number {
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    
    const dx = Math.max(0, Math.abs(pointX - rectX) - halfWidth);
    const dy = Math.max(0, Math.abs(pointY - rectY) - halfHeight);
    
    return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate distance from a point to a rotated rectangle
 */
export function pointToRotatedRectangleDistance(
    pointX: number, 
    pointY: number, 
    rectX: number, 
    rectY: number, 
    width: number, 
    height: number, 
    rotation: number
): number {
    // Translate point to rectangle's local coordinate system
    const cos = Math.cos(-rotation);
    const sin = Math.sin(-rotation);
    
    const localX = (pointX - rectX) * cos - (pointY - rectY) * sin;
    const localY = (pointX - rectX) * sin + (pointY - rectY) * cos;
    
    // Now treat as axis-aligned rectangle
    return pointToRectangleDistance(localX, localY, 0, 0, width, height);
}

/**
 * Check if a circle intersects with a rectangle (axis-aligned)
 */
export function circleRectangleIntersection(
    circleX: number, 
    circleY: number, 
    radius: number,
    rectX: number, 
    rectY: number, 
    width: number, 
    height: number
): boolean {
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    
    const dx = Math.abs(circleX - rectX);
    const dy = Math.abs(circleY - rectY);
    
    if (dx > halfWidth + radius || dy > halfHeight + radius) {
        return false;
    }
    
    if (dx <= halfWidth || dy <= halfHeight) {
        return true;
    }
    
    const cornerDistanceSq = Math.pow(dx - halfWidth, 2) + Math.pow(dy - halfHeight, 2);
    return cornerDistanceSq <= radius * radius;
}

/**
 * Check if a circle intersects with a rotated rectangle
 */
export function circleRotatedRectangleIntersection(
    circleX: number, 
    circleY: number, 
    radius: number,
    rectX: number, 
    rectY: number, 
    width: number, 
    height: number, 
    rotation: number
): boolean {
    // Translate circle to rectangle's local coordinate system
    const cos = Math.cos(-rotation);
    const sin = Math.sin(-rotation);
    
    const localX = (circleX - rectX) * cos - (circleY - rectY) * sin;
    const localY = (circleX - rectX) * sin + (circleY - rectY) * cos;
    
    // Now treat as axis-aligned rectangle
    return circleRectangleIntersection(localX, localY, radius, 0, 0, width, height);
}
