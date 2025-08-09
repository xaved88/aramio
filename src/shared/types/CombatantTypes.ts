// Type aliases for different ID types
export type CombatantId = string;
export type ControllerId = string;
export type ProjectileId = string;

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

// Ability type constants
export const ABILITY_TYPES = {
    DEFAULT: 'default',
    HOOKSHOT: 'hookshot',
    MERCENARY: 'mercenary'
} as const;

export type AbilityType = typeof ABILITY_TYPES[keyof typeof ABILITY_TYPES];

// Projectile type constants
export const PROJECTILE_TYPES = {
    DEFAULT: 'default',
    HOOK: 'hook'
} as const;

export type ProjectileType = typeof PROJECTILE_TYPES[keyof typeof PROJECTILE_TYPES];

// Effect type constants (renamed from Effect to CombatantEffect for clarity)
export const COMBATANT_EFFECT_TYPES = {
    STUN: 'stun',
    MOVE: 'move',
    NOCOLLISION: 'nocollision',
    STATMOD: 'statmod',
    REFLECT: 'reflect'
} as const;

export type CombatantEffectType = typeof COMBATANT_EFFECT_TYPES[keyof typeof COMBATANT_EFFECT_TYPES];

export interface CombatantEffect {
    type: CombatantEffectType;
    duration: number; // Duration in milliseconds, 0 = permanent
    appliedAt: number; // Timestamp when effect was applied
}

export interface StunEffect extends CombatantEffect {
    type: 'stun';
}

export interface NoCollisionEffect extends CombatantEffect {
    type: 'nocollision';
}

export type StatType = 'health' | 'maxHealth' | 'attackRadius' | 'attackStrength' | 'attackSpeed' | 'windUp' | 'moveSpeed';
export type StatOperator = 'relative' | 'absolute' | 'percent';

export interface StatModEffect extends CombatantEffect {
    type: 'statmod';
    stat: StatType;
    operator: StatOperator;
    amount: number;
}

export interface ReflectEffect extends CombatantEffect {
    type: 'reflect';
}

export interface MoveEffect extends CombatantEffect {
    type: 'move';
    moveTargetX: number;
    moveTargetY: number;
    moveSpeed: number; // pixels per second
}

// Projectile effect types
export const PROJECTILE_EFFECT_TYPES = {
    APPLY_DAMAGE: 'applyDamage',
    APPLY_EFFECT: 'applyEffect'
} as const;

export type ProjectileEffectType = typeof PROJECTILE_EFFECT_TYPES[keyof typeof PROJECTILE_EFFECT_TYPES];

export interface ApplyDamageEffect {
    type: typeof PROJECTILE_EFFECT_TYPES.APPLY_DAMAGE;
    damage: number;
}

export interface ApplyEffectEffect {
    type: typeof PROJECTILE_EFFECT_TYPES.APPLY_EFFECT;
    combatantEffect: CombatantEffectUnion;
}

export type ProjectileEffect = ApplyDamageEffect | ApplyEffectEffect;

export interface RoundStats {
    totalExperience: number; // total XP earned throughout the match
    minionKills: number; // number of minions killed
    heroKills: number; // number of heroes killed
    turretKills: number; // number of turrets destroyed
    damageTaken: number; // total damage taken
    damageDealt: number; // total damage dealt
}

export interface Ability {
    type: AbilityType;
    cooldown: number;
    lastUsedTime: number;
}

export interface DefaultAbility extends Ability {
    strength: number;
}

export interface HookshotAbility extends Ability {
    strength: number;
}

export interface MercenaryAbility extends Ability {
    type: typeof ABILITY_TYPES.MERCENARY;
}

export type CombatantEffectUnion = StunEffect | NoCollisionEffect | StatModEffect | ReflectEffect | MoveEffect;

export interface BaseCombatant {
    id: CombatantId;
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
    target?: CombatantId; // ID of the combatant being targeted
    windUp: number; // Time in seconds before attack can be performed
    attackReadyAt: number; // Timestamp when wind-up period ends and attack can be performed
    moveSpeed: number; // Movement speed in pixels per frame
    effects: CombatantEffectUnion[]; // Array of active effects on this combatant
}

export interface HeroCombatant extends BaseCombatant {
    type: typeof COMBATANT_TYPES.HERO;
    state: 'alive' | 'respawning';
    respawnTime: number;
    respawnDuration: number;
    experience: number;
    level: number;
    roundStats: RoundStats;
    ability: Ability;
    controller: ControllerId; // client ID for players, bot strategy for bots
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
    sourceId: CombatantId;
    targetId: CombatantId;
    timestamp: number;
}

export interface DamageEvent {
    sourceId: CombatantId;
    targetId: CombatantId;
    targetType: string;
    amount: number;
    timestamp: number;
}

export interface KillEvent {
    sourceId: CombatantId;
    targetId: CombatantId;
    targetType: string;
    timestamp: number;
}

export interface Projectile {
    id: ProjectileId;
    ownerId: CombatantId;
    x: number;
    y: number;
    directionX: number;
    directionY: number;
    speed: number;
    team: string;
    type: ProjectileType;
    duration: number; // Duration in milliseconds, -1 = infinite
    createdAt: number; // Timestamp when projectile was created
    effects: ProjectileEffect[]; // Array of effects that trigger on collision
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
