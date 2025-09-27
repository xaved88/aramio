import { Hero } from '../../schema/Combatants';
import { StatModEffect } from '../../schema/Effects';
import { COMBATANT_EFFECT_TYPES } from '../../../shared/types/CombatantTypes';
import { AbilityFactory } from '../abilities/AbilityFactory';
import { GameplayConfig } from '../../config/ConfigProvider';

export class RewardManager {
    /**
     * Generates 3 random rewards from a chest based on weights
     * Filters out invalid ability stat rewards for the given hero
     */
    static generateRewardsFromChest(chestType: string, gameplayConfig: GameplayConfig, hero?: any): string[] {
        const chest = gameplayConfig.REWARDS.CHESTS[chestType as keyof typeof gameplayConfig.REWARDS.CHESTS];
        if (!chest) {
            console.warn(`Unknown chest type: ${chestType}`);
            return [];
        }

        const rewards: string[] = [];
        let availableRewards = [...chest.rewards];

        // Filter out invalid rewards for this hero's ability
        if (hero && hero.ability) {
            availableRewards = availableRewards.filter(reward => {
                const rewardType = gameplayConfig.REWARDS.REWARD_TYPES[reward.id as keyof typeof gameplayConfig.REWARDS.REWARD_TYPES];
                if (rewardType?.type === 'ability_stat') {
                    // Check if the hero's ability supports this stat
                    return rewardType.ability_stat in hero.ability;
                } else if (rewardType?.type === 'stat') {
                    // Filter out attack range for mercenary (melee-focused)
                    if (hero.ability.type === 'mercenary' && reward.id === 'stat:attack_range') {
                        return false;
                    }
                }
                return true; // Keep other rewards
            });
        }

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
    static applyReward(hero: Hero, rewardId: string, gameTime: number, gameplayConfig: GameplayConfig): boolean {
        const rewardType = gameplayConfig.REWARDS.REWARD_TYPES[rewardId as keyof typeof gameplayConfig.REWARDS.REWARD_TYPES];
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
                hero.permanentEffects.push(statEffect);
            });
            return true;
        } else if (rewardType.type === 'ability') {
            // Replace the hero's ability with a new one that has all the proper stats
            const abilityFactory = new AbilityFactory(gameplayConfig);
            hero.ability = abilityFactory.create(rewardType.abilityType);
            return true;
        } else if (rewardType.type === 'ability_stat') {
            // Apply stat modification directly to the hero's current ability
            const statName = rewardType.ability_stat as keyof typeof hero.ability;
            if (statName in hero.ability && typeof (hero.ability as any)[statName] === 'number') {
                const currentValue = (hero.ability as any)[statName] as number;
                if (rewardType.modifier.type === 'percent') {
                    (hero.ability as any)[statName] = Math.round(currentValue * rewardType.modifier.value);
                } else if (rewardType.modifier.type === 'flat') {
                    (hero.ability as any)[statName] = currentValue + rewardType.modifier.value;
                }
                return true;
            }
            return false;
        }

        // This should never be reached since we handle all known reward types above
        return false;
    }

    /**
     * Determines which chest type to give based on player level
     */
    static getChestTypeForLevel(level: number, gameplayConfig: GameplayConfig): string {
        const levelChests = gameplayConfig.REWARDS.LEVEL_CHESTS;
        return levelChests[level as keyof typeof levelChests] || 'common';
    }
}
