import { ThorndiveAbility } from '../../../schema/Abilities';
import { StatModEffect, NoCollisionEffect, MoveEffect, ReflectEffect, TauntEffect } from '../../../schema/Effects';
import { AbilityDefinition } from './AbilityDefinition';
import { GAMEPLAY_CONFIG } from '../../../../Config';
import { COMBATANT_EFFECT_TYPES } from '../../../../shared/types/CombatantTypes';
import { Projectile, ProjectileEffect } from '../../../schema/Projectiles';
import { ArraySchema } from '@colyseus/schema';

export class ThorndiveAbilityDefinition implements AbilityDefinition<ThorndiveAbility> {
    private static _instance: ThorndiveAbilityDefinition | null = null;
    
    static get instance(): ThorndiveAbilityDefinition {
        if (!ThorndiveAbilityDefinition._instance) {
            ThorndiveAbilityDefinition._instance = new ThorndiveAbilityDefinition();
        }
        return ThorndiveAbilityDefinition._instance;
    }

    create(): ThorndiveAbility {
        const ability = new ThorndiveAbility();
        
        const config = GAMEPLAY_CONFIG.COMBAT.ABILITIES.thorndive;
        
        ability.cooldown = config.COOLDOWN_MS;
        ability.lastUsedTime = 0;
        ability.range = config.RANGE;
        ability.landingRadius = config.LANDING_RADIUS;
        
        return ability;
    }

    onLevelUp(ability: ThorndiveAbility): void {
        const config = GAMEPLAY_CONFIG.COMBAT.ABILITIES.thorndive;
        ability.range += config.RANGE_PER_LEVEL;
        
        // Reduce cooldown by configured percentage per level
        const cooldownReduction = config.COOLDOWN_REDUCTION_PER_LEVEL || 0;
        if (cooldownReduction > 0) {
            ability.cooldown = Math.max(1000, ability.cooldown * (1 - cooldownReduction)); // Minimum 1 second cooldown
        }
    }

    useAbility(ability: ThorndiveAbility, heroId: string, x: number, y: number, state: any): boolean {
        const currentTime = Date.now();
        
        // Check cooldown
        if (currentTime - ability.lastUsedTime < ability.cooldown) {
            return false;
        }
        
        // Find hero by ID
        const hero = state.combatants.get(heroId);
        if (!hero) return false;
        
        // Calculate distance to target
        const dx = x - hero.x;
        const dy = y - hero.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Clamp target to max range if beyond range
        let targetX = x;
        let targetY = y;
        if (distance > ability.range) {
            // Calculate direction and clamp to max range
            const directionX = dx / distance;
            const directionY = dy / distance;
            targetX = hero.x + directionX * ability.range;
            targetY = hero.y + directionY * ability.range;
        }
        
        // Update last used time
        ability.lastUsedTime = currentTime;
        
        this.executeThornDive(heroId, targetX, targetY, state, hero.level);
        return true;
    }

