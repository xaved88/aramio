export type ObstacleId = string;

export type HitboxType = 'rectangle' | 'circle';

export const HITBOX_TYPES = {
    RECTANGLE: 'rectangle' as const,
    CIRCLE: 'circle' as const
} as const;

export interface Obstacle {
    id: ObstacleId;
    x: number;
    y: number;
    hitboxType: HitboxType;
    blocksMovement: boolean;
    blocksProjectiles: boolean;
    // Rectangle hitbox properties
    width?: number;
    height?: number;
    rotation?: number; // in radians
    // Circle hitbox properties
    radius?: number;
}
