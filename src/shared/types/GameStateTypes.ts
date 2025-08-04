import { Combatant, AttackEvent, Projectile, HeroStats } from './CombatantTypes';

export interface XPEvent {
    playerId: string;
    amount: number;
    x: number;
    y: number;
    timestamp: number;
}

export interface LevelUpEvent {
    playerId: string;
    newLevel: number;
    x: number;
    y: number;
    timestamp: number;
}

export interface SharedGameState {
    gameTime: number;
    gamePhase: string;
    currentWave: number;
    winningTeam: string;
    gameEndTime: number;
    combatants: Map<string, Combatant>;
    heroStats: Map<string, HeroStats>;
    attackEvents: AttackEvent[];
    xpEvents: XPEvent[];
    levelUpEvents: LevelUpEvent[];
    projectiles: Map<string, Projectile>;
} 
