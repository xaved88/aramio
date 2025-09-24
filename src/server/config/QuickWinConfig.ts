import { GAMEPLAY_CONFIG } from '../../GameConfig';

// Quick Win Gameplay Configuration
// Theme: Very fast games with high damage, low health targets
export const QUICK_WIN_CONFIG = JSON.parse(JSON.stringify(GAMEPLAY_CONFIG));

// Very fast movement
QUICK_WIN_CONFIG.HERO_MOVE_SPEED = 6.0; // Much faster movement (was 3.5)
QUICK_WIN_CONFIG.MINION_MOVE_SPEED = 4.0; // Much faster minions (was 2.5)

// Very fast passive healing
QUICK_WIN_CONFIG.PASSIVE_HEALING.NO_DAMAGE_THRESHOLD_SECONDS = 1; // Very fast healing trigger (was 5)
QUICK_WIN_CONFIG.PASSIVE_HEALING.HEAL_PERCENT_PER_SECOND = 5; // Very fast healing (was 1)

// Glass cannon hero stats - very low health, very high damage
QUICK_WIN_CONFIG.COMBAT.HEROES.default.HEALTH = 30; // Very low health (was 75)
QUICK_WIN_CONFIG.COMBAT.HEROES.default.ATTACK_STRENGTH = 20; // Very high damage (was 5)
QUICK_WIN_CONFIG.COMBAT.HEROES.default.ATTACK_SPEED = 2.0; // Very fast attacks (was 1)
QUICK_WIN_CONFIG.COMBAT.HEROES.default.ATTACK_RADIUS = 200; // Much larger range (was 50)
QUICK_WIN_CONFIG.COMBAT.HEROES.default.WIND_UP = 0.1; // Very fast wind-up (was 0.25)
QUICK_WIN_CONFIG.COMBAT.HEROES.default.RESPAWN_TIME_MS = 2000; // Very fast respawn (was 6000)

QUICK_WIN_CONFIG.COMBAT.HEROES.hookshot.HEALTH = 50; // Very low health (was 105)
QUICK_WIN_CONFIG.COMBAT.HEROES.hookshot.ATTACK_STRENGTH = 30; // Very high damage (was 10)
QUICK_WIN_CONFIG.COMBAT.HEROES.hookshot.ATTACK_SPEED = 1.2; // Very fast attacks (was 0.5)
QUICK_WIN_CONFIG.COMBAT.HEROES.hookshot.ATTACK_RADIUS = 250; // Much larger range (was 25)
QUICK_WIN_CONFIG.COMBAT.HEROES.hookshot.WIND_UP = 0.1; // Very fast wind-up
QUICK_WIN_CONFIG.COMBAT.HEROES.hookshot.RESPAWN_TIME_MS = 2000; // Very fast respawn

QUICK_WIN_CONFIG.COMBAT.HEROES.mercenary.HEALTH = 25; // Very low health (was 60)
QUICK_WIN_CONFIG.COMBAT.HEROES.mercenary.ATTACK_STRENGTH = 15; // Very high damage (was 4)
QUICK_WIN_CONFIG.COMBAT.HEROES.mercenary.ATTACK_SPEED = 2.0; // Very fast attacks (was 1)
QUICK_WIN_CONFIG.COMBAT.HEROES.mercenary.ATTACK_RADIUS = 180; // Much larger range (was 50)
QUICK_WIN_CONFIG.COMBAT.HEROES.mercenary.WIND_UP = 0.1; // Very fast wind-up
QUICK_WIN_CONFIG.COMBAT.HEROES.mercenary.RESPAWN_TIME_MS = 2000; // Very fast respawn

