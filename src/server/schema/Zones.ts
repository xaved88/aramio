import { Schema, type, ArraySchema } from '@colyseus/schema';
import { CombatantId, ZoneId, ZoneType } from '../../shared/types/CombatantTypes';
import { CombatantEffect } from './Effects';

export class ZoneEffect extends Schema {
    @type('string') effectType!: string; // 'applyDamage' or 'applyEffect'
    @type('number') damage?: number; // For applyDamage effect
    @type(CombatantEffect) combatantEffect?: CombatantEffect; // For applyEffect effect
}

export class Zone extends Schema {
    @type('string') id!: ZoneId;
    @type('string') ownerId!: CombatantId; // who created the zone
    @type('number') x!: number;
    @type('number') y!: number;
    @type('number') radius!: number;
    @type('string') team!: string; // team of the owner
    @type('string') type!: ZoneType; // type of zone (e.g., 'pyromancer_fire')
    @type('number') duration!: number; // Duration in milliseconds
    @type('number') createdAt!: number; // Timestamp when zone was created
    @type('number') tickRate!: number; // How often to apply effects (in milliseconds)
    @type('number') lastTickTime!: number; // Last time effects were applied
    @type([ZoneEffect]) effects = new ArraySchema<ZoneEffect>(); // Array of effects that trigger on tick
}

