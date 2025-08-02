export const COMBATANT_TYPES = {
    PLAYER: 'player',
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
}

export interface PlayerCombatant extends BaseCombatant {
    type: typeof COMBATANT_TYPES.PLAYER;
    state: 'alive' | 'respawning';
    respawnTime: number;
    respawnDuration: number;
    experience: number;
    level: number;
    ability: Ability;
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

export type Combatant = PlayerCombatant | CradleCombatant | TurretCombatant | MinionCombatant;

export interface AttackEvent {
    sourceId: string;
    targetId: string;
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

export function isPlayerCombatant(combatant: Combatant): combatant is PlayerCombatant {
    return combatant.type === COMBATANT_TYPES.PLAYER;
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