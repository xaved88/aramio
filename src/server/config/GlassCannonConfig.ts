import { GAMEPLAY_CONFIG } from '../../GameConfig';

// Glass Cannon Gameplay Configuration
// Theme: High damage, low health, fast-paced combat
export const GLASS_CANNON_CONFIG = JSON.parse(JSON.stringify(GAMEPLAY_CONFIG));

// Override specific values for glass cannon theme
GLASS_CANNON_CONFIG.HERO_MOVE_SPEED = 4.5; // Faster movement (was 3.5)
GLASS_CANNON_CONFIG.MINION_MOVE_SPEED = 3.0; // Faster minions (was 2.5)

// Faster passive healing
GLASS_CANNON_CONFIG.PASSIVE_HEALING.NO_DAMAGE_THRESHOLD_SECONDS = 3; // Faster healing trigger (was 5)
GLASS_CANNON_CONFIG.PASSIVE_HEALING.HEAL_PERCENT_PER_SECOND = 2; // Faster healing (was 1)

// Glass cannon hero stats - much lower health, much higher damage
GLASS_CANNON_CONFIG.COMBAT.HEROES.default.HEALTH = 40; // Much lower health (was 75)
GLASS_CANNON_CONFIG.COMBAT.HEROES.default.ATTACK_STRENGTH = 12; // Much higher damage (was 5)
GLASS_CANNON_CONFIG.COMBAT.HEROES.default.ATTACK_SPEED = 1.5; // Faster attacks (was 1)
GLASS_CANNON_CONFIG.COMBAT.HEROES.default.WIND_UP = 0.15; // Faster wind-up (was 0.25)
GLASS_CANNON_CONFIG.COMBAT.HEROES.default.RESPAWN_TIME_MS = 3000; // Faster respawn (was 6000)

GLASS_CANNON_CONFIG.COMBAT.HEROES.hookshot.HEALTH = 60; // Lower health (was 105)
GLASS_CANNON_CONFIG.COMBAT.HEROES.hookshot.ATTACK_STRENGTH = 20; // Much higher damage (was 10)
GLASS_CANNON_CONFIG.COMBAT.HEROES.hookshot.ATTACK_SPEED = 0.8; // Faster attacks (was 0.5)
GLASS_CANNON_CONFIG.COMBAT.HEROES.hookshot.WIND_UP = 0.15; // Faster wind-up
GLASS_CANNON_CONFIG.COMBAT.HEROES.hookshot.RESPAWN_TIME_MS = 3000; // Faster respawn

GLASS_CANNON_CONFIG.COMBAT.HEROES.mercenary.HEALTH = 35; // Lower health (was 60)
GLASS_CANNON_CONFIG.COMBAT.HEROES.mercenary.ATTACK_STRENGTH = 8; // Higher damage (was 4)
GLASS_CANNON_CONFIG.COMBAT.HEROES.mercenary.ATTACK_SPEED = 1.5; // Faster attacks (was 1)
GLASS_CANNON_CONFIG.COMBAT.HEROES.mercenary.WIND_UP = 0.15; // Faster wind-up
GLASS_CANNON_CONFIG.COMBAT.HEROES.mercenary.RESPAWN_TIME_MS = 3000; // Faster respawn

GLASS_CANNON_CONFIG.COMBAT.HEROES.pyromancer.HEALTH = 30; // Much lower health (was 60)
GLASS_CANNON_CONFIG.COMBAT.HEROES.pyromancer.ATTACK_STRENGTH = 6; // Higher damage (was 3)
GLASS_CANNON_CONFIG.COMBAT.HEROES.pyromancer.ATTACK_SPEED = 1.2; // Faster attacks (was 0.8)
GLASS_CANNON_CONFIG.COMBAT.HEROES.pyromancer.WIND_UP = 0.15; // Faster wind-up
GLASS_CANNON_CONFIG.COMBAT.HEROES.pyromancer.RESPAWN_TIME_MS = 3000; // Faster respawn

