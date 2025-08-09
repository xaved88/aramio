import { Ability, DefaultAbility, HookshotAbility, MercenaryAbility, PyromancerAbility, ThorndiveAbility } from '../../schema/Abilities';
import { DefaultAbilityDefinition } from './definitions/DefaultAbilityDefinition';
import { HookshotAbilityDefinition } from './definitions/HookshotAbilityDefinition';
import { MercenaryAbilityDefinition } from './definitions/MercenaryAbilityDefinition';
import { PyromancerAbilityDefinition } from './definitions/PyromancerAbilityDefinition';
import { ThorndiveAbilityDefinition } from './definitions/ThorndiveAbilityDefinition';

export class AbilityUseManager {
    static useAbility(ability: Ability, heroId: string, x: number, y: number, state: any): boolean {
        switch (ability.type) {
            case 'default':
                return DefaultAbilityDefinition.instance.useAbility(ability as DefaultAbility, heroId, x, y, state);
            case 'hookshot':
                return HookshotAbilityDefinition.instance.useAbility(ability as HookshotAbility, heroId, x, y, state);
            case 'mercenary':
                return MercenaryAbilityDefinition.instance.useAbility(ability as MercenaryAbility, heroId, x, y, state);
            case 'pyromancer':
                return PyromancerAbilityDefinition.instance.useAbility(ability as PyromancerAbility, heroId, x, y, state);
            case 'thorndive':
                return ThorndiveAbilityDefinition.instance.useAbility(ability as ThorndiveAbility, heroId, x, y, state);
            default:
                return false;
        }
    }
}
