// Server Configuration
export const SERVER_CONFIG = {
    PORT: 2567,
    UPDATE_RATE_MS: 50,
    MAX_CLIENTS_PER_ROOM: 10,
    ROOM: {
        GAME_RESTART_DELAY_MS: 5000, // 5 seconds delay before restart
        TEAM_ASSIGNMENT: {
            EVEN_PLAYER_COUNT_TEAM: 'blue',
            ODD_PLAYER_COUNT_TEAM: 'red',
        },
    },

} as const;

// Gameplay Configuration
export const GAMEPLAY_CONFIG = {
    HERO_MOVE_SPEED: 3.5, // pixels per frame
    MINION_MOVE_SPEED: 2.5, // pixels per frame - slower than heroes
    HERO_STOP_DISTANCE: 5, // pixels - how close to target before stopping
    GAME_BOUND_BUFFER: 20, // buffer between canvas edge and playable area

    CRADLE_POSITIONS: {
        BLUE: { x: 100, y: 600 }, // bottom left
        RED: { x: 600, y: 100 },  // top right
    },
    TURRET_POSITIONS: {
        BLUE: { x: 250, y: 450 }, // 1/3 way from blue cradle to red cradle
        RED: { x: 450, y: 250 },  // 2/3 way from red cradle to blue cradle
    },

    COMBAT: {
        COLLISION_THRESHOLD_MULTIPLIER: 0.9, // 90% threshold for collision detection
        HEROES: {
            'default': {
                HEALTH: 50,
                ATTACK_RADIUS: 50,
                ATTACK_STRENGTH: 5,
                ATTACK_SPEED: 1, // attacks per second
                WIND_UP: 0.25, // same wind-up time for all heroes
                RESPAWN_TIME_MS: 6000, // same respawn time for all heroes
                SIZE: 15, // visual & collision radius
            },
            'hookshot': {
                HEALTH: 70, // A bit tanky
                ATTACK_RADIUS: 25, // Melee
                ATTACK_STRENGTH: 10, // Higher attack
                ATTACK_SPEED: 0.5, // Low attack speed
                WIND_UP: 0.25,
                RESPAWN_TIME_MS: 6000,
                SIZE: 15,
            },
            'mercenary': {
                HEALTH: 50,
                ATTACK_RADIUS: 50,
                ATTACK_STRENGTH: 5,
                ATTACK_SPEED: 1,
                WIND_UP: 0.25,
                RESPAWN_TIME_MS: 6000,
                SIZE: 15,
            },
            'pyromancer': {
                HEALTH: 40, // Low HP
                ATTACK_RADIUS: 35, // Low range
                ATTACK_STRENGTH: 3, // Low attack
                ATTACK_SPEED: 0.8, // Low attack speed
                WIND_UP: 0.25,
                RESPAWN_TIME_MS: 6000,
                SIZE: 15,
            },
            'thorndive': {
                HEALTH: 90, // High HP tank
                ATTACK_RADIUS: 25, // Low range (melee tank)
                ATTACK_STRENGTH: 8, // High damage
                ATTACK_SPEED: 0.6, // Low attack speed
                WIND_UP: 0.25,
                RESPAWN_TIME_MS: 6000,
                SIZE: 15, 
                BULLET_ARMOR: 20, // Base bullet armor
                ABILITY_ARMOR: 20, // Base ability armor
            },
        },
        ABILITIES: {
              'default': {
                COOLDOWN_MS: 1000,
                STRENGTH: 7, // damage dealt by projectile
                SPEED: 200, // pixels per second
                },
              'hookshot': {
                COOLDOWN_MS: 5000,
                STRENGTH: 3, // damage dealt by projectile
                SPEED: 250, // pixels per second (base speed)
                DURATION_MS: 500, // 500ms projectile duration
                STUN_DURATION_MS: 500, // 500ms base stun duration
                STUN_DURATION_PER_LEVEL_MS: 100, // +100ms stun duration per level
                SPEED_BOOST_PERCENTAGE: 0.10, // +10% speed per level
            },
            'mercenary': {
                COOLDOWN_MS: 8000,
                DURATION_MS: 3000, // 3 seconds base duration
                ATTACK_BOOST_BASE: 6.0, // 600% attack boost
                ATTACK_BOOST_PER_LEVEL: 0.10, // +10% per level
                MOVE_SPEED_BOOST_BASE: 0.7, //+70% move speed boost
                MOVE_SPEED_BOOST_PER_LEVEL: 0.07, // +7% per level
                DURATION_BOOST_PER_LEVEL_MS: 100, // +0.1 second per level
                RAGE_ATTACK_RADIUS: 25,
                RAGE_WIND_UP: 0.1,
                RAGE_BULLET_ARMOR: 200, // Bullet armor granted during rage
                RAGE_ABILITY_ARMOR: 50, // Ability armor granted during rage
            },
            'pyromancer': {
                COOLDOWN_MS: 2000,
                STRENGTH: 10,
                STRENGTH_PER_LEVEL: 5, // linear scaling (exponent is in the aoe)
                RADIUS: 30,
                RADIUS_PER_LEVEL: 2.5,
                RANGE: 150,
                RANGE_PER_LEVEL: 20,
                SPEED: 200, 
                SPEED_PER_LEVEL: 20
            },
            'thorndive': {
                COOLDOWN_MS: 11000, // High cooldown (11 seconds)
                COOLDOWN_REDUCTION_PER_LEVEL: 0.08, // Reduce cooldown by 8% per level
                DASH_SPEED: 400, // Dash movement speed (pixels per second)
                RANGE: 100, // Base dash range
                RANGE_PER_LEVEL: 5, // Additional range per level
                LANDING_DAMAGE: 10, // Base landing damage
                LANDING_DAMAGE_PER_LEVEL: 6, // Additional damage per level
                LANDING_RADIUS: 50, // AOE radius for landing damage (now equal to TAUNT_RADIUS)
                TAUNT_RADIUS: 50, // Radius for taunt effect
                TAUNT_DURATION_MS: 1000, // Base taunt duration (1 second)
                TAUNT_DURATION_PER_LEVEL_MS: 100, // +0.1 second per level
                REFLECT_DURATION_MS: 3000, // Base reflect duration (3 seconds)
                REFLECT_DURATION_PER_LEVEL_MS: 100, // +0.1 second per level
                REFLECT_PERCENTAGE: 100, // 100% damage reflection
                ARMOR_BONUS_BULLET: 50, // Additional bullet armor during effect
                ARMOR_BONUS_ABILITY: 50, // Additional ability armor during effect
            }
        },
        CRADLE: {
            HEALTH: 2000,
            ATTACK_RADIUS: 115,
            ATTACK_STRENGTH: 40,
            ATTACK_SPEED: 2, // attacks per second
            WIND_UP: 0.1, // 0.1 seconds wind-up time for cradles
            SIZE: 25, // collision radius (matches CRADLE_SIZE)
        },
        TURRET: {
            HEALTH: 1000,
            ATTACK_RADIUS: 75,
            ATTACK_STRENGTH: 25,
            ATTACK_SPEED: 2, // attacks per second
            WIND_UP: 0.5, // 0.5 seconds wind-up time for turrets
            SIZE: 25, // collision radius matches width
        },
        MINION: {
            WARRIOR: {
                HEALTH: 50,
                ATTACK_RADIUS: 20,
                ATTACK_STRENGTH: 10,
                ATTACK_SPEED: 0.8, // attacks per second
                WIND_UP: 0.3, // 0.3 seconds wind-up time for warrior minions
                SIZE: 12, // collision radius (matches MINION_SIZE)
            },
            ARCHER: {
                HEALTH: 25,
                ATTACK_RADIUS: 60,
                ATTACK_STRENGTH: 5,
                ATTACK_SPEED: 1.2, // attacks per second
                WIND_UP: 0.25, // 0.25 seconds wind-up time for archer minions
                SIZE: 12, // collision radius (matches MINION_SIZE)
            },
        },
    },
    EXPERIENCE: {
        LEVEL_UP_MULTIPLIER: 15, // experience needed per level
        STAT_BOOST_PERCENTAGE: 0.15,
        RANGE_BOOST_PERCENTAGE: 0.10, // Reduced range scaling (was 0.15) to prevent excessive late-game range
        ABILITY_STRENGTH_BOOST_PERCENTAGE: 0.20,
        MINION_KILLED: 2,
        HERO_KILL_MULTIPLIER: 4, // experience for hero kill = hero level * HERO_KILL_MULTIPLIER
        TOWER_DESTROYED: 50,
        UNIT_KILL_RADIUS: 175, // radius within which heroes must be to get unit kill XP
        LAST_HIT_BONUS_PERCENTAGE: 0.25, // bonus experience for getting the last hit on a unit
        XP_EVENT_DURATION_MS: 2000, // how long XP events stay in state (matches client animation)
        LEVEL_UP_EVENT_DURATION_MS: 3000, // how long level-up events stay in state (matches client animation)
    },
    MINION_SPAWNING: {
        WARRIORS_PER_WAVE: 2,
        ARCHERS_PER_WAVE: 3,
        FIRST_WAVE_DELAY_MS: 2000,
        WAVE_INTERVAL_MS: 12000,
        SPAWN_RADIUS: 50, // radius around cradle to spawn minions
        ARCHER_SPAWN_DELAY_MS: 1300, // delay before spawning archers after warriors
    },
    VICTORY_SCREEN: {
        FADE_IN_DURATION_MS: 1000, // 1 second fade in
        DISPLAY_DURATION_MS: 3000, // 3 seconds display
        FADE_OUT_DURATION_MS: 1000, // 1 second fade out
        BACKGROUND_ALPHA: 0.5, // 50% alpha black background
    },
    HERO_SPAWN_POSITIONS: {
        BLUE: [
            { x: 100, y: 675 }, // Spawn 1: 75 units below blue cradle
            { x: 62, y: 675 },  // Spawn 2: between 1 and 3, same y as 1 and 3
            { x: 62, y: 637 },  // Spawn 3: right angle point of triangle with 2 and 4
            { x: 25, y: 637 },  // Spawn 4: between 3 and 5, same y as 3 and 5
            { x: 25, y: 600 }   // Spawn 5: 75 units left of blue cradle
        ],
        RED: [
            { x: 600, y: 25 },  // Spawn 1: 75 units above red cradle
            { x: 637, y: 25 },  // Spawn 2: between 1 and 3, same y as 1 and 3
            { x: 637, y: 62 },  // Spawn 3: right angle point of triangle with 2 and 4
            { x: 675, y: 62 },  // Spawn 4: between 3 and 5, same y as 3 and 5
            { x: 675, y: 100 }  // Spawn 5: 75 units right of red cradle
        ],
    },
    BOTS: {
        BOTS_PER_TEAM: 5, // Number of bots to spawn per team
        ABILITY_TYPES: ['thorndive', 'pyromancer', 'mercenary', 'hookshot', 'default'], // Array of ability types for bots to spawn with (loops if more bots than abilities)
        ABILITY_COOLDOWN_MULTIPLIER: {
            MIN: 1.0, // The minimum % of cooldown to wait before firing again (below 1 won't make a difference)
            MAX: 2.2, // The max % of cooldown to wait before firing again
        },
    },
} as const;

