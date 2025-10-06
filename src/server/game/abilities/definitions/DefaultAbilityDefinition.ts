import { DefaultAbility } from '../../../schema/Abilities';
import { Projectile, ProjectileEffect } from '../../../schema/Projectiles';
import { Hero } from '../../../schema/Combatants';
import { AbilityDefinition } from './AbilityDefinition';
import { GameplayConfig } from '../../../config/ConfigProvider';

export class DefaultAbilityDefinition implements AbilityDefinition<DefaultAbility> {
    private static _instance: DefaultAbilityDefinition | null = null;
    
    static get instance(): DefaultAbilityDefinition {
        if (!DefaultAbilityDefinition._instance) {
            DefaultAbilityDefinition._instance = new DefaultAbilityDefinition();
        }
        return DefaultAbilityDefinition._instance;
    }

    create(gameplayConfig: GameplayConfig): DefaultAbility {
        const ability = new DefaultAbility();
        
        const config = gameplayConfig.COMBAT.ABILITIES.default;
        
        ability.cooldown = config.COOLDOWN_MS;
        ability.lastUsedTime = 0;
        ability.strength = config.STRENGTH;
        ability.range = config.RANGE;
        
        return ability;
    }

    onLevelUp(ability: DefaultAbility, gameplayConfig: GameplayConfig): void {
    }

    useAbility(ability: DefaultAbility, heroId: string, x: number, y: number, state: any, gameplayConfig: GameplayConfig): boolean {
        const currentTime = state.gameTime;
        
        // Find hero by ID first
        const hero = state.combatants.get(heroId) as Hero;
        if (!hero) return false;
        
        // Check if ability is ready (handles both first use and cooldown)
        if (ability.lastUsedTime !== 0 && currentTime - ability.lastUsedTime < hero.getAbilityCooldown()) {
            return false;
        }
        
        // Calculate distance to target and clamp to max range if beyond range
        const dx = x - hero.x;
        const dy = y - hero.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        let targetX = x;
        let targetY = y;
        if (distance > hero.getAbilityRange()) {
            const directionX = dx / distance;
            const directionY = dy / distance;
            targetX = hero.x + directionX * hero.getAbilityRange();
            targetY = hero.y + directionY * hero.getAbilityRange();
        }

        ability.lastUsedTime = currentTime;
        this.createProjectile(heroId, targetX, targetY, state, ability, gameplayConfig);
        return true;
    }


    private createProjectile(heroId: string, targetX: number, targetY: number, state: any, ability: DefaultAbility, gameplayConfig: GameplayConfig): void {
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
        projectile.speed = gameplayConfig.COMBAT.ABILITIES.default.SPEED;
        projectile.team = hero.team;
        projectile.type = 'default';
        projectile.duration = -1; // Infinite duration
        projectile.range = hero.getAbilityRange(); // Set range for range-based removal
        projectile.createdAt = state.gameTime;
        
        // Add applyDamage effect
        const damageEffect = new ProjectileEffect();
        damageEffect.effectType = 'applyDamage';
        damageEffect.damage = hero.getAbilityStrength();
        projectile.effects.push(damageEffect);
        
        state.projectiles.set(projectile.id, projectile);
    }
}
