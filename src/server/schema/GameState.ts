import { Schema, type, MapSchema } from '@colyseus/schema';

export class Combatant extends Schema {
    @type('string') id!: string;
    @type('number') x!: number;
    @type('number') y!: number;
    @type('string') team!: string;
    @type('number') health!: number;
    @type('number') maxHealth!: number;
}

export class Player extends Combatant {
    // Player-specific properties can be added here later
}

export class Cradle extends Combatant {
    // Cradle-specific properties can be added here later
}

export class GameState extends Schema {
    @type({ map: Player }) players = new MapSchema<Player>();
    @type(Cradle) blueCradle!: Cradle;
    @type(Cradle) redCradle!: Cradle;
    @type('number') gameTime!: number;
    @type('string') gamePhase!: string;
} 