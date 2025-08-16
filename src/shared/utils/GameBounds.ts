import { GAMEPLAY_CONFIG, CLIENT_CONFIG } from '../../Config';

/**
 * Gets the minimum X boundary
 */
export function getMinX(): number {
    return GAMEPLAY_CONFIG.GAME_BOUND_BUFFER;
}

/**
 * Gets the minimum Y boundary
 */
export function getMinY(): number {
    return GAMEPLAY_CONFIG.GAME_BOUND_BUFFER;
}

/**
 * Gets the maximum X boundary
 */
export function getMaxX(): number {
    return CLIENT_CONFIG.GAME_CANVAS_WIDTH - GAMEPLAY_CONFIG.GAME_BOUND_BUFFER;
}

/**
 * Gets the maximum Y boundary
 */
export function getMaxY(): number {
    return CLIENT_CONFIG.GAME_CANVAS_HEIGHT - GAMEPLAY_CONFIG.GAME_BOUND_BUFFER;
}
