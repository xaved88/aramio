import { Schema, type, ArraySchema } from '@colyseus/schema';
import { CombatantId, ProjectileId, ProjectileType } from '../../shared/types/CombatantTypes';
import { CombatantEffect } from './Effects';

export class ProjectileEffect extends Schema {
    @type('string') effectType!: string; // 'applyDamage' or 'applyEffect'
    @type('number') damage?: number; // For applyDamage effect
    @type(CombatantEffect) combatantEffect?: CombatantEffect; // For applyEffect effect - will be one of the specific effect types
}

export class Projectile extends Schema {
    @type('string') id!: ProjectileId;
    @type('string') ownerId!: CombatantId; // who fired the projectile
    @type('number') x!: number;
    @type('number') y!: number;
    @type('number') directionX!: number; // normalized direction vector
    @type('number') directionY!: number;
    @type('number') speed!: number; // pixels per second
    @type('string') team!: string; // team of the owner
    @type('string') type!: ProjectileType; // type of projectile
    @type('number') duration!: number; // Duration in milliseconds, -1 = infinite
    @type('number') createdAt!: number; // Timestamp when projectile was created
    @type([ProjectileEffect]) effects = new ArraySchema<ProjectileEffect>(); // Array of effects that trigger on collision
}
