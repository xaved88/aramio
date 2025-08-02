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

    CRADLE_POSITIONS: {
        BLUE: { x: 50, y: 550 }, // bottom left
        RED: { x: 550, y: 50 },  // top right
    },
    TURRET_POSITIONS: {
        BLUE: { x: 200, y: 400 }, // 1/3 way from blue cradle to red cradle
        RED: { x: 400, y: 200 },  // 2/3 way from red cradle to blue cradle
    },
    PLAYER_SPAWN_OFFSET: 40, // distance from cradle to spawn player
    COMBAT: {
        PLAYER: {
            HEALTH: 100,
            ATTACK_RADIUS: 50,
            ATTACK_STRENGTH: 10,
            ATTACK_SPEED: 1, // attacks per second
            RESPAWN_TIME_MS: 6000,
        },
        CRADLE: {
            HEALTH: 1000,
            ATTACK_RADIUS: 30,
            ATTACK_STRENGTH: 40,
            ATTACK_SPEED: 0.3, // attacks per second
        },
        TURRET: {
            HEALTH: 100,
            ATTACK_RADIUS: 35,
            ATTACK_STRENGTH: 20,
            ATTACK_SPEED: 0.5, // attacks per second
        },
    },
    EXPERIENCE: {
        TOWER_DESTROYED: 20,
        LEVEL_UP_MULTIPLIER: 10, // experience needed = level * 10
        STAT_BOOST_PERCENTAGE: 0.15, // 15% increase per level
    },
} as const;

// Client Configuration
export const CLIENT_CONFIG = {
    INTERPOLATION_DURATION_MS: 50, // duration of smooth movement tween
    ENTITY_MOVEMENT_DURATION_MS: 100, // duration for entity movement animations
    GAME_CANVAS_WIDTH: 600,
    GAME_CANVAS_HEIGHT: 600,
    PLAYER_CIRCLE_RADIUS: 15, // smaller than cradle (25)
    CRADLE_SIZE: 25, // 25x25 square
    TURRET_SIZE: { width: 20, height: 30 }, // tall rectangle
    TEAM_COLORS: {
        BLUE: 0x3498db,
        RED: 0xe74c3c,
        BLUE_RESPAWNING: 0x85c1e9, // much lighter blue
        RED_RESPAWNING: 0xf5b7b1, // much lighter red
    },
    ANIMATIONS: {
        ATTACK_SOURCE_DURATION_MS: 50, // radius flash duration
        ATTACK_TARGET_FLASH_DURATION_MS: 500, // target flash duration
        ATTACK_TARGET_FLASH_ALPHA: 0.3, // alpha value when flashing
        ATTACK_TARGET_QUICK_JUMP_DURATION_MS: 50, // quick jump duration for attack flash
    },
    RESPAWN_RING: {
        RADIUS: 25, // slightly larger than player radius
        THICKNESS: 3,
        ALPHA: 0.8,
    },
    RADIUS_INDICATOR: {
        LINE_THICKNESS: 1,
        LINE_COLOR: 0x000000, // black
        LINE_ALPHA: 0.3,
    },
    HUD: {
        HEALTH_BAR: {
            X: 20,
            Y: 20,
            WIDTH: 200,
            HEIGHT: 20,
            BACKGROUND_COLOR: 0x333333,
            HEALTH_COLOR: 0x2ecc71, // green
            TEXT_COLOR: 0xffffff,
            BACKGROUND_ALPHA: 0.8,
        },
        EXPERIENCE_BAR: {
            X: 20,
            Y: 50,
            WIDTH: 200,
            HEIGHT: 15,
            BACKGROUND_COLOR: 0x333333,
            EXPERIENCE_COLOR: 0xf1c40f, // yellow
            TEXT_COLOR: 0xffffff,
            BACKGROUND_ALPHA: 0.8,
        },
        LEVEL_TEXT: {
            FONT_SIZE: '14px',
            COLOR: 0xffffff,
        },
    },
    UI: {
        FONTS: {
            SMALL: '10px',
            MEDIUM: '12px',
            LARGE: '14px',
            ERROR: '16px',
        },
        COLORS: {
            TEXT_PRIMARY: 0xffffff,
            TEXT_SECONDARY: 0x000000,
            ERROR: 0xff0000,
        },
        BACKGROUND: {
            GAME_CANVAS: 0x2c3e50,
        },
    },
} as const; 