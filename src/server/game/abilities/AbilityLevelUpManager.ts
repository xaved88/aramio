import { Ability, DefaultAbility, HookshotAbility, MercenaryAbility, PyromancerAbility, ThorndiveAbility } from '../../schema/Abilities';
import { DefaultAbilityDefinition } from './definitions/DefaultAbilityDefinition';
import { HookshotAbilityDefinition } from './definitions/HookshotAbilityDefinition';
import { MercenaryAbilityDefinition } from './definitions/MercenaryAbilityDefinition';
import { PyromancerAbilityDefinition } from './definitions/PyromancerAbilityDefinition';
import { ThorndiveAbilityDefinition } from './definitions/ThorndiveAbilityDefinition';
import { GameplayConfig } from '../../config/ConfigProvider';

export class AbilityLevelUpManager {
    private gameplayConfig: GameplayConfig;

    constructor(gameplayConfig: GameplayConfig) {
        this.gameplayConfig = gameplayConfig;
    }

    levelUpAbility(ability: Ability): void {
        switch (ability.type) {
            case 'default':
                DefaultAbilityDefinition.instance.onLevelUp(ability as DefaultAbility, this.gameplayConfig);
                break;
            case 'hookshot':
                HookshotAbilityDefinition.instance.onLevelUp(ability as HookshotAbility, this.gameplayConfig);
                break;
            case 'mercenary':
                MercenaryAbilityDefinition.instance.onLevelUp(ability as MercenaryAbility, this.gameplayConfig);
                break;
            case 'pyromancer':
                PyromancerAbilityDefinition.instance.onLevelUp(ability as PyromancerAbility, this.gameplayConfig);
                break;
            case 'thorndive':
                ThorndiveAbilityDefinition.instance.onLevelUp(ability as ThorndiveAbility, this.gameplayConfig);
                break;
            default:
                // No level-up logic for unknown ability types
                break;
        }
    }
}
