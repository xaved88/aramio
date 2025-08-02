import { Schema, type, MapSchema, ArraySchema } from '@colyseus/schema';
import { CombatantType, MinionType } from '../../shared/types/CombatantTypes';

export class AttackEvent extends Schema {
    @type('string') sourceId!: string;
    @type('string') targetId!: string;
    @type('number') timestamp!: number;
}

export class Ability extends Schema {
    @type('string') type!: string;
    @type('number') cooldown!: number; // cooldown duration in ms
    @type('number') lastUsedTime!: number; // timestamp when ability was last used
}

export class Projectile extends Schema {
    @type('string') id!: string;
    @type('string') ownerId!: string; // who fired the projectile
    @type('number') x!: number;
    @type('number') y!: number;
    @type('number') directionX!: number; // normalized direction vector
    @type('number') directionY!: number;
    @type('number') speed!: number; // pixels per second
    @type('number') strength!: number; // damage dealt
    @type('string') team!: string; // team of the owner
}

export class Combatant extends Schema {
    @type('string') id!: string;
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
}

export class Player extends Combatant {
    @type('string') state!: string; // 'alive' or 'respawning'
    @type('number') respawnTime!: number; // timestamp when respawn completes
    @type('number') respawnDuration!: number; // respawn duration in ms
    @type('number') experience!: number;
    @type('number') level!: number;
    @type(Ability) ability!: Ability;
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
    @type({ map: Combatant }) combatants = new MapSchema<Combatant>();
    @type([AttackEvent]) attackEvents = new ArraySchema<AttackEvent>();
    @type({ map: Projectile }) projectiles = new MapSchema<Projectile>();
} 