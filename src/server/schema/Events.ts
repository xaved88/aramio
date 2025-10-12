import { Schema, type } from '@colyseus/schema';
import { CombatantId } from '../../shared/types/CombatantTypes';

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
    @type('string') targetName?: string; // Display name of the killed unit (for hero kills)
    @type('boolean') targetIsBot?: boolean; // Whether the killed unit is a bot (for hero kills)
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
    @type('number') amount!: number; // Amount of damage dealt (after armor reduction)
    @type('number') originalAmount!: number; // Original damage amount (before armor reduction)
    @type('number') timestamp!: number; // When the damage occurred
    @type('string') damageSource!: string; // Source of damage ('auto-attack' or 'ability')
}

export class KillEvent extends Schema {
    @type('string') sourceId!: CombatantId; // ID of the combatant that got the kill
    @type('string') targetId!: CombatantId; // ID of the combatant that was killed
    @type('string') targetType!: string; // Type of the target (minion, hero, turret, cradle)
    @type('number') timestamp!: number; // When the kill occurred
}

export class AOEDamageEvent extends Schema {
    @type('string') sourceId!: CombatantId; // ID of the combatant that caused the AOE
    @type('number') x!: number; // X position of the AOE center
    @type('number') y!: number; // Y position of the AOE center
    @type('number') radius!: number; // Radius of the AOE effect
    @type('number') timestamp!: number; // When the AOE occurred
}

export class DeathEffectEvent extends Schema {
    @type('string') targetId!: CombatantId; // ID of the combatant that died
    @type('string') targetType!: string; // Type of the combatant that died (hero, minion, turret)
    @type('number') x!: number; // X position where death occurred
    @type('number') y!: number; // Y position where death occurred
    @type('string') team!: string; // Team of the dead combatant
    @type('number') timestamp!: number; // When the death effect occurred
}

export class ProjectileMissEvent extends Schema {
    @type('string') projectileId!: string; // ID of the projectile that missed
    @type('number') x!: number; // X position where projectile missed
    @type('number') y!: number; // Y position where projectile missed
    @type('string') team!: string; // Team color of the projectile (blue/red)
    @type('string') ownerId!: string; // ID of the projectile owner for color detection
    @type('number') timestamp!: number; // When the miss occurred
}

export class SuperMinionTriggerEvent extends Schema {
    @type('string') triggeredTeam!: string; // Team whose super minions were triggered (blue/red)
    @type('number') timestamp!: number; // When the trigger occurred
}

export class KillStreakEvent extends Schema {
    @type('string') heroId!: string; // ID of the hero who achieved the kill streak
    @type('string') heroName!: string; // Display name of the hero
    @type('string') team!: string; // Team of the hero
    @type('number') killStreak!: number; // Number of kills in the streak (5 or 10)
    @type('number') timestamp!: number; // When the kill streak was achieved
}

export class RoundStats extends Schema {
    @type('number') totalExperience = 0; // total XP earned throughout the match
    @type('number') minionKills = 0; // number of minions killed
    @type('number') heroKills = 0; // number of heroes killed
    @type('number') turretKills = 0; // number of turrets destroyed
    @type('number') deaths = 0; // number of times this hero has died
    @type('number') damageTaken = 0; // total damage taken
    @type('number') damageDealt = 0; // total damage dealt
    @type('number') currentKillStreak = 0; // current kills without dying
}
