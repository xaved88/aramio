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
    // type is inherited from base class
}

export class HunterEffect extends CombatantEffect {
    // type is inherited from base class
}

export class MoveEffect extends CombatantEffect {
    // type is inherited from base class
    @type('number') moveTargetX!: number; // Target X for move effect
    @type('number') moveTargetY!: number; // Target Y for move effect
    @type('number') moveSpeed!: number; // Speed for move effect (pixels per second)
}
