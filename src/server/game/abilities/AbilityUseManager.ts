import { Ability, DefaultAbility, HookshotAbility } from '../../schema/Abilities';
import { DefaultAbilityDefinition } from './definitions/DefaultAbilityDefinition';
import { HookshotAbilityDefinition } from './definitions/HookshotAbilityDefinition';

export class AbilityUseManager {
    static useAbility(ability: Ability, heroId: string, x: number, y: number, state: any): boolean {
        switch (ability.type) {
            case 'default':
                return DefaultAbilityDefinition.instance.useAbility(ability as DefaultAbility, heroId, x, y, state);
            case 'hookshot':
                return HookshotAbilityDefinition.instance.useAbility(ability as HookshotAbility, heroId, x, y, state);
            default:
                return false;
        }
    }
}
