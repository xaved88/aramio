import { GAMEPLAY_CONFIG } from '../../GameConfig';

// Death Effects Testing Gameplay Configuration
// Theme: Red team spawns inside blue turret range with faster turrets
export const DEATH_EFFECTS_TESTING_CONFIG = JSON.parse(JSON.stringify(GAMEPLAY_CONFIG));

// Make turrets much faster
DEATH_EFFECTS_TESTING_CONFIG.COMBAT.TURRET.ATTACK_SPEED = 4; // Much faster attacks (was 2)
DEATH_EFFECTS_TESTING_CONFIG.COMBAT.TURRET.WIND_UP = 0.5; // Much slower target acquisition (was 0.5)

// Increase blue turret range and health significantly
DEATH_EFFECTS_TESTING_CONFIG.COMBAT.TURRET.HEALTH = 3000; // Much higher health (was 1000)
DEATH_EFFECTS_TESTING_CONFIG.COMBAT.TURRET.ATTACK_RADIUS = 200; // Even larger range (was 75)

// Move red team spawn positions to be inside blue turret range
// Blue turret is at (250, 450) with radius 75, so red spawns should be within 175 units
DEATH_EFFECTS_TESTING_CONFIG.HERO_SPAWN_POSITIONS.RED = [
    { x: 200, y: 400 },  // Spawn 1: Close to blue turret
    { x: 180, y: 420 },  // Spawn 2: Slightly offset
    { x: 220, y: 420 },  // Spawn 3: Other side
    { x: 200, y: 480 },  // Spawn 4: Below turret
    { x: 250, y: 450 }   // Spawn 5: Right on top of turret (chaos!)
];

// Move red cradle out of blue turret range
DEATH_EFFECTS_TESTING_CONFIG.CRADLE_POSITIONS.RED = { x: 500, y: 200 }; // Outside blue turret range

// Remove second and third blue turrets - only keep the main one
DEATH_EFFECTS_TESTING_CONFIG.TURRET_POSITIONS.BLUE = [
    { x: 250, y: 450 }  // Only keep the main blue turret
];

// Move red turret to far corner
DEATH_EFFECTS_TESTING_CONFIG.TURRET_POSITIONS.RED = [
    { x: 50, y: 50 }   // Far corner away from everything
];

// Adjust minion spawn radius for red team to spawn closer to blue turret
DEATH_EFFECTS_TESTING_CONFIG.MINION_SPAWNING.SPAWN_RADIUS = 30; // Smaller spawn radius (was 50)

// Make the game more chaotic with faster movement
DEATH_EFFECTS_TESTING_CONFIG.HERO_MOVE_SPEED = 7.0; // Much faster movement (was 3.5)
DEATH_EFFECTS_TESTING_CONFIG.MINION_MOVE_SPEED = 3.0; // Faster minions (was 2.5)

// Faster minion waves for more chaos
DEATH_EFFECTS_TESTING_CONFIG.MINION_SPAWNING.WAVE_INTERVAL_MS = 8000; // Faster waves (was 12000)

// Slightly reduce hero health to make turret damage more impactful
DEATH_EFFECTS_TESTING_CONFIG.COMBAT.HERO.HEALTH = 60; // Lower health (was 75)
DEATH_EFFECTS_TESTING_CONFIG.COMBAT.HERO.RESPAWN_TIME_MS = 1000; // Very fast respawn (was 6000)

// Reduce cradle attack range to 5
DEATH_EFFECTS_TESTING_CONFIG.COMBAT.CRADLE.ATTACK_RADIUS = 5; // Very small range (was 115)
DEATH_EFFECTS_TESTING_CONFIG.COMBAT.CRADLE.HEALTH = 100000; // 20x more health (was 5000)

// Make turrets more dangerous
DEATH_EFFECTS_TESTING_CONFIG.COMBAT.TURRET.ATTACK_STRENGTH = 100; // Much higher damage (was 25)
