import { Ability } from '../../../schema/Abilities';
import { GameplayConfig } from '../../../config/ConfigProvider';

export interface AbilityDefinition<T extends Ability = Ability> {
    create(gameplayConfig: GameplayConfig): T;
    onLevelUp(ability: T, gameplayConfig: GameplayConfig): void;
    useAbility(ability: T, heroId: string, x: number, y: number, state: any, gameplayConfig: GameplayConfig): boolean;
}
