import { Combatant, AttackEvent } from './CombatantTypes';

export interface SharedGameState {
    gameTime: number;
    gamePhase: string;
    currentWave: number;
    winningTeam: string;
    gameEndTime: number;
    combatants: Map<string, Combatant>;
    attackEvents: AttackEvent[];
} 