import { GameState } from '../../../schema/GameState';
import { HookshotAbility } from '../../../schema/Abilities';
import { Projectile, ProjectileEffect } from '../../../schema/Projectiles';
import { StunEffect, NoCollisionEffect, MoveEffect } from '../../../schema/Effects';
import { Hero } from '../../../schema/Combatants';
import { AbilityDefinition } from './AbilityDefinition';
import { GameplayConfig } from '../../../config/ConfigProvider';

export class HookshotAbilityDefinition implements AbilityDefinition<HookshotAbility> {
    private static _instance: HookshotAbilityDefinition | null = null;
    
    static get instance(): HookshotAbilityDefinition {
        if (!HookshotAbilityDefinition._instance) {
            HookshotAbilityDefinition._instance = new HookshotAbilityDefinition();
        }
        return HookshotAbilityDefinition._instance;
    }

    create(gameplayConfig: GameplayConfig): HookshotAbility {
        const ability = new HookshotAbility();
        
        const config = gameplayConfig.COMBAT.ABILITIES.hookshot;
        
        ability.cooldown = config.COOLDOWN_MS;
        ability.lastUsedTime = 0;
        ability.strength = config.STRENGTH;
        ability.range = config.RANGE;
        
        return ability;
    }

    onLevelUp(ability: HookshotAbility, gameplayConfig: GameplayConfig): void {
        const config = gameplayConfig.COMBAT.ABILITIES.hookshot;
        
        // Scale strength like other abilities
        const abilityBoostMultiplier = 1 + gameplayConfig.EXPERIENCE.ABILITY_STRENGTH_BOOST_PERCENTAGE;
        ability.strength = Math.round(ability.strength * abilityBoostMultiplier);
        
        // Scale range
        ability.range += config.RANGE_PER_LEVEL;
    }

    useAbility(ability: HookshotAbility, heroId: string, x: number, y: number, state: any, gameplayConfig: GameplayConfig): boolean {
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
            
            this.createProjectile(heroId, targetX, targetY, state, ability, gameplayConfig);
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
        this.createProjectile(heroId, targetX, targetY, state, ability, gameplayConfig);
        return true;
    }

    private createProjectile(heroId: string, targetX: number, targetY: number, state: GameState, ability: HookshotAbility, gameplayConfig: GameplayConfig): void {
        // Find hero by ID
        const hero = state.combatants.get(heroId);
        if (!hero) {
            console.warn(`Hookshot: Hero ${heroId} not found in state`);
            return
        }

        // Calculate direction from hero to target
        const dx = targetX - hero.x;
        const dy = targetY - hero.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Normalize direction
        const directionX = dx / distance;
        const directionY = dy / distance;
        
        // Get config and calculate scaled values based on hero level
        const config = gameplayConfig.COMBAT.ABILITIES.hookshot;
        const heroLevel = (hero as Hero).level || 1;
        
        // Calculate scaled speed (base speed + 10% per level)
        const speedMultiplier = 1 + (config.SPEED_BOOST_PERCENTAGE * (heroLevel - 1));
        const scaledSpeed = Math.round(config.SPEED * speedMultiplier);
        
        // Calculate scaled stun duration (base duration + 100ms per level)
        const scaledStunDuration = config.STUN_DURATION_MS + (config.STUN_DURATION_PER_LEVEL_MS * (heroLevel - 1));
        
        // Create projectile
        const projectile = new Projectile();
        projectile.id = `projectile_${state.gameTime}_${Math.random()}`;
        projectile.ownerId = hero.id;
        projectile.x = hero.x;
        projectile.y = hero.y;
        projectile.directionX = directionX;
        projectile.directionY = directionY;
        projectile.speed = scaledSpeed;
        projectile.team = hero.team;
        projectile.type = 'hook';
        projectile.duration = -1; // Infinite duration - use range-based removal
        projectile.startX = hero.x; // Track starting position for range calculation
        projectile.startY = hero.y; // Track starting position for range calculation
        projectile.range = ability.range; // Set range for range-based removal
        projectile.createdAt = state.gameTime;
        
        // Add applyDamage effect
        const damageEffect = new ProjectileEffect();
        damageEffect.effectType = 'applyDamage';
        damageEffect.damage = ability.strength;
        projectile.effects.push(damageEffect);
        
        // Create stun effect
        const stunEffect = new ProjectileEffect();
        stunEffect.effectType = 'applyEffect';
        stunEffect.combatantEffect = new StunEffect();
        stunEffect.combatantEffect.type = 'stun';
        stunEffect.combatantEffect.duration = scaledStunDuration;
        stunEffect.combatantEffect.appliedAt = state.gameTime;

        // Create nocollision effect
        const nocollisionEffect = new ProjectileEffect();
        nocollisionEffect.effectType = 'applyEffect';
        nocollisionEffect.combatantEffect = new NoCollisionEffect();
        nocollisionEffect.combatantEffect.type = 'nocollision';
        // Calculate duration based on range and speed (with safety margin)
        const maxTravelTime = (ability.range / scaledSpeed) * 1000; // Convert to milliseconds
        nocollisionEffect.combatantEffect.duration = maxTravelTime * 2; // Double the expected time as safety margin
        nocollisionEffect.combatantEffect.appliedAt = state.gameTime;

        // Create move effect
        const moveEffect = new ProjectileEffect();
        moveEffect.effectType = 'applyEffect';
        const moveCombatantEffect = new MoveEffect();
        moveCombatantEffect.type = 'move';
        moveCombatantEffect.duration = -1; // Infinite duration - move until target reached
        moveCombatantEffect.moveTargetX = hero.x; // Current hero position
        moveCombatantEffect.moveTargetY = hero.y; // Current hero position
        moveCombatantEffect.moveSpeed = scaledSpeed; // Use same scaled speed as projectile
        moveCombatantEffect.appliedAt = state.gameTime;
        moveEffect.combatantEffect = moveCombatantEffect;

        projectile.effects.push(stunEffect);
        projectile.effects.push(nocollisionEffect);
        projectile.effects.push(moveEffect);
        
        state.projectiles.set(projectile.id, projectile);
    }
}
