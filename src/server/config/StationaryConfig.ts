import { GAMEPLAY_CONFIG } from '../../GameConfig';

// Stationary Gameplay Configuration
// Theme: Heroes have essentially zero move speed for testing combat mechanics without movement
export const STATIONARY_CONFIG = JSON.parse(JSON.stringify(GAMEPLAY_CONFIG));

// Override specific values for stationary theme
STATIONARY_CONFIG.HERO_MOVE_SPEED = 0; // Heroes can't move
STATIONARY_CONFIG.MINION_MOVE_SPEED = 2.5; // Keep minions moving normally

// Very short respawn times for testing
STATIONARY_CONFIG.COMBAT.HERO.RESPAWN_TIME_MS = 500; // 0.5 seconds instead of default
STATIONARY_CONFIG.COMBAT.RESPAWN_LEVEL_MULTIPLIER = 0; // No level scaling for respawn time

// Start at level 3
STATIONARY_CONFIG.DEBUG.STARTING_LEVEL = 3;

// Triple all ability ranges and set all cooldowns to 1000ms for stationary testing
STATIONARY_CONFIG.COMBAT.ABILITIES.default.COOLDOWN_MS = 1000; // Fast cooldown for testing
STATIONARY_CONFIG.COMBAT.ABILITIES.default.RANGE = 600; // Doubled range for game size increase (was 300)

STATIONARY_CONFIG.COMBAT.ABILITIES.hookshot.COOLDOWN_MS = 1000; // Fast cooldown for testing
STATIONARY_CONFIG.COMBAT.ABILITIES.hookshot.RANGE = 750; // Doubled range for game size increase (was 375)

STATIONARY_CONFIG.COMBAT.ABILITIES.mercenary.COOLDOWN_MS = 1000; // Fast cooldown for testing

STATIONARY_CONFIG.COMBAT.ABILITIES.pyromancer.COOLDOWN_MS = 1000; // Fast cooldown for testing
STATIONARY_CONFIG.COMBAT.ABILITIES.pyromancer.RANGE = 900; // Doubled range for game size increase (was 450)

STATIONARY_CONFIG.COMBAT.ABILITIES.thorndive.COOLDOWN_MS = 1000; // Fast cooldown for testing
STATIONARY_CONFIG.COMBAT.ABILITIES.thorndive.RANGE = 300; // Doubled range for game size increase (was 150)

STATIONARY_CONFIG.COMBAT.ABILITIES.sniper.COOLDOWN_MS = 1000; // Fast cooldown for testing
STATIONARY_CONFIG.COMBAT.ABILITIES.sniper.RANGE = 800; // Doubled range for game size increase (was 400)

// Spawn each player with a different ability for testing all abilities in stationary mode
STATIONARY_CONFIG.BOTS.ABILITY_TYPES = ['hookshot', 'mercenary', 'pyromancer', 'thorndive', 'sniper'];

// Double minion spawn rate for more action in stationary mode
STATIONARY_CONFIG.MINION_SPAWNING.WAVE_INTERVAL_MS = 4000; // Triple spawn rate (was 12000)