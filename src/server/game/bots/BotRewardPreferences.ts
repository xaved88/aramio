import { GameplayConfig } from '../../config/ConfigProvider';

export interface RewardPreference {
    rewardId: string;
    weight: number; // Higher weight = more preferred
}

export class BotRewardPreferences {
    /**
     * Get reward preferences for a bot based on their current ability
     */
    static getPreferences(abilityType: string, gameplayConfig: GameplayConfig): RewardPreference[] {
        const preferences: RewardPreference[] = [];
        
        // Get all available rewards from config
        const allRewards = this.getAllAvailableRewards(gameplayConfig);
        
        // Add ability-specific preferences only
        const abilityPreferences = this.getAbilitySpecificPreferences(abilityType, allRewards);
        preferences.push(...abilityPreferences);
        
        return preferences;
    }
    
    /**
     * Get ability-specific reward preferences
     */
    private static getAbilitySpecificPreferences(abilityType: string, allRewards: string[]): RewardPreference[] {
        const preferences: RewardPreference[] = [];
        
        switch (abilityType) {
            case 'hookshot':
                // Hookshot prefers range, cooldown, and duration for better positioning, uptime, and stun duration
                preferences.push(
                    { rewardId: 'ability_stat:cooldown', weight: 20 },
                    { rewardId: 'ability_stat:duration', weight: 15 },
                    { rewardId: 'stat:attack_range', weight: 18 },
                    { rewardId: 'ability_stat:range', weight: 10 },
                    { rewardId: 'stat:move_speed', weight: 12 }
                );
                break;
                
            case 'mercenary':
                // Mercenary prefers duration and rage speed for better engage/disengage
                preferences.push(
                    { rewardId: 'ability_stat:duration', weight: 25 },
                    { rewardId: 'stat:damage', weight: 18 },
                    { rewardId: 'ability_stat:mercenary_rage_speed', weight: 15 },
                    { rewardId: 'ability_stat:cooldown', weight: 15 },
                    { rewardId: 'stat:attack_speed', weight: 12 },
                    { rewardId: 'stat:health', weight: 10 },
                    { rewardId: 'stat:move_speed', weight: 8 }
                );
                break;
                
            case 'pyromancer':
                // Pyromancer prefers radius and strength for better AOE damage
                preferences.push(
                    { rewardId: 'ability_stat:pyromancer_radius', weight: 25 },
                    { rewardId: 'ability_stat:strength', weight: 20 },
                    { rewardId: 'stat:attack_range', weight: 18 },
                    { rewardId: 'ability_stat:range', weight: 15 },
                    { rewardId: 'ability_stat:cooldown', weight: 15 },
                    { rewardId: 'stat:damage', weight: 12 },
                    { rewardId: 'stat:attack_speed', weight: 10 }
                );
                break;
                
            case 'thorndive':
                // Thorndive prefers cooldown and range for better engage frequency and distance
                preferences.push(
                    { rewardId: 'ability_stat:duration', weight: 30 },
                    { rewardId: 'ability_stat:cooldown', weight: 25 },
                    { rewardId: 'ability_stat:range', weight: 20 },
                    { rewardId: 'stat:health', weight: 18 },
                    { rewardId: 'stat:bullet_armor', weight: 15 },
                    { rewardId: 'stat:ability_armor', weight: 10 }
                );
                break;
                
            case 'sniper':
                // Sniper prefers range and strength for better positioning and damage
                preferences.push(
                    { rewardId: 'ability_stat:strength', weight: 20 },
                    { rewardId: 'stat:damage', weight: 18 },
                    { rewardId: 'ability_stat:cooldown', weight: 15 },
                    { rewardId: 'stat:attack_speed', weight: 12 },
                    { rewardId: 'ability_stat:range', weight: 10 },
                    { rewardId: 'stat:attack_range', weight: 10 }
                );
                break;
                
            case 'default':
            default:
                // Default ability prefers general combat stats
                preferences.push(
                    { rewardId: 'stat:attack_range', weight: 20 },
                    { rewardId: 'stat:damage', weight: 15 },
                    { rewardId: 'stat:attack_speed', weight: 12 },
                    { rewardId: 'stat:health', weight: 8 },
                    { rewardId: 'stat:move_speed', weight: 4 }
                );
                break;
        }
        
        // Filter to only include rewards that are actually available
        return preferences.filter(pref => allRewards.includes(pref.rewardId));
    }
    
    /**
     * Get all available rewards from the gameplay config
     */
    private static getAllAvailableRewards(gameplayConfig: GameplayConfig): string[] {
        const rewards: string[] = [];
        
        // Add all stat rewards
        const statRewards = Object.keys(gameplayConfig.REWARDS.REWARD_TYPES)
            .filter(key => gameplayConfig.REWARDS.REWARD_TYPES[key as keyof typeof gameplayConfig.REWARDS.REWARD_TYPES].type === 'stat');
        rewards.push(...statRewards);
        
        // Add all ability stat rewards
        const abilityStatRewards = Object.keys(gameplayConfig.REWARDS.REWARD_TYPES)
            .filter(key => gameplayConfig.REWARDS.REWARD_TYPES[key as keyof typeof gameplayConfig.REWARDS.REWARD_TYPES].type === 'ability_stat');
        rewards.push(...abilityStatRewards);
        
        return rewards;
    }
    
    /**
     * Calculate weighted selection probability for a reward
     */
    static calculateSelectionWeight(rewardId: string, abilityType: string, gameplayConfig: GameplayConfig): number {
        const preferences = this.getPreferences(abilityType, gameplayConfig);
        const preference = preferences.find(p => p.rewardId === rewardId);
        return preference ? preference.weight : 1; // Default weight of 1 for unpreferred rewards
    }
}
