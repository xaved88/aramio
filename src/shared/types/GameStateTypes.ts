import { Combatant, AttackEvent } from './CombatantTypes';

export interface SharedGameState {
    gameTime: number;
    gamePhase: string;
    combatants: Map<string, Combatant>;
    attackEvents: AttackEvent[];
} 