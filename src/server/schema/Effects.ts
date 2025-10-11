import { Schema, type } from '@colyseus/schema';
import { CombatantEffectType, StatType, StatOperator } from '../../shared/types/CombatantTypes';

export { StatType, StatOperator };

export abstract class CombatantEffect extends Schema {
    @type('string') type!: CombatantEffectType;
    @type('number') duration!: number; // Duration in milliseconds, 0 = permanent
    @type('number') appliedAt!: number; // Timestamp when effect was applied
}

export class StunEffect extends CombatantEffect {
    // type is inherited from base class
}

export class NoCollisionEffect extends CombatantEffect {
    // type is inherited from base class
}

export class StatModEffect extends CombatantEffect {
    @type('string') stat!: StatType;
    @type('string') operator!: StatOperator;
    @type('number') amount!: number;
}

export class ReflectEffect extends CombatantEffect {
    @type('number') reflectPercentage!: number; // Percentage of damage to reflect
}

export class HunterEffect extends CombatantEffect {
    // type is inherited from base class
}

export class TauntEffect extends CombatantEffect {
    @type('string') taunterCombatantId!: string; // ID of the combatant that applied the taunt
}

export class PassiveHealingEffect extends CombatantEffect {
    @type('number') healPercentPerSecond!: number; // Percentage of max health to heal per second
}

export class MoveEffect extends CombatantEffect {
    // type is inherited from base class
    @type('number') moveTargetX!: number; // Target X for move effect
    @type('number') moveTargetY!: number; // Target Y for move effect
    @type('number') moveSpeed!: number; // Speed for move effect (pixels per second)
}

export class BurningEffect extends CombatantEffect {
    @type('number') tickRate!: number; // milliseconds between ticks
    @type('number') lastTickTime!: number; // timestamp of last tick
    @type('number') damagePercentPerTick!: number; // percentage of target's max health to deal per tick (0.01 = 1%)
    @type('string') sourceId!: string; // ID of the combatant that applied the burning effect
}