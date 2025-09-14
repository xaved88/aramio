import { Ability, DefaultAbility, HookshotAbility, MercenaryAbility, PyromancerAbility, ThorndiveAbility, SniperAbility } from '../../schema/Abilities';
import { DefaultAbilityDefinition } from './definitions/DefaultAbilityDefinition';
import { HookshotAbilityDefinition } from './definitions/HookshotAbilityDefinition';
import { MercenaryAbilityDefinition } from './definitions/MercenaryAbilityDefinition';
import { PyromancerAbilityDefinition } from './definitions/PyromancerAbilityDefinition';
import { ThorndiveAbilityDefinition } from './definitions/ThorndiveAbilityDefinition';
import { SniperAbilityDefinition } from './definitions/SniperAbilityDefinition';
import { GameplayConfig } from '../../config/ConfigProvider';

export class AbilityUseManager {
    private gameplayConfig: GameplayConfig;

    constructor(gameplayConfig: GameplayConfig) {
        this.gameplayConfig = gameplayConfig;
    }

    useAbility(ability: Ability, heroId: string, x: number, y: number, state: any): boolean {
        switch (ability.type) {
            case 'default':
                return DefaultAbilityDefinition.instance.useAbility(ability as DefaultAbility, heroId, x, y, state, this.gameplayConfig);
            case 'hookshot':
                return HookshotAbilityDefinition.instance.useAbility(ability as HookshotAbility, heroId, x, y, state, this.gameplayConfig);
            case 'mercenary':
                return MercenaryAbilityDefinition.instance.useAbility(ability as MercenaryAbility, heroId, x, y, state, this.gameplayConfig);
            case 'pyromancer':
                return PyromancerAbilityDefinition.instance.useAbility(ability as PyromancerAbility, heroId, x, y, state, this.gameplayConfig);
            case 'thorndive':
                return ThorndiveAbilityDefinition.instance.useAbility(ability as ThorndiveAbility, heroId, x, y, state, this.gameplayConfig);
            case 'sniper':
                return SniperAbilityDefinition.instance.useAbility(ability as SniperAbility, heroId, x, y, state, this.gameplayConfig);
            default:
                return false;
        }
    }
}
