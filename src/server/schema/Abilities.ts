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
}

export class HookshotAbility extends Ability {
    constructor() {
        super();
        this.type = ABILITY_TYPES.HOOKSHOT;
    }
    @type('number') strength!: number; // damage dealt by ability
}
