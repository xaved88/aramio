import { BotRewardPreferences } from '../BotRewardPreferences';
import { TEST_GAMEPLAY_CONFIG } from '../../../config/TestGameplayConfig';

describe('BotRewardPreferences', () => {
    describe('getPreferences', () => {
        it('should return preferences for hookshot ability', () => {
            const preferences = BotRewardPreferences.getPreferences('hookshot', TEST_GAMEPLAY_CONFIG);
            
            // Should have ability-specific preferences
            const rangePref = preferences.find(p => p.rewardId === 'ability_stat:range');
            const cooldownPref = preferences.find(p => p.rewardId === 'ability_stat:cooldown');
            const durationPref = preferences.find(p => p.rewardId === 'ability_stat:duration');
            const attackRangePref = preferences.find(p => p.rewardId === 'stat:attack_range');
            const moveSpeedPref = preferences.find(p => p.rewardId === 'stat:move_speed');
            
            expect(rangePref).toBeDefined();
            expect(rangePref?.weight).toBe(10);
            expect(cooldownPref).toBeDefined();
            expect(cooldownPref?.weight).toBe(20);
            expect(durationPref).toBeDefined();
            expect(durationPref?.weight).toBe(15); // Good priority for hookshot stun duration
            expect(attackRangePref).toBeDefined();
            expect(attackRangePref?.weight).toBe(18); // Increased weight for normal stats
            expect(moveSpeedPref).toBeDefined();
            expect(moveSpeedPref?.weight).toBe(12); // Increased weight for normal stats
        });

        it('should return preferences for mercenary ability', () => {
            const preferences = BotRewardPreferences.getPreferences('mercenary', TEST_GAMEPLAY_CONFIG);
            
            // Should have ability-specific preferences
            const durationPref = preferences.find(p => p.rewardId === 'ability_stat:duration');
            const rageSpeedPref = preferences.find(p => p.rewardId === 'ability_stat:mercenary_rage_speed');
            const damagePref = preferences.find(p => p.rewardId === 'stat:damage');
            const attackSpeedPref = preferences.find(p => p.rewardId === 'stat:attack_speed');
            const healthPref = preferences.find(p => p.rewardId === 'stat:health');
            
            expect(durationPref).toBeDefined();
            expect(durationPref?.weight).toBe(25);
            expect(rageSpeedPref).toBeDefined();
            expect(rageSpeedPref?.weight).toBe(15);
            expect(damagePref).toBeDefined();
            expect(damagePref?.weight).toBe(18); // Increased weight for normal stats
            expect(attackSpeedPref).toBeDefined();
            expect(attackSpeedPref?.weight).toBe(12); // Increased weight for normal stats
            expect(healthPref).toBeDefined();
            expect(healthPref?.weight).toBe(10); // Increased weight for normal stats
        });

        it('should return preferences for pyromancer ability', () => {
            const preferences = BotRewardPreferences.getPreferences('pyromancer', TEST_GAMEPLAY_CONFIG);
            
            // Should have ability-specific preferences
            const radiusPref = preferences.find(p => p.rewardId === 'ability_stat:pyromancer_radius');
            const strengthPref = preferences.find(p => p.rewardId === 'ability_stat:strength');
            const damagePref = preferences.find(p => p.rewardId === 'stat:damage');
            const attackRangePref = preferences.find(p => p.rewardId === 'stat:attack_range');
            const attackSpeedPref = preferences.find(p => p.rewardId === 'stat:attack_speed');
            
            expect(radiusPref).toBeDefined();
            expect(radiusPref?.weight).toBe(15);
            expect(strengthPref).toBeDefined();
            expect(strengthPref?.weight).toBe(25);
            expect(damagePref).toBeDefined();
            expect(damagePref?.weight).toBe(18); // Increased weight for normal stats
            expect(attackRangePref).toBeDefined();
            expect(attackRangePref?.weight).toBe(12); // Increased weight for normal stats
            expect(attackSpeedPref).toBeDefined();
            expect(attackSpeedPref?.weight).toBe(10); // Increased weight for normal stats
        });

        it('should return preferences for thorndive ability', () => {
            const preferences = BotRewardPreferences.getPreferences('thorndive', TEST_GAMEPLAY_CONFIG);
            
            // Should have ability-specific preferences
            const cooldownPref = preferences.find(p => p.rewardId === 'ability_stat:cooldown');
            const rangePref = preferences.find(p => p.rewardId === 'ability_stat:range');
            const healthPref = preferences.find(p => p.rewardId === 'stat:health');
            const abilityArmorPref = preferences.find(p => p.rewardId === 'stat:ability_armor');
            const bulletArmorPref = preferences.find(p => p.rewardId === 'stat:bullet_armor');
            
            expect(cooldownPref).toBeDefined();
            expect(cooldownPref?.weight).toBe(25);
            expect(rangePref).toBeDefined();
            expect(rangePref?.weight).toBe(20);
            expect(healthPref).toBeDefined();
            expect(healthPref?.weight).toBe(18); // Increased weight for normal stats
            expect(abilityArmorPref).toBeDefined();
            expect(abilityArmorPref?.weight).toBe(10); // Increased weight for normal stats
            expect(bulletArmorPref).toBeDefined();
            expect(bulletArmorPref?.weight).toBe(10); // Increased weight for normal stats
        });

        it('should return preferences for sniper ability', () => {
            const preferences = BotRewardPreferences.getPreferences('sniper', TEST_GAMEPLAY_CONFIG);
            
            // Should have ability-specific preferences
            const rangePref = preferences.find(p => p.rewardId === 'ability_stat:range');
            const strengthPref = preferences.find(p => p.rewardId === 'ability_stat:strength');
            const damagePref = preferences.find(p => p.rewardId === 'stat:damage');
            const attackRangePref = preferences.find(p => p.rewardId === 'stat:attack_range');
            const attackSpeedPref = preferences.find(p => p.rewardId === 'stat:attack_speed');
            
            expect(rangePref).toBeDefined();
            expect(rangePref?.weight).toBe(10);
            expect(strengthPref).toBeDefined();
            expect(strengthPref?.weight).toBe(20);
            expect(damagePref).toBeDefined();
            expect(damagePref?.weight).toBe(18); // Increased weight for normal stats
            expect(attackRangePref).toBeDefined();
            expect(attackRangePref?.weight).toBe(15); // Increased weight for normal stats
            expect(attackSpeedPref).toBeDefined();
            expect(attackSpeedPref?.weight).toBe(12); // Increased weight for normal stats
        });

        it('should return general preferences for default ability', () => {
            const preferences = BotRewardPreferences.getPreferences('default', TEST_GAMEPLAY_CONFIG);
            
            // Should have general stat preferences
            const damagePref = preferences.find(p => p.rewardId === 'stat:damage');
            const attackSpeedPref = preferences.find(p => p.rewardId === 'stat:attack_speed');
            
            expect(damagePref).toBeDefined();
            expect(damagePref?.weight).toBe(15);
            expect(attackSpeedPref).toBeDefined();
            expect(attackSpeedPref?.weight).toBe(12);
        });
    });

    describe('calculateSelectionWeight', () => {
        it('should return high weight for preferred rewards', () => {
            const weight = BotRewardPreferences.calculateSelectionWeight('ability_stat:cooldown', 'hookshot', TEST_GAMEPLAY_CONFIG);
            expect(weight).toBe(20);
        });

        it('should return low weight for non-preferred rewards', () => {
            const weight = BotRewardPreferences.calculateSelectionWeight('stat:health', 'hookshot', TEST_GAMEPLAY_CONFIG);
            expect(weight).toBe(1);
        });

        it('should return default weight for unknown rewards', () => {
            const weight = BotRewardPreferences.calculateSelectionWeight('unknown:reward', 'hookshot', TEST_GAMEPLAY_CONFIG);
            expect(weight).toBe(1);
        });

        it('should give competitive weights to normal stats', () => {
            // Test that normal stats now have competitive weights compared to ability stats
            const hookshotDamageWeight = BotRewardPreferences.calculateSelectionWeight('stat:damage', 'hookshot', TEST_GAMEPLAY_CONFIG);
            const hookshotCooldownWeight = BotRewardPreferences.calculateSelectionWeight('ability_stat:cooldown', 'hookshot', TEST_GAMEPLAY_CONFIG);
            
            // Normal stats should have weight 1 (not in preferences), ability stats should have higher weight
            expect(hookshotDamageWeight).toBe(1); // Not in hookshot preferences
            expect(hookshotCooldownWeight).toBe(20); // Top priority for hookshot
            
            // Test mercenary where damage IS in preferences
            const mercenaryDamageWeight = BotRewardPreferences.calculateSelectionWeight('stat:damage', 'mercenary', TEST_GAMEPLAY_CONFIG);
            const mercenaryDurationWeight = BotRewardPreferences.calculateSelectionWeight('ability_stat:duration', 'mercenary', TEST_GAMEPLAY_CONFIG);
            
            expect(mercenaryDamageWeight).toBe(18); // High weight for normal stat
            expect(mercenaryDurationWeight).toBe(25); // Even higher weight for ability stat
        });
    });
});
