import { GAMEPLAY_CONFIG } from '../../GameConfig';

// Tutorial Gameplay Configuration
// Theme: Learning environment with no obstacles, smaller map, and minions only
export const TUTORIAL_CONFIG = JSON.parse(JSON.stringify(GAMEPLAY_CONFIG));

// Smaller map size - more focused training area
TUTORIAL_CONFIG.MAP_WIDTH = 900;
TUTORIAL_CONFIG.MAP_HEIGHT = 900;

TUTORIAL_CONFIG.CRADLE_POSITIONS = {
    BLUE: { x: 300, y: 700 },
    RED: { x: 600, y: 200 },
};

// Update spawn positions for smaller map
TUTORIAL_CONFIG.HERO_SPAWN_POSITIONS = {
    BLUE: [
        { x: 300, y: 775 },   // below blue cradle
        { x: 262, y: 775 },
        { x: 262, y: 737 },
        { x: 225, y: 737 },
        { x: 225, y: 700 }
    ],
    RED: [
        { x: 600, y: 225 },   // above red cradle
        { x: 637, y: 225 },
        { x: 637, y: 262 },
        { x: 675, y: 262 },
        { x: 675, y: 300 }
    ],
};

// No turrets - simplified gameplay
TUTORIAL_CONFIG.TURRET_POSITIONS = {
    BLUE: [],
    RED: []
};

// No obstacles - clear path for learning
TUTORIAL_CONFIG.OBSTACLES.WALLS = [];

// No enemy bots - player practices against minions only
TUTORIAL_CONFIG.BOTS.BOTS_PER_TEAM = 0;

// Keep minions spawning for practice targets
// Minion spawning config remains the same as default

// Disable super minions - simplified learning experience
TUTORIAL_CONFIG.SUPER_MINIONS.ENABLED = false;

// Faster minions so there's more action in tutorial
TUTORIAL_CONFIG.MINION_SPAWNING.WAVE_INTERVAL_MS = 8000; // Spawn more frequently (was 12000)

// Lower cradle health for easier objective demonstration
TUTORIAL_CONFIG.COMBAT.CRADLE.HEALTH = 2000; // (was 4000)

// Enable basic tutorial
TUTORIAL_CONFIG.tutorial = 'basic-tutorial';

