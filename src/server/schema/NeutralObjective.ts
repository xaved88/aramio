import { Schema, type } from '@colyseus/schema';

export class NeutralObjective extends Schema {
    @type('string') id!: string;
    @type('string') name!: string;       // 'Northern Grounds' | 'Southern Grounds'
    @type('number') x!: number;
    @type('number') y!: number;
    @type('number') radius!: number;
    @type('string') state!: string;      // 'active' | 'won'
    @type('number') blueControlPoints: number = 0;
    @type('number') redControlPoints: number = 0;
    @type('string') wonByTeam: string = '';
    @type('string') buffType!: string;   // e.g. 'stat:health' — pre-selected on spawn
    @type('number') spawnedAt!: number;
    @type('number') lastTickTime: number = 0;
}
