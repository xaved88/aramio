import { Schema, type, ArraySchema } from '@colyseus/schema';
import { CombatantType, MinionType, CombatantId, ControllerId, StatType } from '../../shared/types/CombatantTypes';
import { CombatantEffect, StatModEffect } from './Effects';
import { RoundStats } from './Events';
import { Ability } from './Abilities';

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
    @type([CombatantEffect]) effects = new ArraySchema<CombatantEffect>(); // Array of active effects on this combatant - will contain specific effect types

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

    private getModifiedStat(statType: StatType, baseStat: number): number {
        let modifiedValue = baseStat;

        // Find all StatModEffects for this stat type
        const statModEffects = this.effects.filter(effect => 
            effect.type === 'statmod' && (effect as StatModEffect).stat === statType
        ) as StatModEffect[];

        // Apply each effect
        for (const effect of statModEffects) {
            switch (effect.operator) {
                case 'relative':
                    modifiedValue += effect.amount;
                    break;
                case 'absolute':
                    modifiedValue = effect.amount;
                    break;
                case 'percent':
                    modifiedValue *= effect.amount;
                    break;
            }
        }

        return Math.max(0, modifiedValue); // Ensure non-negative values
    }
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
