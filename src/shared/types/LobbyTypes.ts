export interface PlayerSlot {
    playerId: string;
    playerDisplayName: string;
    isBot: boolean;
    isReady: boolean;
}

export interface LobbyState {
    lobbyPhase: 'waiting' | 'starting' | 'in_game';
    teamSize: number;
    blueTeamSize: number;
    redTeamSize: number;
    canStart: boolean;
    gameRoomId: string;
    blueTeam: PlayerSlot[];
    redTeam: PlayerSlot[];
    availableConfigs: string[];
    selectedConfig: string;
}