GLASS_CANNON_CONFIG.COMBAT.HEROES.thorndive.HEALTH = 80; // Lower health (was 120)
GLASS_CANNON_CONFIG.COMBAT.HEROES.thorndive.ATTACK_STRENGTH = 16; // Much higher damage (was 8)
GLASS_CANNON_CONFIG.COMBAT.HEROES.thorndive.ATTACK_SPEED = 1.0; // Faster attacks (was 0.6)
GLASS_CANNON_CONFIG.COMBAT.HEROES.thorndive.WIND_UP = 0.15; // Faster wind-up
GLASS_CANNON_CONFIG.COMBAT.HEROES.thorndive.RESPAWN_TIME_MS = 3000; // Faster respawn
GLASS_CANNON_CONFIG.COMBAT.HEROES.thorndive.BULLET_ARMOR = 10; // Reduced armor (was 20)
GLASS_CANNON_CONFIG.COMBAT.HEROES.thorndive.ABILITY_ARMOR = 10; // Reduced armor (was 20)

// Glass cannon abilities - faster cooldowns, higher damage
GLASS_CANNON_CONFIG.COMBAT.ABILITIES.default.COOLDOWN_MS = 600; // Faster cooldown (was 1000)
GLASS_CANNON_CONFIG.COMBAT.ABILITIES.default.STRENGTH = 15; // Much higher damage (was 7)
GLASS_CANNON_CONFIG.COMBAT.ABILITIES.default.SPEED = 250; // Faster projectiles (was 200)

GLASS_CANNON_CONFIG.COMBAT.ABILITIES.hookshot.COOLDOWN_MS = 3000; // Faster cooldown (was 5000)
GLASS_CANNON_CONFIG.COMBAT.ABILITIES.hookshot.STRENGTH = 8; // Higher damage (was 3)
GLASS_CANNON_CONFIG.COMBAT.ABILITIES.hookshot.SPEED = 300; // Faster projectiles (was 250)
GLASS_CANNON_CONFIG.COMBAT.ABILITIES.hookshot.STUN_DURATION_MS = 500; // Shorter stun (was 700)

GLASS_CANNON_CONFIG.COMBAT.ABILITIES.mercenary.COOLDOWN_MS = 8000; // Faster cooldown (was 12000)
GLASS_CANNON_CONFIG.COMBAT.ABILITIES.mercenary.DURATION_MS = 1500; // Shorter duration (was 2000)
GLASS_CANNON_CONFIG.COMBAT.ABILITIES.mercenary.ATTACK_BOOST_BASE = 5.0; // Higher boost (was 3.0)
GLASS_CANNON_CONFIG.COMBAT.ABILITIES.mercenary.MOVE_SPEED_BOOST_BASE = 1.0; // Higher speed boost (was 0.7)
GLASS_CANNON_CONFIG.COMBAT.ABILITIES.mercenary.RAGE_WIND_UP = 0.05; // Faster wind-up (was 0.1)
// Removed armor values - no longer grants bullet or ability armor during rage

GLASS_CANNON_CONFIG.COMBAT.ABILITIES.pyromancer.COOLDOWN_MS = 1200; // Faster cooldown (was 2000)
GLASS_CANNON_CONFIG.COMBAT.ABILITIES.pyromancer.STRENGTH = 20; // Much higher damage (was 10)
// STRENGTH_PER_LEVEL removed - strength now improved through rewards
GLASS_CANNON_CONFIG.COMBAT.ABILITIES.pyromancer.SPEED = 250; // Faster projectiles (was 200)

GLASS_CANNON_CONFIG.COMBAT.ABILITIES.thorndive.COOLDOWN_MS = 7000; // Faster cooldown (was 11000)
GLASS_CANNON_CONFIG.COMBAT.ABILITIES.thorndive.DASH_SPEED = 500; // Faster dash (was 400)
GLASS_CANNON_CONFIG.COMBAT.ABILITIES.thorndive.LANDING_DAMAGE = 20; // Higher damage (was 10)
// LANDING_DAMAGE_PER_LEVEL removed - strength now improved through rewards
GLASS_CANNON_CONFIG.COMBAT.ABILITIES.thorndive.TAUNT_DURATION_MS = 800; // Shorter taunt (was 1000)
GLASS_CANNON_CONFIG.COMBAT.ABILITIES.thorndive.REFLECT_DURATION_MS = 2000; // Shorter reflect (was 3000)
GLASS_CANNON_CONFIG.COMBAT.ABILITIES.thorndive.ARMOR_BONUS_BULLET = 25; // Reduced armor (was 50)
GLASS_CANNON_CONFIG.COMBAT.ABILITIES.thorndive.ARMOR_BONUS_ABILITY = 25; // Reduced armor (was 50)

