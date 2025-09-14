import { Ability } from '../../schema/Abilities';
import { DefaultAbilityDefinition } from './definitions/DefaultAbilityDefinition';
import { HookshotAbilityDefinition } from './definitions/HookshotAbilityDefinition';
import { MercenaryAbilityDefinition } from './definitions/MercenaryAbilityDefinition';
import { PyromancerAbilityDefinition } from './definitions/PyromancerAbilityDefinition';
import { ThorndiveAbilityDefinition } from './definitions/ThorndiveAbilityDefinition';
import { SniperAbilityDefinition } from './definitions/SniperAbilityDefinition';
import { GameplayConfig } from '../../config/ConfigProvider';

export class AbilityFactory {
    private gameplayConfig: GameplayConfig;

    constructor(gameplayConfig: GameplayConfig) {
        this.gameplayConfig = gameplayConfig;
    }

    create(abilityType: string): Ability {
        switch (abilityType) {
            case 'default':
                return DefaultAbilityDefinition.instance.create(this.gameplayConfig);
            case 'hookshot':
                return HookshotAbilityDefinition.instance.create(this.gameplayConfig);
            case 'mercenary':
                return MercenaryAbilityDefinition.instance.create(this.gameplayConfig);
            case 'pyromancer':
                return PyromancerAbilityDefinition.instance.create(this.gameplayConfig);
            case 'thorndive':
                return ThorndiveAbilityDefinition.instance.create(this.gameplayConfig);
            case 'sniper':
                return SniperAbilityDefinition.instance.create(this.gameplayConfig);
            default:
                throw new Error(`Unsupported ability type: ${abilityType}`);
        }
    }
}
