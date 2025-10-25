import { GAMEPLAY_CONFIG } from '../../GameConfig';

// Projectile Speed Testing Configuration
// Theme: Easy testing of projectile speed collisions on sniper
export const PROJECTILE_SPEED_TESTING_CONFIG = JSON.parse(JSON.stringify(GAMEPLAY_CONFIG));

// Make sniper have 99 weight in rewards (very likely to get sniper ability)
PROJECTILE_SPEED_TESTING_CONFIG.REWARDS.CHESTS.ability_chest.rewards.forEach((reward: any) => {
    if (reward.id === "ability:sniper") {
        reward.weight = 99;
    }
});

// Make projectile speed have 99 weight in all chest types and be present in all chests
const chestTypes = ['common', 'ability_stats', 'mainly_ability_stats', 'mainly_normal_stats'];
chestTypes.forEach(chestType => {
    const chest = PROJECTILE_SPEED_TESTING_CONFIG.REWARDS.CHESTS[chestType];
    if (chest) {
        // Add projectile speed to chest if not present
        const hasProjectileSpeed = chest.rewards.some((reward: any) => reward.id === "ability_stat:speed");
        if (!hasProjectileSpeed) {
            chest.rewards.push({ id: "ability_stat:speed", weight: 99 });
        } else {
            // Update existing projectile speed weight
            chest.rewards.forEach((reward: any) => {
                if (reward.id === "ability_stat:speed") {
                    reward.weight = 99;
                }
            });
        }
    }
});

// Make projectile speed upgrade give 150% speed boost instead of 25%
PROJECTILE_SPEED_TESTING_CONFIG.REWARDS.REWARD_TYPES["ability_stat:speed"].stats[0].modifier.value = 2.5; // 150% boost = 2.5x multiplier

// Make sniper base cooldown 1 second instead of 3 seconds
PROJECTILE_SPEED_TESTING_CONFIG.COMBAT.ABILITIES.sniper.COOLDOWN_MS = 1000;