QUICK_WIN_CONFIG.COMBAT.HEROES.pyromancer.HEALTH = 20; // Very low health (was 60)
QUICK_WIN_CONFIG.COMBAT.HEROES.pyromancer.ATTACK_STRENGTH = 10; // Very high damage (was 3)
QUICK_WIN_CONFIG.COMBAT.HEROES.pyromancer.ATTACK_SPEED = 1.8; // Very fast attacks (was 0.8)
QUICK_WIN_CONFIG.COMBAT.HEROES.pyromancer.ATTACK_RADIUS = 220; // Much larger range (was 35)
QUICK_WIN_CONFIG.COMBAT.HEROES.pyromancer.WIND_UP = 0.1; // Very fast wind-up
QUICK_WIN_CONFIG.COMBAT.HEROES.pyromancer.RESPAWN_TIME_MS = 2000; // Very fast respawn

QUICK_WIN_CONFIG.COMBAT.HEROES.thorndive.HEALTH = 60; // Very low health (was 120)
QUICK_WIN_CONFIG.COMBAT.HEROES.thorndive.ATTACK_STRENGTH = 25; // Very high damage (was 8)
QUICK_WIN_CONFIG.COMBAT.HEROES.thorndive.ATTACK_SPEED = 1.5; // Very fast attacks (was 0.6)
QUICK_WIN_CONFIG.COMBAT.HEROES.thorndive.ATTACK_RADIUS = 160; // Much larger range (was 25)
QUICK_WIN_CONFIG.COMBAT.HEROES.thorndive.WIND_UP = 0.1; // Very fast wind-up
QUICK_WIN_CONFIG.COMBAT.HEROES.thorndive.RESPAWN_TIME_MS = 2000; // Very fast respawn

// Very powerful abilities with fast cooldowns
QUICK_WIN_CONFIG.COMBAT.ABILITIES.default.COOLDOWN_MS = 300; // Very fast cooldown (was 1000)
QUICK_WIN_CONFIG.COMBAT.ABILITIES.default.STRENGTH = 25; // Very high damage (was 7)
QUICK_WIN_CONFIG.COMBAT.ABILITIES.default.SPEED = 400; // Very fast projectiles (was 200)
QUICK_WIN_CONFIG.COMBAT.ABILITIES.default.RANGE = 300; // Much larger range (was 100)

QUICK_WIN_CONFIG.COMBAT.ABILITIES.hookshot.COOLDOWN_MS = 2000; // Very fast cooldown (was 5000)
QUICK_WIN_CONFIG.COMBAT.ABILITIES.hookshot.STRENGTH = 15; // Very high damage (was 3)
QUICK_WIN_CONFIG.COMBAT.ABILITIES.hookshot.SPEED = 400; // Very fast projectiles (was 250)
QUICK_WIN_CONFIG.COMBAT.ABILITIES.hookshot.RANGE = 350; // Much larger range (was 125)

QUICK_WIN_CONFIG.COMBAT.ABILITIES.mercenary.COOLDOWN_MS = 3000; // Very fast cooldown (was 8000)
QUICK_WIN_CONFIG.COMBAT.ABILITIES.mercenary.DURATION_MS = 1500; // Shorter duration (was 3000)
QUICK_WIN_CONFIG.COMBAT.ABILITIES.mercenary.ATTACK_BOOST_BASE = 12.0; // Very high boost (was 6.0)
QUICK_WIN_CONFIG.COMBAT.ABILITIES.mercenary.MOVE_SPEED_BOOST_BASE = 1.5; // Very high speed boost (was 0.7)

QUICK_WIN_CONFIG.COMBAT.ABILITIES.pyromancer.COOLDOWN_MS = 800; // Very fast cooldown (was 2000)
QUICK_WIN_CONFIG.COMBAT.ABILITIES.pyromancer.STRENGTH = 35; // Very high damage (was 10)
QUICK_WIN_CONFIG.COMBAT.ABILITIES.pyromancer.SPEED = 400; // Very fast projectiles (was 200)
QUICK_WIN_CONFIG.COMBAT.ABILITIES.pyromancer.RANGE = 350; // Much larger range (was 150)

QUICK_WIN_CONFIG.COMBAT.ABILITIES.thorndive.COOLDOWN_MS = 4000; // Very fast cooldown (was 11000)
QUICK_WIN_CONFIG.COMBAT.ABILITIES.thorndive.DASH_SPEED = 600; // Very fast dash (was 400)
QUICK_WIN_CONFIG.COMBAT.ABILITIES.thorndive.LANDING_DAMAGE = 35; // Very high damage (was 10)

