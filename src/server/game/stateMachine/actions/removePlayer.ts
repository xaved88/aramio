import { GameState, Hero } from '../../../schema/GameState';
import { RemovePlayerAction, StateMachineResult } from '../types';
import { COMBATANT_TYPES, CombatantId } from '../../../../shared/types/CombatantTypes';

export function handleRemovePlayer(state: GameState, action: RemovePlayerAction): StateMachineResult {
    // Find and remove hero by controller (client ID)
    let heroIdToRemove: CombatantId | undefined;
    state.combatants.forEach((combatant, id) => {
        if (combatant.type === COMBATANT_TYPES.HERO && (combatant as Hero).controller === action.payload.playerId) {
            heroIdToRemove = id;
        }
    });
    
    if (heroIdToRemove) {
        state.combatants.delete(heroIdToRemove);
    }
    
    return { newState: state };
} 
