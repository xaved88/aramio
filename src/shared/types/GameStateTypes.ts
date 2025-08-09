import { Combatant, AttackEvent, DamageEvent, KillEvent, Projectile, CombatantId, ProjectileId } from './CombatantTypes';

export interface XPEvent {
    playerId: CombatantId;
    amount: number;
    x: number;
    y: number;
    timestamp: number;
    type?: string; // Type of XP event (e.g., 'minionKill', 'heroKill')
}

export interface LevelUpEvent {
    playerId: CombatantId;
    newLevel: number;
    x: number;
    y: number;
    timestamp: number;
}

export interface AOEDamageEvent {
    sourceId: CombatantId;
    x: number;
    y: number;
    radius: number;
    timestamp: number;
}

export interface SharedGameState {
    gameTime: number;
    gamePhase: string;
    currentWave: number;
    winningTeam: string;
    gameEndTime: number;
    combatants: Map<CombatantId, Combatant>;
    attackEvents: AttackEvent[];
    xpEvents: XPEvent[];
    levelUpEvents: LevelUpEvent[];
    damageEvents: DamageEvent[];
    killEvents: KillEvent[];
    projectiles: Map<ProjectileId, Projectile>;
    aoeDamageEvents: AOEDamageEvent[];
} 
