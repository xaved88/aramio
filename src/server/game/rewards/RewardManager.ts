import { Hero } from '../../schema/Combatants';
import { GAMEPLAY_CONFIG } from '../../../Config';
import { StatModEffect } from '../../schema/Effects';
import { COMBATANT_EFFECT_TYPES } from '../../../shared/types/CombatantTypes';
import { AbilityFactory } from '../abilities/AbilityFactory';

export class RewardManager {
    /**
     * Generates 3 random rewards from a chest based on weights
     */
    static generateRewardsFromChest(chestType: string): string[] {
        const chest = GAMEPLAY_CONFIG.REWARDS.CHESTS[chestType as keyof typeof GAMEPLAY_CONFIG.REWARDS.CHESTS];
        if (!chest) {
            console.warn(`Unknown chest type: ${chestType}`);
            return [];
        }

        const rewards: string[] = [];
        const availableRewards = [...chest.rewards];

        // Select 3 rewards randomly based on weights
        for (let i = 0; i < 3 && availableRewards.length > 0; i++) {
            const totalWeight = availableRewards.reduce((sum, reward) => sum + reward.weight, 0);
            let random = Math.random() * totalWeight;
            
            let selectedIndex = 0;
            for (let j = 0; j < availableRewards.length; j++) {
                random -= availableRewards[j].weight;
                if (random <= 0) {
                    selectedIndex = j;
                    break;
                }
            }
            
            rewards.push(availableRewards[selectedIndex].id);
            availableRewards.splice(selectedIndex, 1); // Remove selected reward to avoid duplicates
        }

        return rewards;
    }

    /**
     * Applies a reward to a hero by creating a permanent stat modification effect
     */
    static applyReward(hero: Hero, rewardId: string, gameTime: number): boolean {
        const rewardType = GAMEPLAY_CONFIG.REWARDS.REWARD_TYPES[rewardId as keyof typeof GAMEPLAY_CONFIG.REWARDS.REWARD_TYPES];
        if (!rewardType) {
            console.warn(`Unknown reward type: ${rewardId}`);
            return false;
        }

        if (rewardType.type === 'stat') {
            // Apply all stats in the reward
            rewardType.stats.forEach((statConfig: any) => {
                const statEffect = new StatModEffect();
                statEffect.type = COMBATANT_EFFECT_TYPES.STATMOD;
                statEffect.stat = statConfig.stat;
                statEffect.operator = statConfig.modifier.type === 'flat' ? 'relative' : 'percent';
                statEffect.amount = statConfig.modifier.value;
                statEffect.duration = -1; // Permanent effect
                statEffect.appliedAt = gameTime;
                hero.effects.push(statEffect);
            });
            return true;
        } else if (rewardType.type === 'ability') {
            // Replace the hero's ability with a new one that has all the proper stats
            hero.ability = AbilityFactory.create(rewardType.abilityType);
            return true;
        }

        // This should never be reached since we handle all known reward types above
        return false;
    }

    /**
     * Determines which chest type to give based on player level
     */
    static getChestTypeForLevel(level: number): string {
        const levelChests = GAMEPLAY_CONFIG.REWARDS.LEVEL_CHESTS;
        return levelChests[level as keyof typeof levelChests] || 'common';
    }
}
