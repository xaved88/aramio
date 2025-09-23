import { Schema, type, ArraySchema } from '@colyseus/schema';
import { PlayerSlot } from './PlayerSlot';

export class LobbyState extends Schema {
    @type('string') lobbyPhase = 'waiting'; // 'waiting' | 'starting' | 'in_game'
    @type('number') teamSize = 5; // Max players per team (will fill with bots)
    @type('number') blueTeamSize = 0; // Current blue team size
    @type('number') redTeamSize = 0; // Current red team size
    @type('boolean') canStart = false; // Whether game can be started
    @type('string') gameRoomId = ''; // ID of the game room when started
    @type([PlayerSlot]) blueTeam = new ArraySchema<PlayerSlot>();
    @type([PlayerSlot]) redTeam = new ArraySchema<PlayerSlot>();
}
