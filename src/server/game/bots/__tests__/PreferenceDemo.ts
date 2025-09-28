import { BotRewardPreferences } from '../BotRewardPreferences';
import { BotRewardSelector } from '../BotRewardSelector';
import { TEST_GAMEPLAY_CONFIG } from '../../../config/TestGameplayConfig';

/**
 * Demo script to show how the new bot reward preference system works
 */
export function demonstrateBotPreferences() {
    console.log('=== Bot Reward Preference System Demo ===\n');

    const abilities = ['hookshot', 'mercenary', 'pyromancer', 'thorndive', 'sniper', 'default'];
    
    for (const abilityType of abilities) {
        console.log(`--- ${abilityType.toUpperCase()} Ability Preferences ---`);
        
        const preferences = BotRewardPreferences.getPreferences(abilityType, TEST_GAMEPLAY_CONFIG);
        
        // Show top 5 preferences
        const topPreferences = preferences
            .sort((a, b) => b.weight - a.weight)
            .slice(0, 5);
        
        topPreferences.forEach((pref, index) => {
            console.log(`${index + 1}. ${pref.rewardId} (weight: ${pref.weight})`);
        });
        
        console.log();
    }

    console.log('--- Preference-Based Selection Demo ---');
    
    // Demo selection for different abilities
    const mockState = {
        combatants: new Map(),
        projectiles: new Map(),
        attackEvents: [],
        xpEvents: [],
        levelUpEvents: [],
        damageEvents: [],
        killEvents: [],
        aoeDamageEvents: [],
        warriorSpawnTimes: new Map(),
        archerSpawned: new Map()
    } as any;

    const availableRewards = [
        'ability_stat:range',
        'ability_stat:strength', 
        'ability_stat:cooldown',
        'ability_stat:duration',
        'stat:health',
        'stat:damage',
        'stat:attack_speed'
    ];

    for (const abilityType of ['hookshot', 'mercenary', 'pyromancer']) {
        console.log(`\n${abilityType.toUpperCase()} bot selecting from: ${availableRewards.join(', ')}`);
        
        const mockBot = {
            id: `${abilityType}-bot`,
            team: 'blue',
            ability: { type: abilityType },
            rewardsForChoice: availableRewards
        };

        // Show 10 selections to demonstrate preference patterns
        const selections: string[] = [];
        for (let i = 0; i < 10; i++) {
            const selected = BotRewardSelector.selectBestReward(mockBot, mockState, TEST_GAMEPLAY_CONFIG);
            selections.push(selected);
        }

        // Count selections
        const selectionCounts: Record<string, number> = {};
        selections.forEach(selection => {
            selectionCounts[selection] = (selectionCounts[selection] || 0) + 1;
        });

        // Show results
        Object.entries(selectionCounts)
            .sort(([,a], [,b]) => b - a)
            .forEach(([reward, count]) => {
                console.log(`  ${reward}: ${count} times`);
            });
    }
}

// Run demo if this file is executed directly
if (require.main === module) {
    demonstrateBotPreferences();
}
