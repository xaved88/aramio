// Gameplay Configuration
export const GAMEPLAY_CONFIG = {
    HERO_MOVE_SPEED: 3.5, // pixels per frame
    MINION_MOVE_SPEED: 2.5, // pixels per frame - slower than heroes
    HERO_STOP_DISTANCE: 5, // pixels - how close to target before stopping
    GAME_BOUND_BUFFER: 20, // buffer between canvas edge and playable area

    // Passive healing configuration
    PASSIVE_HEALING: {
        NO_DAMAGE_THRESHOLD_SECONDS: 5, // Seconds without damage to trigger healing
        HEAL_PERCENT_PER_SECOND: 2, // Percentage of max health to heal per second
    },

    // Super minions configuration
    SUPER_MINIONS: {
        ENABLED: true, // Whether minions are buffed, currently triggered by destruction of all enemy turrets
        HEALTH_MULTIPLIER: 2, // 2x health when super minions triggered
        DAMAGE_MULTIPLIER: 2, // 2x damage when super minions triggered
        XP_MULTIPLIER: 4, // 4x XP when super minions are killed
    },

    CRADLE_POSITIONS: {
        BLUE: { x: 100, y: 600 }, // bottom left
        RED: { x: 600, y: 100 },  // top right
    },
    TURRET_POSITIONS: {
        BLUE: [
            { x: 250, y: 450 },  // Blue turret - on diagonal line from bottom-left to top-right
            { x: 125, y: 475 },  // Blue turret 2 - off path, equidistant from blue cradle
            { x: 225, y: 575 }   // Blue turret 3 - off path, equidistant from blue cradle
        ],
        RED: [
            { x: 450, y: 250 },  // Red turret - on diagonal line from bottom-left to top-right
            { x: 575, y: 225 },  // Red turret 2 - mirrored from blue turret 2
            { x: 475, y: 125 }   // Red turret 3 - mirrored from blue turret 3
        ]
    },

    COMBAT: {
        COLLISION_THRESHOLD_MULTIPLIER: 0.9, // 90% threshold for collision detection
        HERO: {
            HEALTH: 75,
            ATTACK_RADIUS: 50,
            ATTACK_STRENGTH: 5,
            ATTACK_SPEED: 1, // attacks per second
            WIND_UP: 0.25, // wind-up time before attack
            RESPAWN_TIME_MS: 6000, // base respawn time
            SIZE: 15, // visual & collision radius
            ABILITY_POWER: 10, // base ability power for calculating ability damage
        },
        ABILITIES: {
            'default': {
                COOLDOWN_MS: 2000, // Increased from 1000ms to 2000ms (2 seconds)
                STRENGTH_RATIO: 1.0, // damage = abilityPower * ratio (was 10 damage with 10 AP)
                SPEED: 200, // pixels per second
                RANGE: 100, // base range (infinite duration projectiles)
            },
            'hookshot': {
                COOLDOWN_MS: 5000,
                STRENGTH_RATIO: 1.0, // damage = abilityPower * ratio (was 10 damage with 10 AP)
                SPEED: 250, // pixels per second (base speed)
                RANGE: 125, // base range
                STUN_DURATION_MS: 700, // 700ms base stun duration
            },
            'mercenary': {
                COOLDOWN_MS: 12000, // Increased from 8000
                DURATION_MS: 2000, // Reduced from 3000 (2 seconds base duration)
                ATTACK_BOOST_BASE: 3.0, // Reduced from 6.0 (300% attack boost instead of 600%)
                MOVE_SPEED_BOOST_BASE: 0.7, //+70% move speed boost (no level scaling)
                RAGE_ATTACK_RADIUS: 25,
                PASSIVE_REGEN_MULTIPLIER: 3.0, // Increased passive regeneration
                RAGE_WIND_UP: 0.1,
                // Removed armor values - no longer grants bullet or ability armor during rage
            },
            'pyromancer': {
                COOLDOWN_MS: 5000,
                STRENGTH_RATIO: 0.25, // damage from the tick of the ability zone
                BURN_STRENGTH_RATIO: 0.12, // burning damage multiplier in formula: (AP * ratio) / (AP + 150)
                DURATION_MS: 2500, // zone duration
                RADIUS: 25,
                RANGE: 100,
                SPEED: 180
            },
            'thorndive': {
                COOLDOWN_MS: 11000, // High cooldown (11 seconds)
                DASH_SPEED: 400, // Dash movement speed (pixels per second)
                RANGE: 100, // Base dash range
                STRENGTH_RATIO: 1.5, // damage = abilityPower * ratio (was 15 damage with 10 AP)
                LANDING_RADIUS: 50, // AOE radius for landing damage (now equal to TAUNT_RADIUS)
                TAUNT_RADIUS: 50, // Radius for taunt effect
                TAUNT_DURATION_MS: 1000, // Base taunt duration (1 second)
                REFLECT_DURATION_MS: 3000, // Base reflect duration (3 seconds)
                REFLECT_PERCENTAGE: 100, // 100% damage reflection
                ARMOR_BONUS_BULLET: 50, // Additional bullet armor during effect
                ARMOR_BONUS_ABILITY: 50, // Additional ability armor during effect
            },
            'sniper': {
                COOLDOWN_MS: 1000, // Same as default
                STRENGTH_RATIO: 1.5, // damage = abilityPower * ratio (was 15 damage with 10 AP)
                SPEED: 250,
                RANGE: 300, // Longer range than default
            }
        },
        CRADLE: {
            HEALTH: 4000,
            ATTACK_RADIUS: 115,
            ATTACK_STRENGTH: 150,
            ATTACK_SPEED: 1, // attacks per second
            WIND_UP: 0.5,
            SIZE: 25, // collision radius (matches CRADLE_SIZE)
        },
        TURRET: {
            HEALTH: 750,
            ATTACK_RADIUS: 75,
            ATTACK_STRENGTH: 25,
            ATTACK_SPEED: 2, // attacks per second
            WIND_UP: 1,
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
        LEVEL_UP_BASE_COST: 15, // Base XP cost for level 1
        LEVEL_UP_INCREASE_RATE: 40, // Rate of increase that diminishes over time
        LEVEL_UP_QUADRATIC_THRESHOLD: 10, // Level where quadratic scaling kicks in
        LEVEL_UP_QUADRATIC_MULTIPLIER: 5, // Additional XP per level above threshold
        STAT_BOOST_PERCENTAGE: 0.10, // 10% boost per level
        RANGE_BOOST_PERCENTAGE: 0.025, // reduced from 0.10 to prevent excessive late-game range at higher levels
        ABILITY_POWER_BOOST_PERCENTAGE: 0.05, // 5% boost per level
        RESPAWN_LEVEL_MULTIPLIER: 0.10, // 10% increase per level
        RESPAWN_MAX_TIME_MS: 20000, // Maximum respawn time cap
        MINION_KILLED: 3,
        HERO_KILL_MULTIPLIER: 4,
        TOWER_DESTROYED: 100,
        UNIT_KILL_RADIUS: 175, // radius within which heroes must be to get unit kill XP
        LAST_HIT_BONUS_PERCENTAGE: 0.25, // bonus experience for getting the last hit on a unit
    },
    MINION_SPAWNING: {
        WARRIORS_PER_WAVE: 2,
        ARCHERS_PER_WAVE: 3,
        FIRST_WAVE_DELAY_MS: 2000,
        WAVE_INTERVAL_MS: 12000,
        SPAWN_RADIUS: 50, // radius around cradle to spawn minions
        ARCHER_SPAWN_DELAY_MS: 1300, // delay before spawning archers after warriors
    },
    HERO_SPAWN_POSITIONS: {
        BLUE: [
            { x: 100, y: 675 }, // Spawn 1: 75 units below blue cradle (clamped to max Y)
            { x: 62, y: 675 },  // Spawn 2: between 1 and 3, same y as 1 and 3
            { x: 62, y: 637 },  // Spawn 3: right angle point of triangle with 2 and 4
            { x: 25, y: 637 },   // Spawn 4: between 3 and 5, same y as 3 and 5
            { x: 25, y: 600 }    // Spawn 5: 75 units left of blue cradle
        ],
        RED: [
            { x: 600, y: 25 },   // Spawn 1: 75 units above red cradle (clamped to min Y)
            { x: 637, y: 25 },   // Spawn 2: between 1 and 3, same y as 1 and 3
            { x: 637, y: 62 },  // Spawn 3: right angle point of triangle with 2 and 4
            { x: 675, y: 62 },  // Spawn 4: between 3 and 5, same y as 3 and 5
            { x: 675, y: 100 }   // Spawn 5: 75 units right of red cradle
        ],
    },
    BOTS: {
        BOTS_PER_TEAM: 5, // Number of bots to spawn per team
        ABILITY_TYPES: ['default'], // Array of ability types for bots to spawn with (loops if more bots than abilities)
        ABILITY_COOLDOWN_MULTIPLIER: {
            MIN: 1.0, // The minimum % of cooldown to wait before firing again (below 1 won't make a difference)
            MAX: 2.2, // The max % of cooldown to wait before firing again
        },
        AWARENESS_RANGE: 200, // Range within which bots count friends and enemies for retreat decisions
    },
    REWARDS: {
        LEVEL_CHESTS: {
            // Override default chest type at specific levels - ability_chest gives new abilities, ability_stats gives stat upgrades
            3: "ability_chest",
            4: "mainly_normal_stats",
            5: "ability_stats",
            7: "mainly_ability_stats",
            8: "mainly_normal_stats",
            10: "ability_stats",
            12: "mainly_ability_stats",
            14: "mainly_normal_stats",
            15: "ability_stats",
            16: "mainly_normal_stats",
            18: "ability_stats",
            20: "mainly_ability_stats",
            22: "ability_stats",
            24: "mainly_normal_stats",
            25: "ability_stats",
            26: "mainly_normal_stats",
            28: "mainly_ability_stats",
            30: "ability_stats",
            32: "ability_stats",
            34: "mainly_normal_stats",
            35: "mainly_ability_stats",
        },
        CHESTS: {
            common: {
                rewards: [
                    { id: "stat:health", weight: 2 },
                    { id: "stat:bullet_armor", weight: 1 },
                    { id: "stat:ability_armor", weight: 1 },
                    { id: "stat:damage", weight: 1 },
                    { id: "stat:attack_speed", weight: 1 },
                    { id: "stat:attack_range", weight: 0.5 },
                    { id: "stat:move_speed", weight: 0.5 },
                ]
            },
            ability_chest: {
                rewards: [
                    { id: "ability:thorndive", weight: 1 },
                    { id: "ability:pyromancer", weight: 1 },
                    { id: "ability:hookshot", weight: 1 },
                    { id: "ability:mercenary", weight: 1 },
                    { id: "ability:sniper", weight: 1 },
                ]
            },
            ability_stats: {
                rewards: [
                    { id: "ability_stat:range", weight: 1 },
                    { id: "ability_stat:strength", weight: 1 },
                    { id: "ability_stat:duration", weight: 1 },
                    { id: "ability_stat:speed", weight: 1 },
                    { id: "ability_stat:cooldown", weight: 1 },
                    { id: "ability_stat:mercenary_rage_speed", weight: 1 },
                    { id: "ability_stat:pyromancer_radius", weight: 1 },
                ]
            },
            mainly_ability_stats: {
                rewards: [
                    // Ability stats (higher weights)
                    { id: "ability_stat:range", weight: 1.5 },
                    { id: "ability_stat:strength", weight: 1.5 },
                    { id: "ability_stat:duration", weight: 1.5 },
                    { id: "ability_stat:speed", weight: 1.5 },
                    { id: "ability_stat:cooldown", weight: 1.5 },
                    { id: "ability_stat:mercenary_rage_speed", weight: 1.5 },
                    { id: "ability_stat:pyromancer_radius", weight: 1.5 },
                    // Normal stats (lower weights)
                    { id: "stat:health", weight: 0.9 },
                    { id: "stat:bullet_armor", weight: 0.5 },
                    { id: "stat:ability_armor", weight: 0.5 },
                    { id: "stat:damage", weight: 0.9 },
                    { id: "stat:attack_speed", weight: 0.9 },
                    { id: "stat:move_speed", weight: 0.5 },
                ]
            },
            mainly_normal_stats: {
                rewards: [
                    // Normal stats (higher weights)
                    { id: "stat:health", weight: 1.5 },
                    { id: "stat:bullet_armor", weight: 1.5 },
                    { id: "stat:ability_armor", weight: 1.5 },
                    { id: "stat:damage", weight: 1.5 },
                    { id: "stat:attack_speed", weight: 1.5 },
                    { id: "stat:attack_range", weight: 1.5 },
                    { id: "stat:move_speed", weight: 1.5 },
                    // Ability stats (lower weights)
                    { id: "ability_stat:range", weight: 0.9 },
                    { id: "ability_stat:strength", weight: 0.9 },
                    { id: "ability_stat:duration", weight: 0.9 },
                    { id: "ability_stat:speed", weight: 0.9 },
                    { id: "ability_stat:cooldown", weight: 0.45 },
                    { id: "ability_stat:mercenary_rage_speed", weight: 0.9 },
                    { id: "ability_stat:pyromancer_radius", weight: 0.45 },
                ]
            }
        },
        REWARD_TYPES: {
            "stat:health": { 
                type: "stat", 
                stats: [
                    { stat: "maxHealth", modifier: { type: "percent", value: 1.15 } }
                ]
            },
            "stat:bullet_armor": { 
                type: "stat", 
                stats: [
                    { stat: "bulletArmor", modifier: { type: "flat", value: 30 } }
                ]
            },
            "stat:ability_armor": { 
                type: "stat", 
                stats: [
                    { stat: "abilityArmor", modifier: { type: "flat", value: 30 } }
                ]
            },
            "stat:damage": { 
                type: "stat", 
                stats: [
                    { stat: "attackStrength", modifier: { type: "percent", value: 1.15 } }
                ]
            },
            "stat:attack_speed": { 
                type: "stat", 
                stats: [
                    { stat: "attackSpeed", modifier: { type: "percent", value: 1.15 } }
                ]
            },
            "stat:attack_range": { 
                type: "stat", 
                stats: [
                    { stat: "attackRadius", modifier: { type: "flat", value: 10 } }
                ]
                // Note: This reward is filtered out for mercenary heroes (melee-focused)
            },
            "stat:move_speed": { 
                type: "stat", 
                stats: [
                    { stat: "moveSpeed", modifier: { type: "percent", value: 1.05 } }
                ]
            },
            "ability:thorndive": {
                type: "ability",
                abilityType: "thorndive"
            },
            "ability:pyromancer": {
                type: "ability", 
                abilityType: "pyromancer"
            },
            "ability:hookshot": {
                type: "ability",
                abilityType: "hookshot"
            },
            "ability:mercenary": {
                type: "ability",
                abilityType: "mercenary"
            },
            "ability:sniper": {
                type: "ability",
                abilityType: "sniper"
            },
            "ability_stat:range": {
                type: "ability_stat",
                stats: [
                    { stat: "ability:range", modifier: { type: "percent", value: 1.20 } }
                ]
            },
            "ability_stat:strength": {
                type: "ability_stat",
                stats: [
                    { stat: "abilityPower", modifier: { type: "percent", value: 1.20 } }
                ]
            },
            "ability_stat:duration": {
                type: "ability_stat",
                stats: [
                    { stat: "ability:duration", modifier: { type: "percent", value: 1.25 } }
                ]
            },
            "ability_stat:cooldown": {
                type: "ability_stat",
                stats: [
                    { stat: "ability:cooldown", modifier: { type: "percent", value: 0.80 } }
                ]
            },
            "ability_stat:mercenary_rage_speed": {
                type: "ability_stat",
                stats: [
                    { stat: "ability:mercenaryRageSpeed", modifier: { type: "percent", value: 1.15 } }
                ]
            },
            "ability_stat:pyromancer_radius": {
                type: "ability_stat",
                stats: [
                    { stat: "ability:pyromancerRadius", modifier: { type: "percent", value: 1.25 } }
                ]
            },
            "ability_stat:speed": {
                type: "ability_stat",
                stats: [
                    { stat: "ability:speed", modifier: { type: "percent", value: 1.25 } }
                ]
            }
        },
        
        // Ability stat support mapping - defines which ability stats each ability type can receive
        ABILITY_STAT_SUPPORT: {
            'default': ['ability:range', 'ability:cooldown', 'abilityPower'],
            'hookshot': ['ability:range', 'ability:cooldown', 'ability:duration', 'ability:speed', 'abilityPower'],
            'mercenary': ['ability:duration', 'ability:cooldown', 'ability:mercenaryRageSpeed'],
            'pyromancer': ['ability:range', 'ability:cooldown', 'ability:duration', 'ability:speed', 'ability:pyromancerRadius', 'abilityPower'],
            'thorndive': ['ability:range', 'ability:cooldown', 'ability:duration', 'abilityPower'],
            'sniper': ['ability:range', 'ability:cooldown', 'ability:speed', 'abilityPower']
        }
    },
    
    // Debug Configuration
    DEBUG: {
        STARTING_LEVEL: 1, // Level that heroes start with
        CHEAT_KILL_PLAYER_ENABLED: true, // Enable 'd' key to instantly kill player for testing
        CHEAT_INSTANT_RESPAWN_ENABLED: true, // Enable 'l' key to instantly respawn player for testing
        CHEAT_LEVEL_UP_ENABLED: true, // Enable 'u' key to level up player for testing
    },

    // Tutorial Configuration
    TUTORIAL: {
        ENABLED: false, // Whether to show tutorial at game start
    },
} as const;
