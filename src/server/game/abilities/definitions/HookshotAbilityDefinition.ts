import { HookshotAbility, Projectile, ProjectileEffect, CombatantEffect } from '../../../schema/GameState';
import { AbilityDefinition } from './AbilityDefinition';
import { GAMEPLAY_CONFIG } from '../../../../Config';

export class HookshotAbilityDefinition implements AbilityDefinition<HookshotAbility> {
    private static _instance: HookshotAbilityDefinition | null = null;
    
    static get instance(): HookshotAbilityDefinition {
        if (!HookshotAbilityDefinition._instance) {
            HookshotAbilityDefinition._instance = new HookshotAbilityDefinition();
        }
        return HookshotAbilityDefinition._instance;
    }

    create(): HookshotAbility {
        const ability = new HookshotAbility();
        
        const config = GAMEPLAY_CONFIG.COMBAT.ABILITIES.hookshot;
        
        ability.cooldown = config.COOLDOWN_MS;
        ability.lastUsedTime = 0;
        ability.strength = config.STRENGTH;
        
        return ability;
    }

    onLevelUp(ability: HookshotAbility): void {
        // Scale strength like other abilities
        const abilityBoostMultiplier = 1 + GAMEPLAY_CONFIG.EXPERIENCE.ABILITY_STRENGTH_BOOST_PERCENTAGE;
        ability.strength = Math.round(ability.strength * abilityBoostMultiplier);
    }

    useAbility(ability: HookshotAbility, heroId: string, x: number, y: number, state: any): boolean {
        const currentTime = Date.now();
        
        // Find hero by ID
        const hero = state.combatants.get(heroId);
        if (!hero) return false;
        
        // If lastUsedTime is 0, the ability hasn't been used yet, so it's available
        if (ability.lastUsedTime === 0) {
            ability.lastUsedTime = currentTime;
            this.createProjectile(heroId, x, y, state, ability);
            return true;
        }
        
        const timeSinceLastUse = currentTime - ability.lastUsedTime;
  
        if (timeSinceLastUse < ability.cooldown) {
            return false; // Ability is on cooldown
        }

        ability.lastUsedTime = currentTime;
        this.createProjectile(heroId, x, y, state, ability);
        return true;
    }

    private createProjectile(heroId: string, targetX: number, targetY: number, state: any, ability: HookshotAbility): void {
        // Find hero by ID
        const hero = state.combatants.get(heroId);
        if (!hero) return;

        // Calculate direction from hero to target
        const dx = targetX - hero.x;
        const dy = targetY - hero.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance === 0) return; // Can't shoot at self
        
        // Normalize direction
        const directionX = dx / distance;
        const directionY = dy / distance;
        
        // Get config and calculate scaled values based on hero level
        const config = GAMEPLAY_CONFIG.COMBAT.ABILITIES.hookshot;
        const heroLevel = hero.level || 1;
        
        // Calculate scaled speed (base speed + 10% per level)
        const speedMultiplier = 1 + (config.SPEED_BOOST_PERCENTAGE * (heroLevel - 1));
        const scaledSpeed = Math.round(config.SPEED * speedMultiplier);
        
        // Calculate scaled stun duration (base duration + 100ms per level)
        const scaledStunDuration = config.STUN_DURATION_MS + (config.STUN_DURATION_PER_LEVEL_MS * (heroLevel - 1));
        
        // Create projectile
        const projectile = new Projectile();
        projectile.id = `projectile_${Date.now()}_${Math.random()}`;
        projectile.ownerId = hero.id;
        projectile.x = hero.x;
        projectile.y = hero.y;
        projectile.directionX = directionX;
        projectile.directionY = directionY;
        projectile.speed = scaledSpeed;
        projectile.team = hero.team;
        projectile.type = 'hook';
        projectile.duration = config.DURATION_MS;
        projectile.createdAt = Date.now();
        
        // Add applyDamage effect
        const damageEffect = new ProjectileEffect();
        damageEffect.effectType = 'applyDamage';
        damageEffect.damage = ability.strength;
        projectile.effects.push(damageEffect);
        
        // Add stun effect with scaled duration
        const stunEffect = new ProjectileEffect();
        stunEffect.effectType = 'applyEffect';
        stunEffect.combatantEffect = new CombatantEffect();
        stunEffect.combatantEffect.type = 'stun';
        stunEffect.combatantEffect.duration = scaledStunDuration;
        projectile.effects.push(stunEffect);
        
        // Add nocollision effect
        const nocollisionEffect = new ProjectileEffect();
        nocollisionEffect.effectType = 'applyEffect';
        nocollisionEffect.combatantEffect = new CombatantEffect();
        nocollisionEffect.combatantEffect.type = 'nocollision';
        nocollisionEffect.combatantEffect.duration = config.DURATION_MS;
        projectile.effects.push(nocollisionEffect);
        
        // Add move effect (pull target towards caster) with scaled speed
        const moveEffect = new ProjectileEffect();
        moveEffect.effectType = 'applyEffect';
        moveEffect.combatantEffect = new CombatantEffect();
        moveEffect.combatantEffect.type = 'move';
        moveEffect.combatantEffect.duration = -1; // Infinite duration - move until target reached
        moveEffect.combatantEffect.moveTargetX = hero.x;
        moveEffect.combatantEffect.moveTargetY = hero.y;
        moveEffect.combatantEffect.moveSpeed = scaledSpeed; // Use same scaled speed as projectile
        projectile.effects.push(moveEffect);
        
        state.projectiles.set(projectile.id, projectile);
    }
}
