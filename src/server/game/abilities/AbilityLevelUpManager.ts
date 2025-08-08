import { Ability } from '../../schema/GameState';
import { DefaultAbility } from '../../schema/GameState';
import { DefaultAbilityDefinition } from './definitions/DefaultAbilityDefinition';
import { AbilityType } from '../../../shared/types/CombatantTypes';

export class AbilityLevelUpManager {
    static levelUpAbility(ability: Ability): void {
        switch (ability.type) {
            case 'default':
                DefaultAbilityDefinition.instance.onLevelUp(ability as DefaultAbility);
                break;
            default:
                // No level-up logic for unknown ability types
                break;
        }
    }
}
