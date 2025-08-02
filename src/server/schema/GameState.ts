import { Schema, type, MapSchema, ArraySchema } from '@colyseus/schema';
import { CombatantType } from '../../shared/types/CombatantTypes';

export class AttackEvent extends Schema {
    @type('string') sourceId!: string;
    @type('string') targetId!: string;
    @type('number') timestamp!: number;
}

export class Combatant extends Schema {
    @type('string') id!: string;
    @type('string') type!: CombatantType;
    @type('number') x!: number;
    @type('number') y!: number;
    @type('string') team!: string;
    @type('number') health!: number;
    @type('number') maxHealth!: number;
    @type('number') attackRadius!: number;
    @type('number') attackStrength!: number;
    @type('number') attackSpeed!: number; // attacks per second
    @type('number') lastAttackTime!: number;
}

export class Player extends Combatant {
    @type('string') state = 'alive'; // 'alive' or 'respawning'
    @type('number') respawnTime = 0; // timestamp when respawn completes
    @type('number') respawnDuration = 6000; // respawn duration in ms
    @type('number') experience = 0;
    @type('number') level = 1;
}

export class GameState extends Schema {
    @type('number') gameTime = 0;
    @type('string') gamePhase = 'playing';
    @type({ map: Combatant }) combatants = new MapSchema<Combatant>();
    @type([AttackEvent]) attackEvents = new ArraySchema<AttackEvent>();
} 