import { PyromancerAbility } from '../../../schema/Abilities';
import { AbilityDefinition } from './AbilityDefinition';
import { Projectile, ProjectileEffect } from '../../../schema/Projectiles';
import { GameplayConfig } from '../../../config/ConfigProvider';

export class PyromancerAbilityDefinition implements AbilityDefinition<PyromancerAbility> {
    private static _instance: PyromancerAbilityDefinition;

    static get instance(): PyromancerAbilityDefinition {
        if (!PyromancerAbilityDefinition._instance) {
            PyromancerAbilityDefinition._instance = new PyromancerAbilityDefinition();
        }
        return PyromancerAbilityDefinition._instance;
    }

    create(gameplayConfig: GameplayConfig): PyromancerAbility {
        const ability = new PyromancerAbility();
        
        const config = gameplayConfig.COMBAT.ABILITIES.pyromancer;
        
        ability.cooldown = config.COOLDOWN_MS;
        ability.lastUsedTime = 0;
        ability.strength = config.STRENGTH;
        ability.radius = config.RADIUS;
        ability.range = config.RANGE;
        
        return ability;
    }

    onLevelUp(ability: PyromancerAbility, gameplayConfig: GameplayConfig): void {
        const config = gameplayConfig.COMBAT.ABILITIES.pyromancer;
        ability.strength += config.STRENGTH_PER_LEVEL;
        ability.radius += config.RADIUS_PER_LEVEL;
        ability.range += config.RANGE_PER_LEVEL;
    }

    useAbility(ability: PyromancerAbility, heroId: string, x: number, y: number, state: any, gameplayConfig: GameplayConfig): boolean {
        const currentTime = state.gameTime;
        
        // If lastUsedTime is 0, the ability hasn't been used yet, so it's available
        if (ability.lastUsedTime === 0) {
            ability.lastUsedTime = currentTime;
            this.createFireball(heroId, x, y, state, ability, gameplayConfig);
            return true;
        }
        
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
        
        // Create fireball projectile
        this.createFireball(heroId, targetX, targetY, state, ability, gameplayConfig);
        
        return true;
    }

    private createFireball(heroId: string, targetX: number, targetY: number, state: any, ability: PyromancerAbility, gameplayConfig: GameplayConfig): void {
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
        
        // Calculate speed based on level
        const config = gameplayConfig.COMBAT.ABILITIES.pyromancer;
        const level = hero.level || 1;
        const speed = config.SPEED + (config.SPEED_PER_LEVEL * (level - 1));
        
        // Create projectile
        const projectile = new Projectile();
        projectile.id = `fireball_${state.gameTime}_${Math.random()}`;
        projectile.ownerId = hero.id;
        projectile.x = hero.x;
        projectile.y = hero.y;
        projectile.directionX = directionX;
        projectile.directionY = directionY;
        projectile.speed = speed;
        projectile.team = hero.team;
        projectile.type = 'fireball';
        // Calculate max duration based on range and speed (with safety margin)
        const maxTravelTime = (ability.range / speed) * 1000; // Convert to milliseconds
        projectile.duration = maxTravelTime * 2; // Double the expected time as safety margin
        projectile.createdAt = state.gameTime;
        projectile.targetX = targetX;
        projectile.targetY = targetY;
        projectile.aoeRadius = ability.radius;
        
        // Add applyDamage effect
        const damageEffect = new ProjectileEffect();
        damageEffect.effectType = 'applyDamage';
        damageEffect.damage = ability.strength;
        projectile.effects.push(damageEffect);
        
        state.projectiles.set(projectile.id, projectile);
    }
}
