import { AbilityType } from '../../shared/types/CombatantTypes';

export class AbilityIconManager {
    static getAbilityIcon(abilityType: AbilityType): string {
        switch (abilityType) {
            case 'default':
                return '*';
            default:
                return '?';
        }
    }
}
