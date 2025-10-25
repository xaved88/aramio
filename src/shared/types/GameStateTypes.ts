import { Combatant, AttackEvent, DamageEvent, KillEvent, Projectile, CombatantId, ProjectileId } from './CombatantTypes';
import { Obstacle, ObstacleId } from './ObstacleTypes';

export interface XPEvent {
    playerId: CombatantId;
    amount: number;
    x: number;
    y: number;
    timestamp: number;
    type?: string; // Type of XP event (e.g., 'minionKill', 'heroKill')
    targetName?: string; // Display name of the killed unit (for hero kills)
    targetIsBot?: boolean; // Whether the killed unit is a bot (for hero kills)
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

export interface DeathEffectEvent {
    targetId: CombatantId;
    targetType: string;
    x: number;
    y: number;
    team: string;
    timestamp: number;
}

export interface ProjectileMissEvent {
    projectileId: string;
    x: number;
    y: number;
    team: string;
    ownerId: string;
    timestamp: number;
}

export interface KillStreakEvent {
    heroId: string;
    heroName: string;
    team: string;
    killStreak: number;
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
    zones: Map<string, any>; // Zones for area effects
    obstacles: Map<ObstacleId, Obstacle>;
    aoeDamageEvents: AOEDamageEvent[];
    deathEffectEvents: DeathEffectEvent[];
    projectileMissEvents: ProjectileMissEvent[];
    killStreakEvents: KillStreakEvent[];
    blueSuperMinionsTriggered: boolean;
    redSuperMinionsTriggered: boolean;
} 
