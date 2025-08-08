import { Ability } from '../../schema/GameState';
import { DefaultAbilityDefinition } from './definitions/DefaultAbilityDefinition';
import { HookshotAbilityDefinition } from './definitions/HookshotAbilityDefinition';

export class AbilityFactory {
    static create(abilityType: string): Ability {
        switch (abilityType) {
            case 'default':
                return DefaultAbilityDefinition.instance.create();
            case 'hookshot':
                return HookshotAbilityDefinition.instance.create();
            default:
                throw new Error(`Unsupported ability type: ${abilityType}`);
        }
    }
}
