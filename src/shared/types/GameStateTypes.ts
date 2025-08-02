import { Combatant, AttackEvent, Projectile } from './CombatantTypes';

export interface SharedGameState {
    gameTime: number;
    gamePhase: string;
    currentWave: number;
    winningTeam: string;
    gameEndTime: number;
    combatants: Map<string, Combatant>;
    attackEvents: AttackEvent[];
    projectiles: Map<string, Projectile>;
} 