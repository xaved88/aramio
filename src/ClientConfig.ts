// Client Configuration
export const CLIENT_CONFIG = {
    ENTITY_MOVEMENT_DURATION_MS: 100, // duration for entity movement animations
    ENTITY_ROTATION_DURATION_MS: 150, // duration for entity rotation animations
    RENDERER: {
        TYPE: 'svg' as 'shape' | 'svg', // 'shape' for original shape rendering, 'svg' for SVG-based rendering
    },
    HERO_SPRITE_SCALES: {
        'default': 1.0,
        'hookshot': 1.1,
        'mercenary': 1.1,
        'pyromancer': 1.1,
        'sniper': 1.1,
        'thorndive': 1.25,
    } as Record<string, number>,
    CAMERA: {
        DYNAMIC_ZOOM: {
            MIN_ZOOM: 1.0, // Zoom at smallest canvas size
            MAX_ZOOM: 2.5, // Zoom at largest canvas size
        },
        CANVAS_SIZE: {
            MIN_SIZE: 350, // Minimum canvas size in pixels
            MAX_SIZE: 1400, // Maximum canvas size in pixels
        },
        LOOK_AHEAD_THRESHOLD: 0.3, // 50% threshold - when mouse is at edge, hero appears at 25% from edge instead of 50% (center)
        SHAKE: {
            ENABLED: false,
            INTENSITY: .003,
            DURATION_MS: 50, // how long the shake lasts
        },
        RED_FLASH: {
            ENABLED: true,
            COLOR: 0xff0000, // red color
            ALPHA: 0.10, // opacity of the flash overlay
            DURATION_MS: 200, // how long the flash lasts
        },
    },
    // Canvas/Viewport size is now calculated dynamically in main.ts
    // Use getCanvasWidth() and getCanvasHeight() from utils/CanvasSize.ts instead
    // Map size (actual game world size) - game units
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
        SCENE_BACKGROUND: -10,    // Scene backgrounds (behind everything)
        BACKGROUND: -5,         // Radius indicators, respawn rings
        STRUCTURES: 0,          // Turrets, cradles
        TARGETING_LINES: 1,     // Targeting lines between combatants
        MINIONS: 5,             // Minion entities
        HEROES: 10,             // Hero entities
        PROJECTILES: 12,        // Enemy projectiles
        PLAYER_PROJECTILES: 15, // Player-owned projectiles (higher than heroes)
        ABILITY_INDICATORS: 18, // Ability ready indicators, range indicators
        EFFECTS: 20,            // AOE effects, explosions, hit markers
        OVERLAY: 30,            // XP text, level up text
        HUD: 500,               // Health bars, experience bars, ability bars
        GAME_UI: 1000,          // Stats overlay, game interface
        MODALS: 2000            // Victory screen, modals
    } as const,
    VICTORY_COLORS: {
        VICTORY: 0x4CAF50, // green for victory
        DEFEAT: 0xF44336,  // red for defeat
    },
    VICTORY_SCREEN: {
        FADE_IN_DURATION_MS: 1000, // 1 second fade in
        FADE_OUT_DURATION_MS: 1000, // 1 second fade out
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
        BLUE_RESPAWNING: 0xb3d9f2, // much lighter blue
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
    HIT_MARKERS: {
        DURATION_MS: 400, // how long hit markers stay visible
        SIZE: 8, // size of the hit marker crosshair
        THICKNESS: 2, // thickness of hit marker lines
        COLORS: {
            AUTO_ATTACK: 0xffffff, // white for auto-attacks
            ABILITY: 0x9b59b6, // purple for abilities
        },
        OUTLINE: {
            COLOR: 0xffffff, // white outline
            THICKNESS: 3, // outline thickness
        },
        SCALE_ANIMATION: {
            START_SCALE: 0.5, // start smaller
            END_SCALE: 1.0, // grow to normal size
            FADE_OUT_START: 0.6, // when to start fading out (60% through animation)
        },
    },
    PROJECTILE_MISS_EFFECT: {
        DURATION_MS: 400, // how long the effect lasts
        PARTICLE_COUNT: 6, // number of particles in the puff
        PARTICLE_SIZE: 3, // size of each particle
        SPREAD_RADIUS: 8, // how far particles spread from center
        FADE_OUT_DURATION_MS: 300, // how long particles take to fade out
    },
    MUZZLE_FLASH: {
        DURATION_MS: 120, // how long the flash lasts
        SIZE: 8, // size of the flash effect
        PARTICLE_COUNT: 6, // number of spark particles
        PARTICLE_SIZE: 1.5, // size of each spark
        SPREAD_RADIUS: 10, // how far sparks spread
        COLOR: 0xffffff, // white sparks for all abilities
        FADE_OUT_DURATION_MS: 80, // how long sparks take to fade out
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
    CURSOR_COOLDOWN_INDICATOR: {
        RADIUS: 15, // larger circle around cursor with buffer from crosshair
        THICKNESS: 3,
        COOLDOWN_COLOR: 0xe74c3c, // red when on cooldown
        ALPHA: 0.9,
    },
    RADIUS_INDICATOR: {
        LINE_THICKNESS: 1,
        LINE_COLOR: 0x000000, // black
        LINE_ALPHA: 0.3,
    },
    HUD: {
        LEVEL_INDICATOR: {
            X: 25, // Left side (level indicator first)
            Y: 25, // Top-left corner (circle center will be at Y: 45)
            RADIUS: 20, // Radius of the circular XP indicator
            BACKGROUND_COLOR: 0x333333,
            EXPERIENCE_COLOR: 0xf1c40f, // yellow/gold
            TEXT_COLOR: 0xffffff,
            BACKGROUND_ALPHA: 0.8,
            LINE_WIDTH: 10, // Thickness of the circular indicator
        },
        HEALTH_BAR: {
            X: 75, // Adjusted for larger level indicator
            Y: 33, // Adjusted for larger level indicator
            WIDTH: 220,
            HEIGHT: 24,
            BACKGROUND_COLOR: 0x333333,
            HEALTH_COLOR: 0x2ecc71, // green
            TEXT_COLOR: 0xffffff,
            BACKGROUND_ALPHA: 0.8,
        },
        ABILITY_BAR: {
            X: 5,
            Y: 20,
            WIDTH: 10,
            HEIGHT: 53, // height of health + exp bars (adjusted for larger elements)
            BACKGROUND_COLOR: 0x333333,
            COOLDOWN_COLOR: 0x9b59b6, // purple
            READY_COLOR: 0xd2b4de, // lighter purple
            BACKGROUND_ALPHA: 0.8,
        },
        LEVEL_TEXT: {
            FONT_SIZE: '18px',
            COLOR: 0xffffff,
        },
        KILL_COUNTERS: {
            X: 135, // Adjusted for larger health bar
            Y: 73, // Below health bar (adjusted for larger elements)
            ICON_SIZE: 12,
            SPACING: 20, // Reduced spacing between icon and number
            TEXT_COLOR: 0xffffff,
            FONT_SIZE: '14px',
        },
        REWARDS_COUNTER: {
            X: 45, // Adjusted for larger level indicator
            Y: 85, // Below level indicator circle with more spacing (adjusted for larger elements)
            ICON_SIZE: 12,
            SPACING: 8, // Closer spacing between icon and number
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
        MAX_DISPLAY_NAME_LENGTH: 12,
        FONTS: {
            SMALL: '10px',
            MEDIUM: '12px',
            LARGE: '14px',
            ERROR: '16px',
            VICTORY: '48px',
            PRIMARY: 'Arial',
        },
        TEXT_STYLES: {
            // Headers and titles
            TITLE_LARGE: {
                fontSize: '72px',
                fontFamily: 'Arial',
                fontStyle: 'bold',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 4
            },
            TITLE_MEDIUM: {
                fontSize: '32px',
                fontFamily: 'Arial',
                fontStyle: 'bold',
                color: '#ffffff'
            },
            TITLE_SMALL: {
                fontSize: '24px',
                fontFamily: 'Arial',
                fontStyle: 'bold',
                color: '#ffffff'
            },
            HEADER: {
                fontSize: '20px',
                fontFamily: 'Arial',
                fontStyle: 'bold',
                color: '#ffffff'
            },
            
            // Body text
            BODY_LARGE: {
                fontSize: '18px',
                fontFamily: 'Arial',
                color: '#ffffff'
            },
            BODY_MEDIUM: {
                fontSize: '16px',
                fontFamily: 'Arial',
                color: '#ffffff'
            },
            BODY_SMALL: {
                fontSize: '14px',
                fontFamily: 'Arial',
                color: '#ffffff'
            },
            BODY_TINY: {
                fontSize: '12px',
                fontFamily: 'Arial',
                color: '#ffffff'
            },
            SUBTLE_HINT: {
                fontSize: '14px',
                fontFamily: 'Arial',
                color: '#888888'
            },
            
            BUTTON_TEXT: {
                fontSize: '18px',
                fontFamily: 'Arial',
                fontStyle: 'bold',
                color: '#ffffff'
            },
            BUTTON_TEXT_DISABLED: {
                fontSize: '18px',
                fontFamily: 'Arial',
                fontStyle: 'bold',
                color: '#888888'
            },
            // Specialized text
            HUD_TEXT: {
                fontSize: '15px',
                fontFamily: 'Arial',
                fontStyle: 'bold',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 1
            },
            ERROR: {
                fontSize: '20px',
                fontFamily: 'Arial',
                fontStyle: 'bold',
                color: '#ff0000'
            }
        },
        BUTTON_COLORS: {
            STANDARD: 0x3498db, // blue for standard buttons
            STANDARD_HOVER: 0x5dade2, // blue hover for standard buttons
            PROCEED: 0x4CAF50, // green for proceed/action buttons
            PROCEED_HOVER: 0x388E3C, // green hover for proceed/action buttons
            DISABLED: 0x4A4A4A, // gray for disabled buttons
            SUBTLE: 0x2c3e50, // dark blue-gray background for subtle buttons
            SUBTLE_HOVER: 0x34495e, // darker accent color for subtle button hover
        },
        COLORS: {
            BACKGROUND: 0x2c3e50, // dark blue-gray
            DISABLED: 0x7f8c8d, // gray
            ACCENT: 0x34495e, // darker accent color
            BORDER: 0x7f8c8d, // gray border
            CONTROL_TOGGLE: 0x5a6c7d, // darker gray-blue for control mode toggle
        },
        BACKGROUND: {
            VIEWPORT: 0x1a252f, // Darker blue-gray for viewport background
            GAME_MAP: 0x2c3e50,
            LOBBY: 0x2c3e50,
        },
        OVERLAY: {
            BACKGROUND: 0x000000, // black overlay background
            ALPHA: 0.7, // overlay transparency
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
                title: "Max Health",
                description: "+15% max health",
                rarity: "common"
            },
            "stat:bullet_armor": {
                title: "Auto-Attack Armor", 
                description: "+30 armor against auto-attacks",
                rarity: "common"
            },
            "stat:ability_armor": {
                title: "Ability Armor", 
                description: "+30 armor against abilities",
                rarity: "common"
            },
            "stat:damage": {
                title: "Damage",
                description: "+15% auto-attack damage", 
                rarity: "common"
            },
            "stat:attack_speed": {
                title: "Attack Speed",
                description: "+15% auto-attacks per second",
                rarity: "common"
            },
            "stat:attack_range": {
                title: "Attack Range",
                description: "+10 auto-attack range",
                rarity: "common"
            },
            "stat:move_speed": {
                title: "Speed",
                description: "+5% movement speed",
                rarity: "common"
            },
            "ability:thorndive": {
                title: "Ability: Thorndive",
                description: "Dash, taunt, reflect damage",
                rarity: "ability"
            },
            "ability:pyromancer": {
                title: "Ability: Pyromancer",
                description: "AOE fire damage",
                rarity: "ability"
            },
            "ability:hookshot": {
                title: "Ability: Hookshot",
                description: "Grappling hook with stun",
                rarity: "ability"
            },
            "ability:mercenary": {
                title: "Ability: Mercenary",
                description: "Rage-mode assassin",
                rarity: "ability"
            },
            "ability:sniper": {
                title: "Ability: Sniper",
                description: "Precise ranged projectile",
                rarity: "ability"
            },
            "ability_stat:range": {
                title: "Ability Range",
                description: "+20% ability range",
                rarity: "upgrade"
            },
            "ability_stat:strength": {
                title: "Ability Power",
                description: "+20% ability power",
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
            },
            "ability_stat:speed": {
                title: "Projectile Speed",
                description: "+25% ability projectile speed",
                rarity: "upgrade"
            }
        }
    },
} as const;