GLASS_CANNON_CONFIG.COMBAT.ABILITIES.sniper.COOLDOWN_MS = 600; // Faster cooldown (was 1000)
GLASS_CANNON_CONFIG.COMBAT.ABILITIES.sniper.STRENGTH = 18; // Much higher damage (was 7)
GLASS_CANNON_CONFIG.COMBAT.ABILITIES.sniper.SPEED = 300; // Faster projectiles (was 200)

// Glass cannon structures - lower health, higher damage
GLASS_CANNON_CONFIG.COMBAT.CRADLE.HEALTH = 1000; // Lower health (was 2000)
GLASS_CANNON_CONFIG.COMBAT.CRADLE.ATTACK_STRENGTH = 60; // Higher damage (was 40)
GLASS_CANNON_CONFIG.COMBAT.CRADLE.ATTACK_SPEED = 0.5; // Faster attacks (was 0.3)
GLASS_CANNON_CONFIG.COMBAT.CRADLE.WIND_UP = 0.2; // Faster wind-up (was 0.3)

GLASS_CANNON_CONFIG.COMBAT.TURRET.HEALTH = 300; // Lower health (was 500)
GLASS_CANNON_CONFIG.COMBAT.TURRET.ATTACK_STRENGTH = 25; // Higher damage (was 15)
GLASS_CANNON_CONFIG.COMBAT.TURRET.ATTACK_SPEED = 0.8; // Faster attacks (was 0.5)
GLASS_CANNON_CONFIG.COMBAT.TURRET.WIND_UP = 0.15; // Faster wind-up (was 0.2)

// Glass cannon minions - lower health, higher damage
GLASS_CANNON_CONFIG.COMBAT.MINION.WARRIOR.HEALTH = 30; // Lower health (was 50)
GLASS_CANNON_CONFIG.COMBAT.MINION.WARRIOR.ATTACK_STRENGTH = 15; // Higher damage (was 10)
GLASS_CANNON_CONFIG.COMBAT.MINION.WARRIOR.ATTACK_SPEED = 1.2; // Faster attacks (was 0.8)
GLASS_CANNON_CONFIG.COMBAT.MINION.WARRIOR.WIND_UP = 0.15; // Faster wind-up (was 0.3)

GLASS_CANNON_CONFIG.COMBAT.MINION.ARCHER.HEALTH = 15; // Lower health (was 25)
GLASS_CANNON_CONFIG.COMBAT.MINION.ARCHER.ATTACK_STRENGTH = 8; // Higher damage (was 5)
GLASS_CANNON_CONFIG.COMBAT.MINION.ARCHER.ATTACK_SPEED = 1.6; // Faster attacks (was 1.2)
GLASS_CANNON_CONFIG.COMBAT.MINION.ARCHER.WIND_UP = 0.15; // Faster wind-up (was 0.25)

// More minions per wave for glass cannon theme
GLASS_CANNON_CONFIG.MINION_SPAWNING.WARRIORS_PER_WAVE = 3; // More warriors (was 2)
GLASS_CANNON_CONFIG.MINION_SPAWNING.ARCHERS_PER_WAVE = 4; // More archers (was 3)
GLASS_CANNON_CONFIG.MINION_SPAWNING.WAVE_INTERVAL_MS = 8000; // Faster waves (was 12000)

// Faster experience gain
GLASS_CANNON_CONFIG.EXPERIENCE.LEVEL_UP_MULTIPLIER = 10; // Faster leveling (was 15)
GLASS_CANNON_CONFIG.EXPERIENCE.MINION_KILLED = 4; // Higher minion XP (was 2)
GLASS_CANNON_CONFIG.EXPERIENCE.HERO_KILL_MULTIPLIER = 6; // Higher hero kill XP (was 4)
GLASS_CANNON_CONFIG.EXPERIENCE.TOWER_DESTROYED = 75; // Higher tower XP (was 50)
