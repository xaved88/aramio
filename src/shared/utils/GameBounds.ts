import { CLIENT_CONFIG } from '../../ClientConfig';

/**
 * Gets the minimum X boundary
 * @param gameBoundBuffer The buffer distance from the edge
 */
export function getMinX(gameBoundBuffer: number): number {
    return gameBoundBuffer;
}

/**
 * Gets the minimum Y boundary
 * @param gameBoundBuffer The buffer distance from the edge
 */
export function getMinY(gameBoundBuffer: number): number {
    return gameBoundBuffer;
}

/**
 * Gets the maximum X boundary
 * @param gameBoundBuffer The buffer distance from the edge
 */
export function getMaxX(gameBoundBuffer: number): number {
    return CLIENT_CONFIG.MAP_WIDTH - gameBoundBuffer;
}

/**
 * Gets the maximum Y boundary
 * @param gameBoundBuffer The buffer distance from the edge
 */
export function getMaxY(gameBoundBuffer: number): number {
    return CLIENT_CONFIG.MAP_HEIGHT - gameBoundBuffer;
}
