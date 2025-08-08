import { Ability } from '../../schema/GameState';
import { DefaultAbilityDefinition } from './definitions/DefaultAbilityDefinition';

export class AbilityFactory {
    static create(abilityType: string): Ability {
        switch (abilityType) {
            case 'default':
                return DefaultAbilityDefinition.instance.create();
            default:
                throw new Error(`Unsupported ability type: ${abilityType}`);
        }
    }
}
