// Server Configuration
export const SERVER_CONFIG = {
    PORT: 2567,
    UPDATE_RATE_MS: 50,
    MAX_CLIENTS_PER_ROOM: 10,
    ROOM: {
        GAME_RESTART_DELAY_MS: 5000, // 5 seconds delay before restart
        EMPTY_ROOM_CLEANUP_DELAY_MS: 5000, // 5 seconds delay before destroying empty game rooms
        EMPTY_LOBBY_CLEANUP_DELAY_MS: 10000, // 10 seconds delay before destroying empty lobby rooms
        TEAM_ASSIGNMENT: {
            EVEN_PLAYER_COUNT_TEAM: 'blue',
            ODD_PLAYER_COUNT_TEAM: 'red',
        },
    },
} as const;
