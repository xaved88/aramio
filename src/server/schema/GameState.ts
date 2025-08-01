import { Schema, type, MapSchema, ArraySchema } from '@colyseus/schema';

export class AttackEvent extends Schema {
    @type('string') sourceId!: string;
    @type('string') targetId!: string;
    @type('number') timestamp!: number;
}

export class Combatant extends Schema {
    @type('string') id!: string;
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
    // Player-specific properties can be added here later
}

export class Cradle extends Combatant {
    // Cradle-specific properties can be added here later
}

export class Turret extends Combatant {
    // Turret-specific properties can be added here later
}

export class GameState extends Schema {
    @type('number') gameTime = 0;
    @type('string') gamePhase = 'playing';
    @type({ map: Player }) players = new MapSchema<Player>()
    @type(Cradle) blueCradle!: Cradle;
    @type(Cradle) redCradle!: Cradle;
    @type(Turret) blueTurret!: Turret;
    @type(Turret) redTurret!: Turret;
    @type([AttackEvent]) attackEvents = new ArraySchema<AttackEvent>();
} 