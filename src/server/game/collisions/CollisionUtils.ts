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
/**
 * Check if a line segment intersects a circle
 * @param x1 Start X of line segment
 * @param y1 Start Y of line segment
 * @param x2 End X of line segment
 * @param y2 End Y of line segment
 * @param circleX Circle center X
 * @param circleY Circle center Y
 * @param radius Circle radius
 * @returns true if line segment intersects circle
 */
export function lineSegmentIntersectsCircle(
    x1: number, y1: number, x2: number, y2: number,
    circleX: number, circleY: number, radius: number
): boolean {
    // Vector from line start to circle center
    const dx = circleX - x1;
    const dy = circleY - y1;
    
    // Vector from line start to line end
    const lineDx = x2 - x1;
    const lineDy = y2 - y1;
    
    // Length of line segment
    const lineLengthSquared = lineDx * lineDx + lineDy * lineDy;
    
    if (lineLengthSquared === 0) {
        // Line segment is a point, check if it's inside circle
        return dx * dx + dy * dy <= radius * radius;
    }
    
    // Project circle center onto line segment
    const t = Math.max(0, Math.min(1, (dx * lineDx + dy * lineDy) / lineLengthSquared));
    
    // Find closest point on line segment to circle center
    const closestX = x1 + t * lineDx;
    const closestY = y1 + t * lineDy;
    
    // Distance from circle center to closest point on line
    const distanceSquared = (circleX - closestX) * (circleX - closestX) + (circleY - closestY) * (circleY - closestY);
    
    return distanceSquared <= radius * radius;
}

/**
 * Check if a line segment intersects a rotated rectangle
 * @param x1 Start X of line segment
 * @param y1 Start Y of line segment
 * @param x2 End X of line segment
 * @param y2 End Y of line segment
 * @param rectX Rectangle center X
 * @param rectY Rectangle center Y
 * @param width Rectangle width
 * @param height Rectangle height
 * @param rotation Rectangle rotation in radians
 * @returns true if line segment intersects rectangle
 */
export function lineSegmentIntersectsRectangle(
    x1: number, y1: number, x2: number, y2: number,
    rectX: number, rectY: number, width: number, height: number, rotation: number
): boolean {
    // If no rotation, use simple axis-aligned rectangle check
    if (rotation === 0) {
        return lineSegmentIntersectsAxisAlignedRectangle(x1, y1, x2, y2, rectX, rectY, width, height);
    }
    
    // Transform line segment to rectangle's local coordinate system
    const cos = Math.cos(-rotation);
    const sin = Math.sin(-rotation);
    
    // Translate line points to rectangle's local space
    const localX1 = (x1 - rectX) * cos - (y1 - rectY) * sin;
    const localY1 = (x1 - rectX) * sin + (y1 - rectY) * cos;
    const localX2 = (x2 - rectX) * cos - (y2 - rectY) * sin;
    const localY2 = (x2 - rectX) * sin + (y2 - rectY) * cos;
    
    // Now check against axis-aligned rectangle centered at origin
    return lineSegmentIntersectsAxisAlignedRectangle(localX1, localY1, localX2, localY2, 0, 0, width, height);
}

/**
 * Check if a line segment intersects an axis-aligned rectangle
 * @param x1 Start X of line segment
 * @param y1 Start Y of line segment
 * @param x2 End X of line segment
 * @param y2 End Y of line segment
 * @param rectX Rectangle center X
 * @param rectY Rectangle center Y
 * @param width Rectangle width
 * @param height Rectangle height
 * @returns true if line segment intersects rectangle
 */
function lineSegmentIntersectsAxisAlignedRectangle(
    x1: number, y1: number, x2: number, y2: number,
    rectX: number, rectY: number, width: number, height: number
): boolean {
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    
    const left = rectX - halfWidth;
    const right = rectX + halfWidth;
    const top = rectY - halfHeight;
    const bottom = rectY + halfHeight;
    
    // Check if line segment is completely outside rectangle
    if ((x1 < left && x2 < left) || (x1 > right && x2 > right) ||
        (y1 < top && y2 < top) || (y1 > bottom && y2 > bottom)) {
        return false;
    }
    
    // Check if either endpoint is inside rectangle
    if ((x1 >= left && x1 <= right && y1 >= top && y1 <= bottom) ||
        (x2 >= left && x2 <= right && y2 >= top && y2 <= bottom)) {
        return true;
    }
    
    // Check if line segment intersects any of the rectangle edges
    // This is a simplified check - for a more robust implementation,
    // we would check each edge intersection individually
    
    // Check intersection with left edge
    if (x1 <= left && x2 >= left) {
        const t = (left - x1) / (x2 - x1);
        const intersectY = y1 + t * (y2 - y1);
        if (intersectY >= top && intersectY <= bottom) return true;
    }
    
    // Check intersection with right edge
    if (x1 >= right && x2 <= right) {
        const t = (right - x1) / (x2 - x1);
        const intersectY = y1 + t * (y2 - y1);
        if (intersectY >= top && intersectY <= bottom) return true;
    }
    
    // Check intersection with top edge
    if (y1 <= top && y2 >= top) {
        const t = (top - y1) / (y2 - y1);
        const intersectX = x1 + t * (x2 - x1);
        if (intersectX >= left && intersectX <= right) return true;
    }
    
    // Check intersection with bottom edge
    if (y1 >= bottom && y2 <= bottom) {
        const t = (bottom - y1) / (y2 - y1);
        const intersectX = x1 + t * (x2 - x1);
        if (intersectX >= left && intersectX <= right) return true;
    }
    
    return false;
}

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

