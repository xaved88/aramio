import { Ability } from '../../../schema/GameState';

export interface AbilityDefinition<T extends Ability = Ability> {
    create(): T;
}
