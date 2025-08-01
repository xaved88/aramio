import { Schema, type, MapSchema } from '@colyseus/schema';

export class Player extends Schema {
    @type('string') id!: string;
    @type('number') x!: number;
    @type('number') y!: number;
    @type('string') team!: string;
    @type('number') health!: number;
    @type('number') maxHealth!: number;
}

export class GameState extends Schema {
    @type({ map: Player }) players = new MapSchema<Player>();
    @type('number') gameTime!: number;
    @type('string') gamePhase!: string;
} 