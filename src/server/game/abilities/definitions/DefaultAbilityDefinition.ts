import { DefaultAbility } from '../../../schema/GameState';
import { AbilityDefinition } from './AbilityDefinition';
import { GAMEPLAY_CONFIG } from '../../../../Config';

export class DefaultAbilityDefinition implements AbilityDefinition<DefaultAbility> {
    create(): DefaultAbility {
        const ability = new DefaultAbility();
        
        const config = GAMEPLAY_CONFIG.COMBAT.ABILITIES.default;
        
        ability.cooldown = config.COOLDOWN_MS;
        ability.lastUsedTime = 0;
        ability.strength = config.STRENGTH;
        
        return ability;
    }

    private static _instance: DefaultAbilityDefinition | null = null;

    static get instance(): DefaultAbilityDefinition {
        if (!DefaultAbilityDefinition._instance) {
            DefaultAbilityDefinition._instance = new DefaultAbilityDefinition();
        }
        return DefaultAbilityDefinition._instance;
    }
}