// Client Configuration
export const CLIENT_CONFIG = {
    INTERPOLATION_DURATION_MS: 50, // duration of smooth movement tween
    ENTITY_MOVEMENT_DURATION_MS: 100, // duration for entity movement animations
    CONTROLS: {
        SCHEME: 'C' as 'A' | 'B' | 'C' | 'D', // A: point-to-move + click-for-ability, B: click-to-move + space+point-for-ability, C: point-to-move + click-down-to-stop + click-up-for-ability, D: point-to-move + click-down-to-stop-moving + click-up-for-ability
    },
    GAME_CANVAS_WIDTH: 700,
    GAME_CANVAS_HEIGHT: 700,
    CRADLE_SIZE: 25, // 25x25 square
    TURRET_SIZE: { width: 25, height: 40 }, // tall rectangle
    MINION_SIZE: 12, // size for minion shapes
    DEBUG: {
        SPAWN_LOCATION_INDICATORS_ENABLED: false, // Whether to show spawn position indicators
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
            SPACING: 25, // Space between icon and number
            TEXT_COLOR: 0xffffff,
            FONT_SIZE: '14px',
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
        },
        COLORS: {
            TEXT_PRIMARY: 0xffffff,
            TEXT_SECONDARY: 0x000000,
            ERROR: 0xff0000,
            VICTORY: 0x2ecc71, // green
            DEFEAT: 0xe74c3c, // red
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
            DURATION_MS: 2000, // Matches GAMEPLAY_CONFIG.EXPERIENCE.XP_EVENT_DURATION_MS
        },
    },
    LEVEL_UP_EVENTS: {
        COLOR: '#ffd700', // Gold color for level up
        FONT_SIZE: '20px',
        ANIMATION: {
            FLOAT_DISTANCE: 50, // How far the text floats up
            DURATION_MS: 3000, // Matches GAMEPLAY_CONFIG.EXPERIENCE.LEVEL_UP_EVENT_DURATION_MS
        },
    },
} as const;
