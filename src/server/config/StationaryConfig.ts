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