QUICK_WIN_CONFIG.COMBAT.ABILITIES.sniper.COOLDOWN_MS = 400; // Very fast cooldown (was 1000)
QUICK_WIN_CONFIG.COMBAT.ABILITIES.sniper.STRENGTH = 30; // Very high damage (was 7)
QUICK_WIN_CONFIG.COMBAT.ABILITIES.sniper.SPEED = 500; // Very fast projectiles (was 200)
QUICK_WIN_CONFIG.COMBAT.ABILITIES.sniper.RANGE = 500; // Much larger range (was 300)

// Extremely vulnerable structures - 1 health cradle!
QUICK_WIN_CONFIG.COMBAT.CRADLE.HEALTH = 1; // 1 health for instant wins (was 2000)
QUICK_WIN_CONFIG.COMBAT.CRADLE.ATTACK_STRENGTH = 100; // Very high damage (was 40)
QUICK_WIN_CONFIG.COMBAT.CRADLE.ATTACK_SPEED = 2; // Very fast attacks (was 2)
QUICK_WIN_CONFIG.COMBAT.CRADLE.ATTACK_RADIUS = 250; // Much larger range (was 115)

QUICK_WIN_CONFIG.COMBAT.TURRET.HEALTH = 50; // Very low health (was 1000)
QUICK_WIN_CONFIG.COMBAT.TURRET.ATTACK_STRENGTH = 40; // Very high damage (was 25)
QUICK_WIN_CONFIG.COMBAT.TURRET.ATTACK_SPEED = 2; // Very fast attacks (was 2)
QUICK_WIN_CONFIG.COMBAT.TURRET.ATTACK_RADIUS = 300; // Much larger range (was 75)

// Glass cannon minions - very low health, very high damage
QUICK_WIN_CONFIG.COMBAT.MINION.WARRIOR.HEALTH = 15; // Very low health (was 50)
QUICK_WIN_CONFIG.COMBAT.MINION.WARRIOR.ATTACK_STRENGTH = 25; // Very high damage (was 10)
QUICK_WIN_CONFIG.COMBAT.MINION.WARRIOR.ATTACK_SPEED = 1.8; // Very fast attacks (was 0.8)
QUICK_WIN_CONFIG.COMBAT.MINION.WARRIOR.ATTACK_RADIUS = 120; // Much larger range (was 20)

QUICK_WIN_CONFIG.COMBAT.MINION.ARCHER.HEALTH = 8; // Very low health (was 25)
QUICK_WIN_CONFIG.COMBAT.MINION.ARCHER.ATTACK_STRENGTH = 15; // Very high damage (was 5)
QUICK_WIN_CONFIG.COMBAT.MINION.ARCHER.ATTACK_SPEED = 2.0; // Very fast attacks (was 1.2)
QUICK_WIN_CONFIG.COMBAT.MINION.ARCHER.ATTACK_RADIUS = 200; // Much larger range (was 60)

// Very fast minion waves
QUICK_WIN_CONFIG.MINION_SPAWNING.WARRIORS_PER_WAVE = 2; // Same as default (was 2)
QUICK_WIN_CONFIG.MINION_SPAWNING.ARCHERS_PER_WAVE = 3; // Same as default (was 3)
QUICK_WIN_CONFIG.MINION_SPAWNING.WAVE_INTERVAL_MS = 5000; // Very fast waves (was 12000)

// Very fast experience gain
QUICK_WIN_CONFIG.EXPERIENCE.LEVEL_UP_MULTIPLIER = 5; // Very fast leveling (was 15)
QUICK_WIN_CONFIG.EXPERIENCE.MINION_KILLED = 8; // Very high minion XP (was 2)
QUICK_WIN_CONFIG.EXPERIENCE.HERO_KILL_MULTIPLIER = 10; // Very high hero kill XP (was 4)
QUICK_WIN_CONFIG.EXPERIENCE.TOWER_DESTROYED = 150; // Very high tower XP (was 50)
