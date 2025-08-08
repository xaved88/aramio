import { Ability } from '../../schema/GameState';
import { DefaultAbility } from '../../schema/GameState';
import { DefaultAbilityDefinition } from './definitions/DefaultAbilityDefinition';

export class AbilityUseManager {
    static useAbility(ability: Ability, heroId: string, x: number, y: number, state: any): boolean {
        switch (ability.type) {
            case 'default':
                return DefaultAbilityDefinition.instance.useAbility(ability as DefaultAbility, heroId, x, y, state);
            default:
                return false;
        }
    }
}
