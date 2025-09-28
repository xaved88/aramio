import { GameState } from '../../schema/GameState';

export class BotRewardSelector {
    /**
     * Select the best reward for a bot, avoiding ability duplicates when 2+ team members have the same ability
     */
    static selectBestReward(bot: any, state: GameState): string {
        const availableRewards = Array.from(bot.rewardsForChoice) as string[];
        
        // If only one reward, just take it
        if (availableRewards.length === 1) {
            return availableRewards[0];
        }

        // Check for ability rewards and count team members with each ability
        const abilityRewards = availableRewards.filter((rewardId: string) => {
            // Check if the reward ID matches known ability patterns from GameConfig
            return rewardId.startsWith('ability:') && (
                rewardId === 'ability:hookshot' || 
                rewardId === 'ability:mercenary' || 
                rewardId === 'ability:pyromancer' || 
                rewardId === 'ability:thorndive' || 
                rewardId === 'ability:sniper'
            );
        });

        // If there are ability rewards, check team composition
        if (abilityRewards.length > 0) {
            const teamAbilityCounts = this.getTeamAbilityCounts(bot.team, state);
            
            // Find ability rewards that don't have 2+ team members already
            const preferredAbilityRewards = abilityRewards.filter((rewardId: string) => {
                const abilityType = this.extractAbilityTypeFromReward(rewardId);
                return abilityType && teamAbilityCounts[abilityType] < 2;
            });

            // If we have preferred ability rewards, pick one randomly
            if (preferredAbilityRewards.length > 0) {
                return preferredAbilityRewards[Math.floor(Math.random() * preferredAbilityRewards.length)];
            }
        }

        // Fallback to random selection from all available rewards
        return availableRewards[Math.floor(Math.random() * availableRewards.length)];
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
