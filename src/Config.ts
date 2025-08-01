// Server Configuration
export const SERVER_CONFIG = {
    PORT: 2567,
    UPDATE_RATE_MS: 50,
    MAX_CLIENTS_PER_ROOM: 10,
} as const;

// Gameplay Configuration
export const GAMEPLAY_CONFIG = {
    PLAYER_MOVE_SPEED: 6, // pixels per frame
    PLAYER_STOP_DISTANCE: 5, // pixels - how close to target before stopping
    GAME_BOUNDS: {
        MIN_X: 20,
        MIN_Y: 20,
        MAX_X: 580,
        MAX_Y: 580,
    },
} as const;

// Client Configuration
export const CLIENT_CONFIG = {
    INTERPOLATION_DURATION_MS: 50, // duration of smooth movement tween
    GAME_CANVAS_WIDTH: 600,
    GAME_CANVAS_HEIGHT: 600,
    PLAYER_CIRCLE_RADIUS: 20,
    TEAM_COLORS: {
        BLUE: 0x3498db,
        RED: 0xe74c3c,
    },
} as const; 