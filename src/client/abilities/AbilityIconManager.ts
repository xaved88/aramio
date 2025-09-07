import { AbilityType } from '../../shared/types/CombatantTypes';

export class AbilityIconManager {
    static getAbilityIcon(abilityType: AbilityType): string {
        switch (abilityType) {
            case 'default':
                return '·';
            case 'hookshot':
                return '?';
            case 'mercenary':
                return '/';
            case 'pyromancer':
                return 'O';
            case 'thorndive':
                return '#';
            case 'sniper':
                return '*';
            default:
                return '-';
        }
    }
}
