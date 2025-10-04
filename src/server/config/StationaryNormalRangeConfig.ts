import { GAMEPLAY_CONFIG } from '../../GameConfig';

// Stationary Normal Range Gameplay Configuration
// Theme: Heroes have zero move speed for testing combat mechanics without movement
// but with normal ability ranges instead of the increased ranges in stationary high range config
export const STATIONARY_NORMAL_RANGE_CONFIG = JSON.parse(JSON.stringify(GAMEPLAY_CONFIG));

// Override specific values for stationary normal range theme
STATIONARY_NORMAL_RANGE_CONFIG.HERO_MOVE_SPEED = 0; // Heroes can't move
STATIONARY_NORMAL_RANGE_CONFIG.MINION_MOVE_SPEED = 2.5; // Keep minions moving normally

// Very short respawn times for testing
STATIONARY_NORMAL_RANGE_CONFIG.COMBAT.HERO.RESPAWN_TIME_MS = 500; // 0.5 seconds instead of default
STATIONARY_NORMAL_RANGE_CONFIG.COMBAT.RESPAWN_LEVEL_MULTIPLIER = 0; // No level scaling for respawn time

// Start at level 3
STATIONARY_NORMAL_RANGE_CONFIG.DEBUG.STARTING_LEVEL = 3;

// Set all cooldowns to 1000ms for testing but keep normal ranges
STATIONARY_NORMAL_RANGE_CONFIG.COMBAT.ABILITIES.default.COOLDOWN_MS = 1000; // Fast cooldown for testing

STATIONARY_NORMAL_RANGE_CONFIG.COMBAT.ABILITIES.hookshot.COOLDOWN_MS = 1000; // Fast cooldown for testing

STATIONARY_NORMAL_RANGE_CONFIG.COMBAT.ABILITIES.mercenary.COOLDOWN_MS = 1000; // Fast cooldown for testing

STATIONARY_NORMAL_RANGE_CONFIG.COMBAT.ABILITIES.pyromancer.COOLDOWN_MS = 1000; // Fast cooldown for testing

STATIONARY_NORMAL_RANGE_CONFIG.COMBAT.ABILITIES.thorndive.COOLDOWN_MS = 1000; // Fast cooldown for testing

STATIONARY_NORMAL_RANGE_CONFIG.COMBAT.ABILITIES.sniper.COOLDOWN_MS = 1000; // Fast cooldown for testing

// Spawn each player with a different ability for testing all abilities in stationary normal range mode
STATIONARY_NORMAL_RANGE_CONFIG.BOTS.ABILITY_TYPES = ['hookshot', 'mercenary', 'pyromancer', 'thorndive', 'sniper'];

// Double minion spawn rate for more action in stationary normal range mode
STATIONARY_NORMAL_RANGE_CONFIG.MINION_SPAWNING.WAVE_INTERVAL_MS = 4000; // Triple spawn rate (was 12000)