/**
 * Checks if a predicted movement will collide with an obstacle
 */
export function willCollideWithObstacle(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    combatantRadius: number,
    obstacle: any
): boolean {
    if (!obstacle.blocksMovement) return false;
    
    const combatantRadiusUsed = combatantRadius;
    
    switch (obstacle.hitboxType) {
        case 'rectangle':
            if (!obstacle.width || !obstacle.height) return false;
            if (obstacle.rotation && obstacle.rotation !== 0) {
                return lineSegmentIntersectsRectangle(
                    fromX, fromY, toX, toY,
                    obstacle.x, obstacle.y, obstacle.width, obstacle.height, obstacle.rotation
                );
            } else {
                return lineSegmentIntersectsRectangle(
                    fromX, fromY, toX, toY,
                    obstacle.x, obstacle.y, obstacle.width, obstacle.height, 0
                );
            }
            
        case 'circle':
            if (!obstacle.radius) return false;
            return lineSegmentIntersectsCircle(
                fromX, fromY, toX, toY,
                obstacle.x, obstacle.y, obstacle.radius + combatantRadiusUsed
            );
            
        default:
            return false;
    }
}

/**
 * Checks if a predicted movement will collide with another combatant
 */
export function willCollideWithCombatant(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    movingCombatantRadius: number,
    targetCombatant: any,
    skipCombatantId?: string
): boolean {
    if (skipCombatantId && targetCombatant.id === skipCombatantId) return false;
    
    const totalRadius = movingCombatantRadius + targetCombatant.size;
    
    return lineSegmentIntersectsCircle(
        fromX, fromY, toX, toY,
        targetCombatant.x, targetCombatant.y, totalRadius
    );
}

/**
 * Finds a clear path to a target, adjusting the target position if collisions are predicted
 */
export function findClearPath(
    currentX: number,
    currentY: number,
    targetX: number,
    targetY: number,
    moveSpeed: number,
    combatantRadius: number,
    obstacles: any[],
    otherCombatants: any[],
    skipCombatantId: string,
    gameplayConfig: any
): { x: number, y: number } {
    const dx = targetX - currentX;
    const dy = targetY - currentY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance === 0) return { x: targetX, y: targetY };
    
    const normalizedDx = dx / distance;
    const normalizedDy = dy / distance;
    
    const lookAheadDistance = moveSpeed * 5;
    const checkX = currentX + normalizedDx * lookAheadDistance;
    const checkY = currentY + normalizedDy * lookAheadDistance;
    
    let hasCollision = false;
    
    for (const obstacle of obstacles) {
        if (willCollideWithObstacle(currentX, currentY, checkX, checkY, combatantRadius, obstacle)) {
            hasCollision = true;
            break;
        }
    }
    
    if (!hasCollision) {
        return { x: targetX, y: targetY };
    }
    
    const perpendicularX = -normalizedDy;
    const perpendicularY = normalizedDx;
    
    const offsetDistances = [combatantRadius * 4, combatantRadius * 8, combatantRadius * 12];
    
    for (const offset of offsetDistances) {
        for (const direction of [-1, 1]) {
            const offsetX = perpendicularX * offset * direction;
            const offsetY = perpendicularY * offset * direction;
            
            const bypassX = checkX + offsetX;
            const bypassY = checkY + offsetY;
            
            let pathClear = true;
            
            for (const obstacle of obstacles) {
                if (willCollideWithObstacle(currentX, currentY, bypassX, bypassY, combatantRadius, obstacle)) {
                    pathClear = false;
                    break;
                }
            }
            
            if (pathClear) {
                const bypassDx = bypassX - currentX;
                const bypassDy = bypassY - currentY;
                const bypassDist = Math.sqrt(bypassDx * bypassDx + bypassDy * bypassDy);
                
                if (bypassDist > 0) {
                    const bypassNormDx = bypassDx / bypassDist;
                    const bypassNormDy = bypassDy / bypassDist;
                    
                    const newTargetX = currentX + bypassNormDx * distance;
                    const newTargetY = currentY + bypassNormDy * distance;
                    
                    return { x: newTargetX, y: newTargetY };
                }
            }
        }
    }
    
    return { x: targetX, y: targetY };
}