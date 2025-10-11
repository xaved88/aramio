import { GAMEPLAY_CONFIG } from '../../GameConfig';

// Practice/Learning Gameplay Configuration
// Theme: Safe environment to learn abilities with frequent unlocks and forgiving combat
export const PRACTICE_CONFIG = JSON.parse(JSON.stringify(GAMEPLAY_CONFIG));

// High health regen - very forgiving
PRACTICE_CONFIG.PASSIVE_HEALING.NO_DAMAGE_THRESHOLD_SECONDS = 2; // Fast healing trigger (was 5)
PRACTICE_CONFIG.PASSIVE_HEALING.HEAL_PERCENT_PER_SECOND = 8; // Very fast healing (was 2)

// Disable super minions
PRACTICE_CONFIG.SUPER_MINIONS.ENABLED = false;

// Closer spawns and cradles for faster engagement
PRACTICE_CONFIG.CRADLE_POSITIONS = {
    BLUE: { x: 200, y: 500 }, // Moved closer to center from (100, 600)
    RED: { x: 500, y: 200 },  // Moved closer to center from (600, 100)
};

// Update spawn positions to be closer to new cradle positions
PRACTICE_CONFIG.HERO_SPAWN_POSITIONS = {
    BLUE: [
        { x: 200, y: 575 }, // 75 units below blue cradle
        { x: 162, y: 575 }, // Between 1 and 3
        { x: 162, y: 537 }, // Right angle point
        { x: 125, y: 537 }, // Between 3 and 5
        { x: 125, y: 500 }  // 75 units left of blue cradle
    ],
    RED: [
        { x: 500, y: 125 }, // 75 units above red cradle
        { x: 537, y: 125 }, // Between 1 and 3
        { x: 537, y: 162 }, // Right angle point
        { x: 575, y: 162 }, // Between 3 and 5
        { x: 575, y: 200 }  // 75 units right of red cradle
    ],
};

// No turrets - focus on hero combat and learning
PRACTICE_CONFIG.TURRET_POSITIONS = {
    BLUE: [],
    RED: []
};

// Weak cradle damage - won't punish players too hard
PRACTICE_CONFIG.COMBAT.CRADLE.ATTACK_STRENGTH = 30; // Very low damage (was 150)

// Every second chest is an ability chest - frequent ability unlocks
PRACTICE_CONFIG.REWARDS.LEVEL_CHESTS = {
    2: "ability_chest",
    4: "ability_chest",
    6: "ability_chest",
    8: "ability_chest",
    10: "ability_chest",
};

// Faster leveling to unlock abilities quickly
PRACTICE_CONFIG.EXPERIENCE.LEVEL_UP_BASE_COST = 10; // Easier leveling (was 15)
PRACTICE_CONFIG.EXPERIENCE.MINION_KILLED = 5; // More XP from minions (was 3)
PRACTICE_CONFIG.EXPERIENCE.HERO_KILL_MULTIPLIER = 10; // Much more XP from hero kills (was 4)

// Half ability cooldowns for practice
PRACTICE_CONFIG.COMBAT.ABILITIES.default.COOLDOWN_MS = 1000; // Halved from 2000
PRACTICE_CONFIG.COMBAT.ABILITIES.default.STRENGTH_RATIO = 1.5; // Increased damage (was 1.0)
PRACTICE_CONFIG.COMBAT.ABILITIES.hookshot.COOLDOWN_MS = 2500; // Halved from 5000
PRACTICE_CONFIG.COMBAT.ABILITIES.mercenary.COOLDOWN_MS = 6000; // Halved from 12000
PRACTICE_CONFIG.COMBAT.ABILITIES.pyromancer.COOLDOWN_MS = 2500; // Halved from 5000
PRACTICE_CONFIG.COMBAT.ABILITIES.thorndive.COOLDOWN_MS = 5500; // Halved from 11000
PRACTICE_CONFIG.COMBAT.ABILITIES.sniper.COOLDOWN_MS = 500; // Halved from 1000

// Make bots fire abilities 4x less frequently
PRACTICE_CONFIG.BOTS.ABILITY_COOLDOWN_MULTIPLIER = {
    MIN: 2.0, // 4x slower (was 1.0)
    MAX: 4.0, // 4x slower (was 2.2)
};

// Minimal minions - some for XP but not overwhelming
PRACTICE_CONFIG.MINION_SPAWNING.WARRIORS_PER_WAVE = 2; // 2 warriors per wave
PRACTICE_CONFIG.MINION_SPAWNING.ARCHERS_PER_WAVE = 0; // No archers

