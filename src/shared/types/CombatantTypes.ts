export const COMBATANT_TYPES = {
    HERO: 'hero',
    CRADLE: 'cradle',
    TURRET: 'turret',
    MINION: 'minion'
} as const;

export type CombatantType = typeof COMBATANT_TYPES[keyof typeof COMBATANT_TYPES];

export const MINION_TYPES = {
    WARRIOR: 'warrior',
    ARCHER: 'archer'
} as const;

export type MinionType = typeof MINION_TYPES[keyof typeof MINION_TYPES];

export interface Ability {
    type: string;
    cooldown: number;
    lastUsedTime: number;
    strength: number;
}

export interface BaseCombatant {
    id: string;
    type: CombatantType;
    x: number;
    y: number;
    team: string;
    health: number;
    maxHealth: number;
    attackRadius: number;
    attackStrength: number;
    attackSpeed: number;
    lastAttackTime: number;
    target?: string; // ID of the combatant being targeted
    windUp: number; // Time in seconds before attack can be performed
    attackReadyAt: number; // Timestamp when wind-up period ends and attack can be performed
}

export interface HeroCombatant extends BaseCombatant {
    type: typeof COMBATANT_TYPES.HERO;
    state: 'alive' | 'respawning';
    respawnTime: number;
    respawnDuration: number;
    experience: number;
    level: number;
    totalExperience: number; // total XP earned throughout the match
    ability: Ability;
    controller: string; // client ID for players, bot strategy for bots
}

export interface CradleCombatant extends BaseCombatant {
    type: typeof COMBATANT_TYPES.CRADLE;
}

export interface TurretCombatant extends BaseCombatant {
    type: typeof COMBATANT_TYPES.TURRET;
}

export interface MinionCombatant extends BaseCombatant {
    type: typeof COMBATANT_TYPES.MINION;
    minionType: MinionType;
}

export type Combatant = HeroCombatant | CradleCombatant | TurretCombatant | MinionCombatant;

export interface AttackEvent {
    sourceId: string;
    targetId: string;
    timestamp: number;
}

export interface DamageEvent {
    sourceId: string;
    targetId: string;
    targetType: string;
    amount: number;
    timestamp: number;
}

export interface KillEvent {
    sourceId: string;
    targetId: string;
    targetType: string;
    timestamp: number;
}

export interface Projectile {
    id: string;
    ownerId: string;
    x: number;
    y: number;
    directionX: number;
    directionY: number;
    speed: number;
    strength: number;
    team: string;
}

export function isHeroCombatant(combatant: Combatant): combatant is HeroCombatant {
    return combatant.type === COMBATANT_TYPES.HERO;
}

export function isCradleCombatant(combatant: Combatant): combatant is CradleCombatant {
    return combatant.type === COMBATANT_TYPES.CRADLE;
}

export function isTurretCombatant(combatant: Combatant): combatant is TurretCombatant {
    return combatant.type === COMBATANT_TYPES.TURRET;
}

export function isMinionCombatant(combatant: Combatant): combatant is MinionCombatant {
    return combatant.type === COMBATANT_TYPES.MINION;
} 
