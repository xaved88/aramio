import { DefaultAbility } from '../../../schema/Abilities';
import { Projectile, ProjectileEffect } from '../../../schema/Projectiles';
import { AbilityDefinition } from './AbilityDefinition';
import { GAMEPLAY_CONFIG } from '../../../../Config';

export class DefaultAbilityDefinition implements AbilityDefinition<DefaultAbility> {
    private static _instance: DefaultAbilityDefinition | null = null;
    
    static get instance(): DefaultAbilityDefinition {
        if (!DefaultAbilityDefinition._instance) {
            DefaultAbilityDefinition._instance = new DefaultAbilityDefinition();
        }
        return DefaultAbilityDefinition._instance;
    }

    create(): DefaultAbility {
        const ability = new DefaultAbility();
        
        const config = GAMEPLAY_CONFIG.COMBAT.ABILITIES.default;
        
        ability.cooldown = config.COOLDOWN_MS;
        ability.lastUsedTime = 0;
        ability.strength = config.STRENGTH;
        ability.range = config.RANGE;
        
        return ability;
    }

    onLevelUp(ability: DefaultAbility): void {
        const config = GAMEPLAY_CONFIG.COMBAT.ABILITIES.default;
        
        const abilityBoostMultiplier = 1 + GAMEPLAY_CONFIG.EXPERIENCE.ABILITY_STRENGTH_BOOST_PERCENTAGE;
        ability.strength = Math.round(ability.strength * abilityBoostMultiplier);
        
        // Scale range
        ability.range += config.RANGE_PER_LEVEL;
    }

    useAbility(ability: DefaultAbility, heroId: string, x: number, y: number, state: any): boolean {
        const currentTime = state.gameTime;
        
        // Find hero by ID
        const hero = state.combatants.get(heroId);
        if (!hero) return false;
        
        // If lastUsedTime is 0, the ability hasn't been used yet, so it's available
        if (ability.lastUsedTime === 0) {
            ability.lastUsedTime = currentTime;
            // Apply range clamping even on first use
            const dx = x - hero.x;
            const dy = y - hero.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            let targetX = x;
            let targetY = y;
        if (distance > ability.range) {
            const directionX = dx / distance;
            const directionY = dy / distance;
            targetX = hero.x + directionX * ability.range;
            targetY = hero.y + directionY * ability.range;
        }
            
            this.createProjectile(heroId, targetX, targetY, state, ability);
            return true;
        }
        
        const timeSinceLastUse = currentTime - ability.lastUsedTime;
  
        if (timeSinceLastUse < ability.cooldown) {
            return false; // Ability is on cooldown
        }

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

        ability.lastUsedTime = currentTime;
        this.createProjectile(heroId, targetX, targetY, state, ability);
        return true;
    }

    private createProjectile(heroId: string, targetX: number, targetY: number, state: any, ability: DefaultAbility): void {
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
        
        // Create projectile
        const projectile = new Projectile();
        projectile.id = `projectile_${state.gameTime}_${Math.random()}`;
        projectile.ownerId = hero.id;
        projectile.x = hero.x;
        projectile.y = hero.y;
        projectile.startX = hero.x; // Store starting position for range calculation
        projectile.startY = hero.y;
        projectile.directionX = directionX;
        projectile.directionY = directionY;
        projectile.speed = GAMEPLAY_CONFIG.COMBAT.ABILITIES.default.SPEED;
        projectile.team = hero.team;
        projectile.type = 'default';
        projectile.duration = -1; // Infinite duration
        projectile.range = ability.range; // Set range for range-based removal
        projectile.createdAt = state.gameTime;
        
        // Add applyDamage effect
        const damageEffect = new ProjectileEffect();
        damageEffect.effectType = 'applyDamage';
        damageEffect.damage = ability.strength;
        projectile.effects.push(damageEffect);
        
        state.projectiles.set(projectile.id, projectile);
    }
}
