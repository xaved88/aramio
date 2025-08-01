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
    CRADLE_HEALTH: 1000,
    CRADLE_MAX_HEALTH: 1000,
    CRADLE_POSITIONS: {
        BLUE: { x: 50, y: 550 }, // bottom left
        RED: { x: 550, y: 50 },  // top right
    },
    PLAYER_SPAWN_OFFSET: 40, // distance from cradle to spawn player
    COMBAT: {
        PLAYER: {
            HEALTH: 100,
            MAX_HEALTH: 100,
            ATTACK_RADIUS: 50,
            ATTACK_STRENGTH: 10,
            ATTACK_SPEED: 1, // attacks per second
        },
        CRADLE: {
            ATTACK_RADIUS: 30,
            ATTACK_STRENGTH: 40,
            ATTACK_SPEED: 0.3, // attacks per second
        },
    },
} as const;

// Client Configuration
export const CLIENT_CONFIG = {
    INTERPOLATION_DURATION_MS: 50, // duration of smooth movement tween
    GAME_CANVAS_WIDTH: 600,
    GAME_CANVAS_HEIGHT: 600,
    PLAYER_CIRCLE_RADIUS: 15, // smaller than cradle (25)
    CRADLE_SIZE: 25, // 25x25 square
    TEAM_COLORS: {
        BLUE: 0x3498db,
        RED: 0xe74c3c,
    },
} as const; 