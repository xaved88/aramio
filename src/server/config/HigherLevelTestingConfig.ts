import { GAMEPLAY_CONFIG } from '../../GameConfig';

// Higher Level Testing Gameplay Configuration
// Theme: Start at level 5 for faster testing of higher-level gameplay
export const HIGHER_LEVEL_TESTING_CONFIG = JSON.parse(JSON.stringify(GAMEPLAY_CONFIG));

// Override starting level for testing
HIGHER_LEVEL_TESTING_CONFIG.DEBUG.STARTING_LEVEL = 5; // Start at level 5 instead of 1

// Very fast respawn for testing
HIGHER_LEVEL_TESTING_CONFIG.COMBAT.HERO.RESPAWN_TIME_MS = 1000; // Very fast respawn (was 6000)

// Increased hero movement speed for testing
HIGHER_LEVEL_TESTING_CONFIG.HERO_MOVE_SPEED = 10.0; //

