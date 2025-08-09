import { Ability, DefaultAbility, HookshotAbility, MercenaryAbility } from '../../schema/Abilities';
import { DefaultAbilityDefinition } from './definitions/DefaultAbilityDefinition';
import { HookshotAbilityDefinition } from './definitions/HookshotAbilityDefinition';
import { MercenaryAbilityDefinition } from './definitions/MercenaryAbilityDefinition';

export class AbilityLevelUpManager {
    static levelUpAbility(ability: Ability): void {
        switch (ability.type) {
            case 'default':
                DefaultAbilityDefinition.instance.onLevelUp(ability as DefaultAbility);
                break;
            case 'hookshot':
                HookshotAbilityDefinition.instance.onLevelUp(ability as HookshotAbility);
                break;
            case 'mercenary':
                MercenaryAbilityDefinition.instance.onLevelUp(ability as MercenaryAbility);
                break;
            default:
                // No level-up logic for unknown ability types
                break;
        }
    }
}
