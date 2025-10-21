import { GameState } from '../../schema/GameState';
import { BotRewardPreferences } from './BotRewardPreferences';
import { GameplayConfig } from '../../config/ConfigProvider';

export class BotRewardSelector {
    /**
     * Select the best reward for a bot using two different systems:
     * 1. Team composition-aware ability selection (for new abilities)
     * 2. Preference-based selection (for stat upgrades)
     */
    static selectBestReward(bot: any, state: GameState, gameplayConfig: GameplayConfig): string {
        const availableRewards = Array.from(bot.rewardsForChoice) as string[];
        
        // If only one reward, just take it
        if (availableRewards.length === 1) {
            return availableRewards[0];
        }

        // === ABILITY REWARD SELECTION SYSTEM ===
        // Handles new ability choices (e.g., ability:hookshot) with team composition awareness
        const newAbilityRewards = availableRewards.filter((rewardId: string) => {
            // Check if the reward ID matches known ability patterns from GameConfig
            return rewardId.startsWith('ability:') && (
                rewardId === 'ability:hookshot' || 
                rewardId === 'ability:mercenary' || 
                rewardId === 'ability:pyromancer' || 
                rewardId === 'ability:thorndive' || 
                rewardId === 'ability:sniper'
            );
        });

        // If there are new ability rewards, use team composition filtering
        if (newAbilityRewards.length > 0) {
            const teamAbilityCounts = this.getTeamAbilityCounts(bot.team, state);
            
            // Filter out abilities that already have 2+ team members (avoid duplicates)
            // Special case: mercenary and hookshot are limited to 1 per team
            const allowedAbilityRewards = newAbilityRewards.filter((rewardId: string) => {
                const abilityType = this.extractAbilityTypeFromReward(rewardId);
                if (!abilityType) return false;
                const count = teamAbilityCounts[abilityType] || 0;
                // Mercenary and hookshot get special treatment - only 1 per team
                const maxCount = (abilityType === 'mercenary' || abilityType === 'hookshot') ? 1 : 2;
                return count < maxCount;
            });

            // Pick randomly from allowed abilities
            if (allowedAbilityRewards.length > 0) {
                const selectedAbility = allowedAbilityRewards[Math.floor(Math.random() * allowedAbilityRewards.length)];
                return selectedAbility;
            }
        }

        // === STAT REWARD SELECTION SYSTEM ===
        // Handles stat upgrades (e.g., stat:damage, ability_stat:cooldown) using bot preferences
        return this.selectStatRewardByPreference(bot, availableRewards, gameplayConfig);
    }
    
    /**
     * Select a stat reward based on bot preferences and weights
     * Handles stat upgrades (stat:damage) and ability stat upgrades (ability_stat:cooldown)
     */
    private static selectStatRewardByPreference(bot: any, availableRewards: string[], gameplayConfig: GameplayConfig): string {
        const abilityType = bot.ability?.type || 'default';
        
        // Calculate weights for each available reward
        const weights: { rewardId: string; weight: number }[] = [];
        
        for (const rewardId of availableRewards) {
            const weight = BotRewardPreferences.calculateSelectionWeight(rewardId, abilityType, gameplayConfig);
            weights.push({ rewardId, weight });
        }
        
        // Calculate total weight
        const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
        
        if (totalWeight === 0) {
            // Fallback to random selection if no weights
            return availableRewards[Math.floor(Math.random() * availableRewards.length)];
        }
        
        // Weighted random selection
        let random = Math.random() * totalWeight;
        
        for (const { rewardId, weight } of weights) {
            random -= weight;
            if (random <= 0) {
                return rewardId;
            }
        }
        
        // Fallback (should never reach here)
        return availableRewards[0];
    }

    /**
     * Get count of each ability type on the bot's team
     */
    private static getTeamAbilityCounts(team: string, state: GameState): Record<string, number> {
        const abilityCounts: Record<string, number> = {};
        
        // Count abilities for all heroes on the same team
        state.combatants.forEach((combatant: any) => {
            if (combatant.type === 'hero' && combatant.team === team && combatant.ability) {
                const abilityType = combatant.ability.type;
                abilityCounts[abilityType] = (abilityCounts[abilityType] || 0) + 1;
            }
        });
        
        return abilityCounts;
    }

    /**
     * Extract ability type from reward ID
     */
    private static extractAbilityTypeFromReward(rewardId: string): string | null {
        if (rewardId.startsWith('ability:')) {
            return rewardId.substring(8); // Remove 'ability:' prefix
        }
        return null;
    }
}
