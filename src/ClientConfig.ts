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
            MIN_ZOOM: 0.5, // 1.0 * 0.5
            MAX_ZOOM: 1.25, // 2.5 * 0.5
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
            COOLDOWN_MS: 100, // minimum time between red flashes to prevent overlap
        },
    },
    // Canvas/Viewport size is now calculated dynamically in main.ts
    // Use getCanvasWidth() and getCanvasHeight() from utils/CanvasSize.ts instead
    // Map size (actual game world size) - game units
    MAP_WIDTH: 1400,
    MAP_HEIGHT: 1400,
    CRADLE_SIZE: 50, // 25x25 square
    TURRET_SIZE: { width: 50, height: 80 }, // tall rectangle
    MINION_SIZE: 24, // size for minion shapes
    DEBUG: {
        SPAWN_LOCATION_INDICATORS_ENABLED: false, // Whether to show spawn position indicators
        WORLD_COORDINATE_GRID_ENABLED: false, // Whether to show world coordinate grid overlay
        SCREEN_COORDINATE_GRID_ENABLED: false, // Whether to show screen coordinate grid overlay
    },
    // Render depth layers - lower = behind, higher = foreground
    RENDER_DEPTH: {
        SCENE_BACKGROUND: -10,    // Scene backgrounds (behind everything)
        SHADOWS_STRUCTURE: -7,   // Structure drop shadows
        SHADOWS_HERO_MINION: -6, // Hero and minion drop shadows
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
    DROP_SHADOW: {
        ENABLED: true,          // Whether to render drop shadows for entities
        OFFSET_X: 2,            // Horizontal offset of shadow from entity
        OFFSET_Y: 4,            // Vertical offset of shadow from entity
        COLOR: 0x000000,        // Shadow color (black)
        ALPHA: 0.3,             // Shadow opacity
    },
    VICTORY_COLORS: {
        VICTORY: 0x4CAF50, // green for victory
        DEFEAT: 0xF44336,  // red for defeat
    },
    VICTORY_SCREEN: {
        FADE_IN_DURATION_MS: 1000, // 1 second fade in
        FADE_OUT_DURATION_MS: 1000, // 1 second fade out
    },
    PROJECTILE: {
        RADIUS: 12,
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
        BASE_ALPHA: 0.6, // base alpha for other combatants (increased from 0.4)
        PLAYER_BASE_ALPHA: 0.85, // higher alpha when player's hero is involved (increased from 0.7)
        LINE_THICKNESS: 4,
        FLASH_LINE_THICKNESS: 6,
        OFFSET_PIXELS: 10, // offset for line endpoints to prevent overlap
        FLASH_DURATION_MS: 100, // flash duration when attack fires
        FLASH_ALPHA: 0.9, // alpha during flash
    },
    TARGETING_ARROW: {
        LENGTH: 50, // Length of the arrow
        HEAD_SIZE: 16, // Size of the arrow head
        LINE_WIDTH: 5, // Thickness of the arrow line
        START_OFFSET: 40, // Distance from hero center to start arrow
    },
    ANIMATIONS: {
        ATTACK_TARGET_FLASH_DURATION_MS: 500, // target flash duration (increased from 500)
        ATTACK_TARGET_FLASH_ALPHA: 0.65, // alpha value when flashing (reduced fade - was 0.3)
        ATTACK_TARGET_QUICK_JUMP_DURATION_MS: 150, // quick jump duration for attack flash (increased from 50)
    },
    HIT_MARKERS: {
        DURATION_MS: 400, // how long hit markers stay visible
        SIZE: 16, // size of the hit marker crosshair
        THICKNESS: 4, // thickness of hit marker lines
        COLORS: {
            AUTO_ATTACK: 0xffffff, // white for auto-attacks
            ABILITY: 0x9b59b6, // purple for abilities (matches SELF_COLORS.PRIMARY)
        },
        OUTLINE: {
            COLOR: 0xffffff, // white outline
            THICKNESS: 6, // outline thickness
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
        PARTICLE_SIZE: 6, // size of each particle
        SPREAD_RADIUS: 16, // how far particles spread from center
        FADE_OUT_DURATION_MS: 300, // how long particles take to fade out
    },
    MUZZLE_FLASH: {
        DURATION_MS: 120, // how long the flash lasts
        SIZE: 16, // size of the flash effect
        PARTICLE_COUNT: 6, // number of spark particles
        PARTICLE_SIZE: 3, // size of each spark
        SPREAD_RADIUS: 20, // how far sparks spread
        COLOR: 0xffffff, // white sparks for all abilities
        FADE_OUT_DURATION_MS: 80, // how long sparks take to fade out
    },
    RESPAWN_RING: {
        RADIUS: 50, // slightly larger than player radius
        THICKNESS: 6,
        ALPHA: 0.8,
    },
    CURSOR_COOLDOWN_INDICATOR: {
        RADIUS: 15, // larger circle around cursor with buffer from crosshair
        THICKNESS: 3,
        COOLDOWN_COLOR: 0x9b59b6, // purple when on cooldown (matches SELF_COLORS.PRIMARY)
        ALPHA: 0.9,
    },
    RADIUS_INDICATOR: {
        LINE_THICKNESS: 2,
        LINE_COLOR: 0x000000, // black
        LINE_ALPHA: 0.3,
    },
    HUD: {
        // Only permanent effects remain in the top HUD
        PERMANENT_EFFECTS: {
            X: 630, // Top right area - moved left to give more space
            Y: 20,
            START_X: 680, // Starting X position for the rightmost icon (can be moved farther right)
            ICON_SIZE: 30,
            SPACING: 12,
            MAX_ICONS_PER_ROW: 11, // Changed from 4 to 12
            BACKGROUND_COLOR: 0xc4b89a, // Brighter beige to stand out from background
            BACKGROUND_ALPHA: 1.0, // No transparency - solid background
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
            VICTORY_TITLE: {
                fontSize: '72px',
                fontFamily: 'Arial',
                fontStyle: 'bold',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 4
            },
            PAGE_TITLE: {
                fontSize: '32px',
                fontFamily: 'Arial',
                fontStyle: 'bold',
                color: '#f1c40f',
                shadow: {
                    offsetX: 2,
                    offsetY: 2,
                    color: '#000000',
                    blur: 3,
                    stroke: true,
                    fill: true
                }
            },
            TITLE: {
                fontSize: '24px',
                fontFamily: 'Arial',
                fontStyle: 'bold',
                color: '#ffffff',
                shadow: {
                    offsetX: 1,
                    offsetY: 1,
                    color: '#000000',
                    blur: 1,
                    stroke: true,
                    fill: true
                }
            },
            HEADER: {
                fontSize: '20px',
                fontFamily: 'Arial',
                fontStyle: 'bold',
                color: '#f1c40f',
                shadow: {
                    offsetX: 1,
                    offsetY: 1,
                    color: '#000000',
                    blur: 2,
                    stroke: true,
                    fill: true
                }
            },
            
            // Body text
            BODY_LARGE: {
                fontSize: '18px',
                fontFamily: 'Arial',
                color: '#ffffff',
                shadow: {
                    offsetX: 1,
                    offsetY: 1,
                    color: '#000000',
                    blur: 1,
                    stroke: true,
                    fill: true
                }
            },
            BODY_MEDIUM: {
                fontSize: '16px',
                fontFamily: 'Arial',
                color: '#ffffff',
                shadow: {
                    offsetX: 1,
                    offsetY: 1,
                    color: '#000000',
                    blur: 2,
                    stroke: true,
                    fill: true
                }
            },
            BODY_SMALL: {
                fontSize: '14px',
                fontFamily: 'Arial',
                color: '#ffffff',
                shadow: {
                    offsetX: 1,
                    offsetY: 1,
                    color: '#000000',
                    blur: 2,
                    stroke: true,
                    fill: true
                }
            },
            BODY_TINY: {
                fontSize: '12px',
                fontFamily: 'Arial',
                color: '#ffffff',
                shadow: {
                    offsetX: 1,
                    offsetY: 1,
                    color: '#000000',
                    blur: 1,
                    stroke: true,
                    fill: true
                }
            },
            SUBTLE_HINT: {
                fontSize: '14px',
                fontFamily: 'Arial',
                color: '#cccccc',
                shadow: {
                    offsetX: 1,
                    offsetY: 1,
                    color: '#000000',
                    blur: 2,
                    stroke: true,
                    fill: true
                }
            },
            
            BUTTON_TEXT: {
                fontSize: '18px',
                fontFamily: 'Arial',
                fontStyle: 'bold',
                color: '#ffffff',
                shadow: {
                    offsetX: 1,
                    offsetY: 1,
                    color: '#000000',
                    blur: 2,
                    stroke: true,
                    fill: true
                }
            },
            BUTTON_TEXT_DISABLED: {
                fontSize: '18px',
                fontFamily: 'Arial',
                fontStyle: 'bold',
                color: '#cccccc',
                shadow: {
                    offsetX: 0.5,
                    offsetY: 0.5,
                    color: '#000000',
                    blur: 1,
                    stroke: false,
                    fill: true
                }
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
                color: '#ff0000',
                shadow: {
                    offsetX: 1,
                    offsetY: 1,
                    color: '#000000',
                    blur: 2,
                    stroke: true,
                    fill: true
                }
            }
        },
        BUTTON_COLORS: {
            STANDARD: 0x3498db, // blue for standard buttons
            STANDARD_HOVER: 0x5dade2, // blue hover for standard buttons
            PROCEED: 0x4CAF50, // green for proceed/action buttons
            PROCEED_HOVER: 0x388E3C, // green hover for proceed/action buttons
            DISABLED: 0x4A4A4A, // gray for disabled buttons
            SUBTLE: 0xa8a595, // Same as game background for subtle buttons
            SUBTLE_HOVER: 0xb8b5a5, // Lighter beige hover color for subtle buttons
        },
        COLORS: {
            DISABLED: 0xcccccc, // lighter gray to match subtle hint text
            BORDER: 0x7f8c8d, // gray border
            CONTROL_TOGGLE: 0x5a6c7d, // darker gray-blue for control mode toggle
        },
        BACKGROUND: {
            VIEWPORT: 0xa8a595, // Brighter beige-gray for viewport background
            GAME_MAP: 0xa8a595, // Brighter beige for game map
            LOBBY: 0xa8a595, // Brighter beige for lobby
        },
        OVERLAY: {
            BACKGROUND: 0x000000, // black overlay background
            ALPHA: 0.6, // overlay transparency
        },
        // UI Elements (health, XP, ability, rewards)
        HEALTH_BAR: {
            WIDTH: 200,
            HEIGHT: 24,
            BACKGROUND_COLOR: 0x1a1a1a,
            HEALTH_COLOR: 0x2ecc71, // green
            TEXT_COLOR: 0xffffff,
            BACKGROUND_ALPHA: 0.8,
            FONT_SIZE: '16px',
        },
        XP_INDICATOR: {
            RADIUS: 20, // Match top HUD size
            BACKGROUND_COLOR: 0x333333, // Match top HUD color
            EXPERIENCE_COLOR: 0xf1c40f, // yellow/gold
            TEXT_COLOR: 0xffffff,
            BACKGROUND_ALPHA: 0.8,
            LINE_WIDTH: 10, // Match top HUD thickness
            FONT_SIZE: '18px',
        },
        ABILITY_COOLDOWN: {
            SIZE: 50,
            BACKGROUND_COLOR: 0x1a1a1a,
            COOLDOWN_COLOR: 0x9b59b6, // purple for non-ready abilities
            READY_COLOR: 0xffffff, // white for ready abilities
            BACKGROUND_ALPHA: 0.8,
            FLASH_DURATION_MS: 500,
            ICON_SCALE: 0.7,
        },
        REWARDS_COUNTER: {
            ICON_SIZE: 12,
            SPACING: 8,
            TEXT_COLOR: 0xf1c40f, // yellow/gold
            FONT_SIZE: '14px',
            ICON_COLOR: 0xf1c40f, // yellow/gold
        },
        SPACING: {
            BETWEEN_ELEMENTS: 15, // Reduced from 30 to move circles closer
            FROM_EDGES: 40,
        },
    },
    XP_EVENTS: {
        COLORS: {
            DEFAULT: '#ffffff', // White for regular XP events
            LAST_HIT: '#ffff00', // Yellow for last hits (minion and hero kills)
        },
        FONTS: {
            DEFAULT_SIZE: '21px',
            HERO_KILL_SIZE: '23px', // Larger font for hero kills
        },
        ANIMATION: {
            FLOAT_DISTANCE: 60, // How far the text floats up
            DURATION_MS: 2000,
        },
    },
    LEVEL_UP_EVENTS: {
        COLOR: '#ffd700', // Gold color for level up
        FONT_SIZE: '26px',
        ANIMATION: {
            FLOAT_DISTANCE: 100, // How far the text floats up
            DURATION_MS: 3000,
        },
    },
    PATH_COLORS: {
        STONE_BASE: 0xE8E8E8, // light gray-white base
        STONE_SHADOW: 0xC0C0C0, // medium gray shadow
        STONE_HIGHLIGHT: 0xF5F5F5, // very light gray-white highlight
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
                description: "+30 armor against ability damage",
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
                title: "Class: Thorndive",
                description: "Dash, taunt, reflect damage",
                rarity: "ability"
            },
            "ability:pyromancer": {
                title: "Class: Pyromancer",
                description: "AOE damage and lingering burn",
                rarity: "ability"
            },
            "ability:hookshot": {
                title: "Class: Hookshot",
                description: "Grappling hook with stun",
                rarity: "ability"
            },
            "ability:mercenary": {
                title: "Class: Mercenary",
                description: "Rage-mode assassin with faster heal",
                rarity: "ability"
            },
            "ability:sniper": {
                title: "Class: Sniper",
                description: "Precise ranged projectile",
                rarity: "ability"
            },
            "ability:default": {
                title: "Class: Starter",
                description: "Basic projectile attack",
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
                description: "+25% fire radius",
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
