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
