import { Schema, type } from '@colyseus/schema';
import { AbilityType, ABILITY_TYPES } from '../../shared/types/CombatantTypes';

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
  @type('number') strengthRatio!: number; // damage ratio (multiplied by abilityPower)
  @type('number') range!: number; // projectile range
}

export class HookshotAbility extends Ability {
  constructor() {
    super();
    this.type = ABILITY_TYPES.HOOKSHOT;
  }
  @type('number') strengthRatio!: number; // damage ratio (multiplied by abilityPower)
  @type('number') range!: number; // projectile range
  @type('number') duration!: number; // stun duration in ms
  @type('number') speed!: number; // projectile speed
}

export class MercenaryAbility extends Ability {
    constructor() {
        super();
        this.type = ABILITY_TYPES.MERCENARY;
    }
    @type('number') duration!: number; // rage duration in ms
    @type('number') mercenaryRageSpeedBoost!: number; // multiplier for rage move speed boost
}

export class PyromancerAbility extends Ability {
    constructor() {
        super();
        this.type = ABILITY_TYPES.PYROMANCER;
    }
    @type('number') strengthRatio!: number; // damage ratio (multiplied by abilityPower)
    @type('number') burnStrengthRatio!: number; // burning damage multiplier in formula: (AP * ratio) / (AP + 150)
    @type('number') duration!: number; // zone duration in ms
    @type('number') radius!: number; // AOE radius
    @type('number') range!: number; // projectile range
    @type('number') fireballRadius!: number; // AOE radius (can be modified by rewards)
    @type('number') speed!: number; // projectile speed
}

export class ThorndiveAbility extends Ability {
    constructor() {
        super();
        this.type = ABILITY_TYPES.THORNDIVE;
    }
    @type('number') strengthRatio!: number; // damage ratio (multiplied by abilityPower)
    @type('number') range!: number; // dash range
    @type('number') duration!: number; // reflect duration in ms
    @type('number') tauntDuration!: number; // taunt duration in ms
    @type('number') landingRadius!: number; // AOE radius for landing damage
}

export class SniperAbility extends Ability {
    constructor() {
        super();
        this.type = ABILITY_TYPES.SNIPER;
    }
    @type('number') strengthRatio!: number; // damage ratio (multiplied by abilityPower)
    @type('number') range!: number; // projectile range
    @type('number') speed!: number; // projectile speed
}