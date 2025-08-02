export const COMBATANT_TYPES = {
    PLAYER: 'player',
    CRADLE: 'cradle',
    TURRET: 'turret'
} as const;

export type CombatantType = typeof COMBATANT_TYPES[keyof typeof COMBATANT_TYPES];

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
}

export interface CradleCombatant extends BaseCombatant {
    type: typeof COMBATANT_TYPES.CRADLE;
}

export interface TurretCombatant extends BaseCombatant {
    type: typeof COMBATANT_TYPES.TURRET;
}

export type Combatant = PlayerCombatant | CradleCombatant | TurretCombatant;

export interface AttackEvent {
    sourceId: string;
    targetId: string;
    timestamp: number;
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