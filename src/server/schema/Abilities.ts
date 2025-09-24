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
  @type('number') strength!: number; // damage dealt by ability
  @type('number') range!: number; // projectile range
}

export class HookshotAbility extends Ability {
  constructor() {
    super();
    this.type = ABILITY_TYPES.HOOKSHOT;
  }
  @type('number') strength!: number; // damage dealt by ability
  @type('number') range!: number; // projectile range
  @type('number') duration!: number; // stun duration in ms
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
    @type('number') strength!: number; // damage dealt by ability
    @type('number') radius!: number; // AOE radius
    @type('number') range!: number; // projectile range
}

export class ThorndiveAbility extends Ability {
    constructor() {
        super();
        this.type = ABILITY_TYPES.THORNDIVE;
    }
    @type('number') strength!: number; // damage dealt by ability (landing damage)
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
    @type('number') strength!: number; // damage dealt by ability
    @type('number') range!: number; // projectile range
}