    private executeThornDive(heroId: string, targetX: number, targetY: number, state: any, heroLevel: number): void {
        const hero = state.combatants.get(heroId);
        if (!hero) return;

        const config = GAMEPLAY_CONFIG.COMBAT.ABILITIES.thorndive;
        const currentTime = state.gameTime;
        
        // Calculate scaled values
        const landingDamage = config.LANDING_DAMAGE + (config.LANDING_DAMAGE_PER_LEVEL * (heroLevel - 1));
        const tauntDuration = config.TAUNT_DURATION_MS + (config.TAUNT_DURATION_PER_LEVEL_MS * (heroLevel - 1));
        const reflectDuration = config.REFLECT_DURATION_MS + (config.REFLECT_DURATION_PER_LEVEL_MS * (heroLevel - 1));

        // 1. Create dash movement effect
        const moveEffect = new MoveEffect();
        moveEffect.type = COMBATANT_EFFECT_TYPES.MOVE;
        moveEffect.moveTargetX = targetX;
        moveEffect.moveTargetY = targetY;
        moveEffect.moveSpeed = config.DASH_SPEED;
        moveEffect.duration = this.calculateDashDuration(hero.x, hero.y, targetX, targetY, config.DASH_SPEED);
        moveEffect.appliedAt = currentTime;

        // 2. Create no collision effect for the dash
        const noCollisionEffect = new NoCollisionEffect();
        noCollisionEffect.type = COMBATANT_EFFECT_TYPES.NOCOLLISION;
        noCollisionEffect.duration = moveEffect.duration;
        noCollisionEffect.appliedAt = currentTime;

        // Apply dash effects
        hero.effects.push(moveEffect);
        hero.effects.push(noCollisionEffect);

        // 3. Create invisible projectile for landing damage (like pyromancer fireball but invisible)
        const projectile = new Projectile();
        projectile.id = `thorndive-${heroId}-${Date.now()}`;
        projectile.ownerId = heroId;
        projectile.x = hero.x;
        projectile.y = hero.y;
        projectile.team = hero.team;
        projectile.type = 'thorndive';
        projectile.speed = config.DASH_SPEED;
        projectile.duration = moveEffect.duration;
        projectile.createdAt = Date.now();
        projectile.targetX = targetX;
        projectile.targetY = targetY;
        projectile.aoeRadius = config.LANDING_RADIUS;

        // Calculate direction from hero to target
        const dx = targetX - hero.x;
        const dy = targetY - hero.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
            // Normalize direction
            projectile.directionX = dx / distance;
            projectile.directionY = dy / distance;
        } else {
            // Fallback if targeting self
            projectile.directionX = 0;
            projectile.directionY = 0;
        }
        
        // Add landing damage effect
        const damageEffect = new ProjectileEffect();
        damageEffect.effectType = 'applyDamage';
        damageEffect.damage = landingDamage;
        projectile.effects.push(damageEffect);

        // Add taunt effect - appliedAt will be set when projectile lands
        const tauntProjectileEffect = new ProjectileEffect();
        tauntProjectileEffect.effectType = 'applyEffect';
        
        const tauntEffect = new TauntEffect();
        tauntEffect.type = COMBATANT_EFFECT_TYPES.TAUNT;
        tauntEffect.taunterCombatantId = heroId;
        tauntEffect.duration = tauntDuration;
        tauntEffect.appliedAt = 0; // Will be set when projectile lands
        
        tauntProjectileEffect.combatantEffect = tauntEffect;
        projectile.effects.push(tauntProjectileEffect);

        // Add projectile to state
        state.projectiles.set(projectile.id, projectile);

        // 4. Apply self-buffs (armor and reflect) - these start immediately and last longer than taunt
        const bulletArmorEffect = new StatModEffect();
        bulletArmorEffect.type = COMBATANT_EFFECT_TYPES.STATMOD;
        bulletArmorEffect.stat = 'bulletArmor';
        bulletArmorEffect.operator = 'relative';
        bulletArmorEffect.amount = config.ARMOR_BONUS_BULLET;
        bulletArmorEffect.duration = reflectDuration;
        bulletArmorEffect.appliedAt = currentTime;

        const abilityArmorEffect = new StatModEffect();
        abilityArmorEffect.type = COMBATANT_EFFECT_TYPES.STATMOD;
        abilityArmorEffect.stat = 'abilityArmor';
        abilityArmorEffect.operator = 'relative';
        abilityArmorEffect.amount = config.ARMOR_BONUS_ABILITY;
        abilityArmorEffect.duration = reflectDuration;
        abilityArmorEffect.appliedAt = currentTime;

        const reflectEffect = new ReflectEffect();
        reflectEffect.type = COMBATANT_EFFECT_TYPES.REFLECT;
        reflectEffect.reflectPercentage = config.REFLECT_PERCENTAGE;
        reflectEffect.duration = reflectDuration;
        reflectEffect.appliedAt = currentTime;

        // Apply self-buff effects
        hero.effects.push(bulletArmorEffect);
        hero.effects.push(abilityArmorEffect);
        hero.effects.push(reflectEffect);
    }

    private calculateDashDuration(startX: number, startY: number, targetX: number, targetY: number, speed: number): number {
        const distance = Math.sqrt(Math.pow(targetX - startX, 2) + Math.pow(targetY - startY, 2));
        return (distance / speed) * 1000; // Convert to milliseconds
    }
}
