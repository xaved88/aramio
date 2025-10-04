import { SniperAbility } from '../../../schema/Abilities';
import { Projectile, ProjectileEffect } from '../../../schema/Projectiles';
import { AbilityDefinition } from './AbilityDefinition';
import { GameplayConfig } from '../../../config/ConfigProvider';

export class SniperAbilityDefinition implements AbilityDefinition<SniperAbility> {
    private static _instance: SniperAbilityDefinition | null = null;
    
    static get instance(): SniperAbilityDefinition {
        if (!SniperAbilityDefinition._instance) {
            SniperAbilityDefinition._instance = new SniperAbilityDefinition();
        }
        return SniperAbilityDefinition._instance;
    }

    create(gameplayConfig: GameplayConfig): SniperAbility {
        const ability = new SniperAbility();
        
        const config = gameplayConfig.COMBAT.ABILITIES.sniper;
        
        ability.cooldown = config.COOLDOWN_MS;
        ability.lastUsedTime = 0;
        ability.strength = config.STRENGTH;
        ability.range = config.RANGE;
        ability.speed = config.SPEED;
        
        return ability;
    }

    onLevelUp(ability: SniperAbility, gameplayConfig: GameplayConfig): void {
    }

    useAbility(ability: SniperAbility, heroId: string, x: number, y: number, state: any, gameplayConfig: GameplayConfig): boolean {
        const currentTime = state.gameTime;
        
        // Check if ability is ready (handles both first use and cooldown)
        if (ability.lastUsedTime !== 0 && currentTime - ability.lastUsedTime < ability.cooldown) {
            return false;
        }
        
        // Find hero by ID
        const hero = state.combatants.get(heroId);
        if (!hero) return false;
        
        // Calculate distance to target and clamp to max range if beyond range
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

        ability.lastUsedTime = currentTime;
        this.createProjectile(heroId, targetX, targetY, state, ability, gameplayConfig);
        return true;
    }

    private createProjectile(heroId: string, targetX: number, targetY: number, state: any, ability: SniperAbility, gameplayConfig: GameplayConfig): void {
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
        projectile.speed = ability.speed;
        projectile.team = hero.team;
        projectile.type = 'sniper';
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
