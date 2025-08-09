import { Ability } from '../../schema/Abilities';
import { DefaultAbilityDefinition } from './definitions/DefaultAbilityDefinition';
import { HookshotAbilityDefinition } from './definitions/HookshotAbilityDefinition';
import { MercenaryAbilityDefinition } from './definitions/MercenaryAbilityDefinition';
import { PyromancerAbilityDefinition } from './definitions/PyromancerAbilityDefinition';
import { ThorndiveAbilityDefinition } from './definitions/ThorndiveAbilityDefinition';

export class AbilityFactory {
    static create(abilityType: string): Ability {
        switch (abilityType) {
            case 'default':
                return DefaultAbilityDefinition.instance.create();
            case 'hookshot':
                return HookshotAbilityDefinition.instance.create();
            case 'mercenary':
                return MercenaryAbilityDefinition.instance.create();
            case 'pyromancer':
                return PyromancerAbilityDefinition.instance.create();
            case 'thorndive':
                return ThorndiveAbilityDefinition.instance.create();
            default:
                throw new Error(`Unsupported ability type: ${abilityType}`);
        }
    }
}
