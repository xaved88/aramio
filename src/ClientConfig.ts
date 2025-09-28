// Client Configuration
export const CLIENT_CONFIG = {
    INTERPOLATION_DURATION_MS: 50, // duration of smooth movement tween
    ENTITY_MOVEMENT_DURATION_MS: 100, // duration for entity movement animations
    CAMERA: {
        ZOOM: 1.3, // 30% zoom (1.0 = no zoom, 1.3 = 30% zoom)
        LOOK_AHEAD_THRESHOLD: 0.3, // 50% threshold - when mouse is at edge, hero appears at 25% from edge instead of 50% (center)
    },
    CONTROLS: {
        // Control Scheme C: point-to-move + click-down-to-stop + click-up-for-ability
        // This is the only control scheme - InputHandler is the single source of truth for all input
        POINT_TO_MOVE: true, // Move towards mouse pointer when not clicking
        CLICK_DOWN_TO_STOP: true, // Stop sending move events when mouse is held down
        CLICK_UP_FOR_ABILITY: true, // Fire ability when mouse is released
    },
    // Canvas/Viewport size (what the player sees)
    GAME_CANVAS_WIDTH: 700,
    GAME_CANVAS_HEIGHT: 700,
    // Map size (actual game world size)
    MAP_WIDTH: 700,
    MAP_HEIGHT: 700,
    CRADLE_SIZE: 25, // 25x25 square
    TURRET_SIZE: { width: 25, height: 40 }, // tall rectangle
    MINION_SIZE: 12, // size for minion shapes
    DEBUG: {
        SPAWN_LOCATION_INDICATORS_ENABLED: false, // Whether to show spawn position indicators
        WORLD_COORDINATE_GRID_ENABLED: false, // Whether to show world coordinate grid overlay
        SCREEN_COORDINATE_GRID_ENABLED: false, // Whether to show screen coordinate grid overlay
    },
    // Render depth layers - lower = behind, higher = foreground
    RENDER_DEPTH: {
        BACKGROUND: -5,         // Radius indicators, respawn rings
        STRUCTURES: 0,          // Turrets, cradles
        TARGETING_LINES: 1,     // Targeting lines between combatants
        MINIONS: 5,             // Minion entities
        HEROES: 10,             // Hero entities
        PROJECTILES: 12,        // Enemy projectiles
        PLAYER_PROJECTILES: 15, // Player-owned projectiles (higher than heroes)
        ABILITY_INDICATORS: 18, // Ability ready indicators, range indicators
        EFFECTS: 20,            // AOE effects, explosions
        OVERLAY: 25,            // XP text, level up text
        HUD: 500,               // Health bars, experience bars, ability bars
        GAME_UI: 1000,          // Stats overlay, game interface
        MODALS: 2000            // Victory screen, modals
    } as const,
    VICTORY_SCREEN: {
        FADE_IN_DURATION_MS: 1000, // 1 second fade in
        DISPLAY_DURATION_MS: 3000, // 3 seconds display
        FADE_OUT_DURATION_MS: 1000, // 1 second fade out
        BACKGROUND_ALPHA: 0.5, // 50% alpha black background
    },
    PROJECTILE: {
        RADIUS: 6,
        BLUE_COLOR: 0x2980b9, // darker blue team color
        RED_COLOR: 0xc0392b,  // darker red team color
        BORDER_COLOR: 0x000000, // black border color
        BORDER_WIDTH: 1,
    },
    TEAM_COLORS: {
        BLUE: 0x3498db,
        RED: 0xe74c3c,
        BLUE_RESPAWNING: 0x85c1e9, // much lighter blue
        RED_RESPAWNING: 0xf5b7b1, // much lighter red
    },
    SELF_COLORS: {
        PRIMARY: 0x9b59b6, // Medium purple for normal state
        RESPAWNING: 0xd2b4de, // Light purple for respawning/low health
        TEXT: 0x6c3483, // Dark purple for level text
        PROJECTILE: 0x8e44ad, // Slightly darker purple for projectiles
    },
    TARGETING_LINES: {
        BLUE: 0x85c1e9, // lighter blue (same as respawning)
        RED: 0xf5b7b1, // lighter red (same as respawning)
        BASE_ALPHA: 0.2, // base alpha for other combatants
        PLAYER_BASE_ALPHA: 0.5, // higher alpha when player's hero is involved
        LINE_THICKNESS: 2,
        FLASH_LINE_THICKNESS: 3, // thicker line when flashing
        OFFSET_PIXELS: 5, // offset for line endpoints to prevent overlap
        FLASH_DURATION_MS: 100, // flash duration when attack fires
        FLASH_ALPHA: 0.9, // alpha during flash
    },
    ANIMATIONS: {
        ATTACK_TARGET_FLASH_DURATION_MS: 500, // target flash duration (increased from 500)
        ATTACK_TARGET_FLASH_ALPHA: 0.65, // alpha value when flashing (reduced fade - was 0.3)
        ATTACK_TARGET_QUICK_JUMP_DURATION_MS: 150, // quick jump duration for attack flash (increased from 50)
    },
    RESPAWN_RING: {
        RADIUS: 25, // slightly larger than player radius
        THICKNESS: 3,
        ALPHA: 0.8,
    },
    ABILITY_READY_INDICATOR: {
        RADIUS: 17, // slightly larger than player radius
        THICKNESS: 2,
        ALPHA: 0.8,
        COLOR: 0xd2b4de, // lighter purple to match ability bar
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
        ABILITY_BAR: {
            X: 5,
            Y: 20,
            WIDTH: 10,
            HEIGHT: 45, // height of health + exp bars
            BACKGROUND_COLOR: 0x333333,
            COOLDOWN_COLOR: 0x9b59b6, // purple
            READY_COLOR: 0xd2b4de, // lighter purple
            BACKGROUND_ALPHA: 0.8,
        },
        LEVEL_TEXT: {
            FONT_SIZE: '14px',
            COLOR: 0xffffff,
        },
        KILL_COUNTERS: {
            X: 20,
            Y: 80, // Below experience bar
            ICON_SIZE: 12,
            SPACING: 20, // Reduced spacing between icon and number
            TEXT_COLOR: 0xffffff,
            FONT_SIZE: '14px',
        },
        REWARDS_COUNTER: {
            X: 20,
            Y: 80, // Same Y as kill counters
            ICON_SIZE: 12,
            SPACING: 20, // Reduced spacing between icon and number
            TEXT_COLOR: 0xf1c40f, // yellow/gold
            FONT_SIZE: '14px',
            ICON_COLOR: 0xf1c40f, // yellow/gold
        },
        PERMANENT_EFFECTS: {
            X: 630, // Top right area - moved left to give more space
            Y: 20,
            START_X: 680, // Starting X position for the rightmost icon (can be moved farther right)
            ICON_SIZE: 24,
            SPACING: 10,
            MAX_ICONS_PER_ROW: 11, // Changed from 4 to 12
            BACKGROUND_COLOR: 0x666666,
            BACKGROUND_ALPHA: 0.7,
            BACKGROUND_PADDING: 4,
        },
    },
    UI: {
        FONTS: {
            SMALL: '10px',
            MEDIUM: '12px',
            LARGE: '14px',
            ERROR: '16px',
            VICTORY: '48px',
            DEFAULT_FAMILY: 'Arial',
            PRIMARY: 'Arial',
        },
        COLORS: {
            TEXT_PRIMARY: 0xffffff,
            TEXT_SECONDARY: 0x000000,
            ERROR: 0xff0000,
            VICTORY: 0x2ecc71, // green
            DEFEAT: 0xe74c3c, // red
            PRIMARY: 0x3498db, // blue
            TEXT: 0xffffff, // white
            BACKGROUND: 0x2c3e50, // dark blue-gray
            SUCCESS: 0x2ecc71, // green
            DISABLED: 0x7f8c8d, // gray
            BLUE: 0x3498db, // blue
            RED: 0xe74c3c, // red
            ACCENT: 0x34495e, // darker accent color
            SECONDARY: 0x95a5a6, // gray secondary
            BORDER: 0x7f8c8d, // gray border
            INPUT_BACKGROUND: 0xecf0f1, // light gray for input fields
        },
        BACKGROUND: {
            GAME_CANVAS: 0x2c3e50,
        },
    },
    XP_EVENTS: {
        COLORS: {
            DEFAULT: '#ffffff', // White for regular XP events
            LAST_HIT: '#ffff00', // Yellow for last hits (minion and hero kills)
        },
        FONTS: {
            DEFAULT_SIZE: '16px',
            HERO_KILL_SIZE: '18px', // Larger font for hero kills
        },
        ANIMATION: {
            FLOAT_DISTANCE: 30, // How far the text floats up
            DURATION_MS: 2000,
        },
    },
    LEVEL_UP_EVENTS: {
        COLOR: '#ffd700', // Gold color for level up
        FONT_SIZE: '20px',
        ANIMATION: {
            FLOAT_DISTANCE: 50, // How far the text floats up
            DURATION_MS: 3000,
        },
    },
    REWARDS: {
        DISPLAY: {
            "stat:health": {
                title: "Health Boost",
                description: "+15% max health",
                rarity: "common"
            },
            "stat:bullet_armor": {
                title: "Bullet Armor", 
                description: "+25 bullet armor",
                rarity: "common"
            },
            "stat:ability_armor": {
                title: "Ability Armor", 
                description: "+25 ability armor",
                rarity: "common"
            },
            "stat:damage": {
                title: "Damage Boost",
                description: "+15% attack strength", 
                rarity: "common"
            },
            "stat:attack_speed": {
                title: "Attack Speed",
                description: "+15% attacks per second",
                rarity: "common"
            },
            "stat:attack_range": {
                title: "Attack Range",
                description: "+10 attack range",
                rarity: "common"
            },
            "stat:move_speed": {
                title: "Movement Speed",
                description: "+5% movement speed",
                rarity: "common"
            },
            "ability:thorndive": {
                title: "Thorndive",
                description: "Tank with dash and taunt",
                rarity: "ability"
            },
            "ability:pyromancer": {
                title: "Pyromancer",
                description: "AOE fire damage",
                rarity: "ability"
            },
            "ability:hookshot": {
                title: "Hookshot",
                description: "Grappling hook stun",
                rarity: "ability"
            },
            "ability:mercenary": {
                title: "Mercenary",
                description: "Rage mode berserker",
                rarity: "ability"
            },
            "ability:sniper": {
                title: "Sniper",
                description: "Precise ranged attack",
                rarity: "ability"
            },
            "ability_stat:range": {
                title: "Ability Range",
                description: "+20% ability range",
                rarity: "upgrade"
            },
            "ability_stat:strength": {
                title: "Ability Strength",
                description: "+20% ability damage",
                rarity: "upgrade"
            },
            "ability_stat:duration": {
                title: "Ability Duration",
                description: "+25% ability duration",
                rarity: "upgrade"
            },
            "ability_stat:cooldown": {
                title: "Ability Cooldown",
                description: "20% cooldown reduction",
                rarity: "upgrade"
            },
            "ability_stat:mercenary_rage_speed": {
                title: "Rage Speed",
                description: "+15% move speed during rage",
                rarity: "upgrade"
            },
            "ability_stat:pyromancer_radius": {
                title: "Fire Radius",
                description: "+25% fireball radius",
                rarity: "upgrade"
            }
        }
    },
} as const;
