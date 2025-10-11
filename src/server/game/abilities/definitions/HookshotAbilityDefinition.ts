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
        ability.strengthRatio = config.STRENGTH_RATIO;
        ability.range = config.RANGE;
        ability.duration = config.STUN_DURATION_MS;
        ability.speed = config.SPEED;
        
        return ability;
    }

    onLevelUp(ability: HookshotAbility, gameplayConfig: GameplayConfig): void {
    }

    useAbility(ability: HookshotAbility, heroId: string, x: number, y: number, state: any, gameplayConfig: GameplayConfig): boolean {
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
        
        // Use ability speed
        const speed = (hero as Hero).getAbilitySpeed();
        
        // Use flat duration (no level scaling)
        const stunDuration = (hero as Hero).getAbilityDuration();
        
        // Create projectile
        const projectile = new Projectile();
        projectile.id = `projectile_${state.gameTime}_${Math.random()}`;
        projectile.ownerId = hero.id;
        projectile.x = hero.x;
        projectile.y = hero.y;
        projectile.directionX = directionX;
        projectile.directionY = directionY;
        projectile.speed = speed;
        projectile.team = hero.team;
        projectile.type = 'hook';
        projectile.duration = -1; // Infinite duration - use range-based removal
        projectile.startX = hero.x; // Track starting position for range calculation
        projectile.startY = hero.y; // Track starting position for range calculation
        projectile.range = (hero as Hero).getAbilityRange(); // Set range for range-based removal
        projectile.createdAt = state.gameTime;
        
        // Add applyDamage effect
        const damageEffect = new ProjectileEffect();
        damageEffect.effectType = 'applyDamage';
        damageEffect.damage = (hero as Hero).getAbilityStrength();
        projectile.effects.push(damageEffect);
        
        // Create stun effect
        const stunEffect = new ProjectileEffect();
        stunEffect.effectType = 'applyEffect';
        stunEffect.combatantEffect = new StunEffect();
        stunEffect.combatantEffect.type = 'stun';
        stunEffect.combatantEffect.duration = stunDuration;
        stunEffect.combatantEffect.appliedAt = state.gameTime;

        // Create nocollision effect
        const nocollisionEffect = new ProjectileEffect();
        nocollisionEffect.effectType = 'applyEffect';
        nocollisionEffect.combatantEffect = new NoCollisionEffect();
        nocollisionEffect.combatantEffect.type = 'nocollision';
        // Calculate duration based on range and speed (with safety margin)
        const maxTravelTime = (hero as Hero).getAbilityRange() / speed * 1000; // Convert to milliseconds
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
        moveCombatantEffect.moveSpeed = speed * 1.5; // 50% faster than projectile speed
        moveCombatantEffect.appliedAt = state.gameTime;
        moveEffect.combatantEffect = moveCombatantEffect;

        projectile.effects.push(stunEffect);
        projectile.effects.push(nocollisionEffect);
        projectile.effects.push(moveEffect);
        
        state.projectiles.set(projectile.id, projectile);
    }
}
