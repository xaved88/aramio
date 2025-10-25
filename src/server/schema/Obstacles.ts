import { Schema, type } from '@colyseus/schema';
import { ObstacleId, HitboxType } from '../../shared/types/ObstacleTypes';

export class Obstacle extends Schema {
    @type('string') id!: ObstacleId;
    @type('number') x!: number;
    @type('number') y!: number;
    @type('string') hitboxType!: HitboxType;
    @type('boolean') blocksMovement!: boolean;
    @type('boolean') blocksProjectiles!: boolean;
    
    // Rectangle hitbox properties
    @type('number') width?: number;
    @type('number') height?: number;
    @type('number') rotation?: number; // in radians
    
    // Circle hitbox properties
    @type('number') radius?: number;
}
