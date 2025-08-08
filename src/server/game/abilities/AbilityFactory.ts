import { Ability, DefaultAbility } from '../../schema/GameState';
import { GAMEPLAY_CONFIG } from '../../../Config';

export class AbilityFactory {
    static create(abilityType: string): Ability {
        // Get the configuration for this ability type
        const config = GAMEPLAY_CONFIG.COMBAT.ABILITIES[abilityType as keyof typeof GAMEPLAY_CONFIG.COMBAT.ABILITIES];
        
        if (!config) {
            throw new Error(`Unknown ability type: ${abilityType}`);
        }

        switch (abilityType) {
            case 'default':
                return this.createDefaultAbility(config);
            default:
                throw new Error(`Unsupported ability type: ${abilityType}`);
        }
    }

    private static createDefaultAbility(config: any): DefaultAbility {
        const ability = new DefaultAbility();
        
        // Set the configured values - cooldown_MS is standard across all ability types
        ability.cooldown = config.COOLDOWN_MS;
        ability.lastUsedTime = 0;
        ability.strength = config.STRENGTH;
        
        return ability;
    }
}
