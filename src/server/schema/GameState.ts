import { Schema, type, MapSchema, ArraySchema } from '@colyseus/schema';
import { CombatantType, MinionType, CombatantId, ControllerId, ProjectileId, AbilityType, ABILITY_TYPES, CombatantEffectType, COMBATANT_EFFECT_TYPES, ProjectileType } from '../../shared/types/CombatantTypes';

// Events for reporting from the server to the client, or special server reactions
export class AttackEvent extends Schema {
    @type('string') sourceId!: CombatantId;
    @type('string') targetId!: CombatantId;
    @type('number') timestamp!: number;
}

export class XPEvent extends Schema {
    @type('string') playerId!: CombatantId; // ID of the combatant who earned XP
    @type('number') amount!: number; // Amount of XP earned
    @type('number') x!: number; // X position where XP was earned
    @type('number') y!: number; // Y position where XP was earned
    @type('number') timestamp!: number; // When the XP was earned
    @type('string') type?: string; // Type of XP event (e.g., 'minionKill', 'heroKill')
}

export class LevelUpEvent extends Schema {
    @type('string') playerId!: CombatantId; // ID of the combatant who leveled up
    @type('number') newLevel!: number; // The new level they reached
    @type('number') x!: number; // X position of the player
    @type('number') y!: number; // Y position of the player
    @type('number') timestamp!: number; // When the level up occurred
}

export class DamageEvent extends Schema {
    @type('string') sourceId!: CombatantId; // ID of the combatant that dealt damage
    @type('string') targetId!: CombatantId; // ID of the combatant that took damage
    @type('string') targetType!: string; // Type of the target (minion, hero, turret, cradle)
    @type('number') amount!: number; // Amount of damage dealt
    @type('number') timestamp!: number; // When the damage occurred
}

export class KillEvent extends Schema {
    @type('string') sourceId!: CombatantId; // ID of the combatant that got the kill
    @type('string') targetId!: CombatantId; // ID of the combatant that was killed
    @type('string') targetType!: string; // Type of the target (minion, hero, turret, cradle)
    @type('number') timestamp!: number; // When the kill occurred
}

export class RoundStats extends Schema {
    @type('number') totalExperience = 0; // total XP earned throughout the match
    @type('number') minionKills = 0; // number of minions killed
    @type('number') heroKills = 0; // number of heroes killed
    @type('number') turretKills = 0; // number of turrets destroyed
    @type('number') damageTaken = 0; // total damage taken
    @type('number') damageDealt = 0; // total damage dealt
}

export class Ability extends Schema {
    @type('string') type!: AbilityType;
    @type('number') cooldown!: number; // cooldown duration in ms
    @type('number') lastUsedTime!: number; // timestamp when ability was last used
}

export class DefaultAbility extends Ability {
    constructor() {
        super();
        this.type = ABILITY_TYPES.DEFAULT;
    }
    @type('number') strength!: number; // damage dealt by ability
}

export class HookshotAbility extends Ability {
    constructor() {
        super();
        this.type = ABILITY_TYPES.HOOKSHOT;
    }
    @type('number') strength!: number; // damage dealt by ability
}

export class CombatantEffect extends Schema {
    @type('string') type!: CombatantEffectType;
    @type('number') duration!: number; // Duration in milliseconds, 0 = permanent
}

export class ProjectileEffect extends Schema {
    @type('string') effectType!: string; // 'applyDamage' or 'applyEffect'
    @type('number') damage?: number; // For applyDamage effect
    @type(CombatantEffect) combatantEffect?: CombatantEffect; // For applyEffect effect
}

export class Projectile extends Schema {
    @type('string') id!: ProjectileId;
    @type('string') ownerId!: CombatantId; // who fired the projectile
    @type('number') x!: number;
    @type('number') y!: number;
    @type('number') directionX!: number; // normalized direction vector
    @type('number') directionY!: number;
    @type('number') speed!: number; // pixels per second
    @type('string') team!: string; // team of the owner
    @type('string') type!: ProjectileType; // type of projectile
    @type('number') duration!: number; // Duration in milliseconds, -1 = infinite
    @type('number') createdAt!: number; // Timestamp when projectile was created
    @type([ProjectileEffect]) effects = new ArraySchema<ProjectileEffect>(); // Array of effects that trigger on collision
}

export class Combatant extends Schema {
    @type('string') id!: CombatantId;
    @type('string') type!: CombatantType;
    @type('number') x!: number;
    @type('number') y!: number;
    @type('string') team!: string;
    @type('number') health!: number;
    @type('number') maxHealth!: number;
    @type('number') attackRadius!: number;
    @type('number') attackStrength!: number;
    @type('number') attackSpeed!: number; // attacks per second
    @type('number') lastAttackTime!: number;
    @type('number') size!: number; // collision radius
    @type('string') target?: CombatantId; // ID of the combatant being targeted
    @type('number') windUp!: number; // Time in seconds before attack can be performed
    @type('number') attackReadyAt!: number; // Timestamp when wind-up period ends and attack can be performed
    @type([CombatantEffect]) effects = new ArraySchema<CombatantEffect>(); // Array of active effects on this combatant
}

export class Hero extends Combatant {
    @type('string') state!: string; // 'alive' or 'respawning'
    @type('number') respawnTime!: number; // timestamp when respawn completes
    @type('number') respawnDuration!: number; // respawn duration in ms
    @type('number') experience!: number;
    @type('number') level!: number;
    @type(RoundStats) roundStats!: RoundStats;
    @type(Ability) ability!: Ability;
    @type('string') controller!: ControllerId; // client ID for players, bot strategy for bots
}

export class Minion extends Combatant {
    @type('string') minionType!: MinionType;
}

export class GameState extends Schema {
    @type('number') gameTime = 0;
    @type('string') gamePhase = 'playing';
    @type('number') currentWave = 0;
    @type('string') winningTeam = '';
    @type('number') gameEndTime = 0;
    @type({ map: Combatant }) combatants = new MapSchema<Combatant, CombatantId>();
    @type([AttackEvent]) attackEvents = new ArraySchema<AttackEvent>();
    @type([XPEvent]) xpEvents = new ArraySchema<XPEvent>();
    @type([LevelUpEvent]) levelUpEvents = new ArraySchema<LevelUpEvent>();
    @type([DamageEvent]) damageEvents = new ArraySchema<DamageEvent>();
    @type([KillEvent]) killEvents = new ArraySchema<KillEvent>();
    @type({ map: Projectile }) projectiles = new MapSchema<Projectile>();
    @type({ map: 'number' }) warriorSpawnTimes = new MapSchema<number>(); // Track when warriors were spawned for each wave
    @type({ map: 'boolean' }) archerSpawned = new MapSchema<boolean>(); // Track if archers have been spawned for each wave
} 
