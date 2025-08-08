import { Ability } from '../../../schema/GameState';

export interface AbilityDefinition<T extends Ability = Ability> {
    create(): T;
    onLevelUp(ability: T): void;
    useAbility(ability: T, heroId: string, x: number, y: number, state: any): void;
}
