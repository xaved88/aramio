import { Schema, type } from '@colyseus/schema';

export class PlayerSlot extends Schema {
    @type('string') playerId = ''; // Empty string means slot is empty
    @type('string') playerDisplayName = ''; // Display name for the player
    @type('boolean') isBot = false; // Whether this slot is occupied by a bot
    @type('boolean') isReady = false; // Whether player is ready to start
}
