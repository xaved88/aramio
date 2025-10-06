import { Schema, type, ArraySchema } from '@colyseus/schema';
import { CombatantType, MinionType, CombatantId, ControllerId, StatType } from '../../shared/types/CombatantTypes';
import { CombatantEffect, StatModEffect } from './Effects';
import { RoundStats } from './Events';
import { Ability } from './Abilities';
import { applyStatModifications } from '../../shared/utils/StatModification';

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
    @type('number') moveSpeed!: number; // Movement speed in pixels per frame
    @type('number') bulletArmor!: number; // Armor against auto-attacks
    @type('number') abilityArmor!: number; // Armor against abilities
    @type([CombatantEffect]) effects = new ArraySchema<CombatantEffect>(); // Array of active effects on this combatant - will contain specific effect types
    @type('number') lastDamageTime!: number; // Timestamp when the combatant last took damage

    // Stat getters with effect modifications
    getHealth(): number {
        return this.getModifiedStat('health', this.health);
    }

    getMaxHealth(): number {
        return this.getModifiedStat('maxHealth', this.maxHealth);
    }

    getAttackRadius(): number {
        return this.getModifiedStat('attackRadius', this.attackRadius);
    }

    getAttackStrength(): number {
        return this.getModifiedStat('attackStrength', this.attackStrength);
    }

    getAttackSpeed(): number {
        return this.getModifiedStat('attackSpeed', this.attackSpeed);
    }

    getWindUp(): number {
        return this.getModifiedStat('windUp', this.windUp);
    }

    getMoveSpeed(): number {
        return this.getModifiedStat('moveSpeed', this.moveSpeed);
    }

    getBulletArmor(): number {
        return this.getModifiedStat('bulletArmor', this.bulletArmor);
    }

    getAbilityArmor(): number {
        return this.getModifiedStat('abilityArmor', this.abilityArmor);
    }

    protected getModifiedStat(statType: StatType, baseStat: number): number {
        return applyStatModifications(statType, baseStat, Array.from(this.effects).filter(e => e != null));
    }
}

export class Hero extends Combatant {
    @type('string') state!: string; // 'alive' or 'respawning'
    @type('number') respawnTime!: number; // timestamp when respawn completes
    @type('number') respawnDuration!: number; // respawn duration in ms
    @type('number') experience!: number;
    @type('number') level!: number;
    @type('number') experienceNeeded!: number; // XP needed for next level
    @type(RoundStats) roundStats!: RoundStats;
    @type(Ability) ability!: Ability;
    @type('string') controller!: ControllerId; // client ID for players, bot strategy for bots
    @type('string') displayName!: string; // display name for the hero (e.g., 'Hero 1', 'Hero 2')
    @type(['string']) levelRewards = new ArraySchema<string>(); // Array of level rewards
    @type(['string']) rewardsForChoice = new ArraySchema<string>(); // Array of reward options to choose from
    @type([CombatantEffect]) permanentEffects = new ArraySchema<CombatantEffect>(); // Array of permanent effects (rewards, etc.)

    // Override to include permanent effects
    protected getModifiedStat(statType: StatType, baseStat: number): number {
        const allEffects = [
            ...Array.from(this.effects).filter(e => e != null),
            ...Array.from(this.permanentEffects).filter(e => e != null)
        ];
        const result = applyStatModifications(statType, baseStat, allEffects);
        return result;
    }

    // Ability stat getters - use the same permanent effects system as base stats
    getAbilityRange(): number {
        return this.getModifiedStat('ability:range', (this.ability as any).range || 0);
    }

    getAbilityStrength(): number {
        return this.getModifiedStat('ability:strength', (this.ability as any).strength || 0);
    }

    getAbilityCooldown(): number {
        return this.getModifiedStat('ability:cooldown', this.ability.cooldown);
    }

    getAbilityDuration(): number {
        return this.getModifiedStat('ability:duration', (this.ability as any).duration || 0);
    }

    getAbilitySpeed(): number {
        return this.getModifiedStat('ability:speed', (this.ability as any).speed || 0);
    }

    // Specialized getters for specific abilities
    getMercenaryRageSpeed(): number {
        return this.getModifiedStat('ability:mercenaryRageSpeed', (this.ability as any).mercenaryRageSpeedBoost || 1.0);
    }

    getPyromancerRadius(): number {
        return this.getModifiedStat('ability:pyromancerRadius', (this.ability as any).fireballRadius || 0);
    }

}

export class Minion extends Combatant {
    @type('string') minionType!: MinionType;
    @type('boolean') isBuffed = false; // Whether this minion has buffed stats (2x health/damage, 4x XP)
}
