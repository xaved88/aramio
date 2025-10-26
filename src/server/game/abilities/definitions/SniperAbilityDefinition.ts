import { SniperAbility } from '../../../schema/Abilities';
import { Projectile, ProjectileEffect } from '../../../schema/Projectiles';
import { Hero } from '../../../schema/Combatants';
import { AbilityDefinition } from './AbilityDefinition';
import { GameplayConfig } from '../../../config/ConfigProvider';
import { MoveEffect, NoCollisionEffect } from '../../../schema/Effects';
import { COMBATANT_EFFECT_TYPES } from '../../../../shared/types/CombatantTypes';

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
        ability.strengthRatio = config.STRENGTH_RATIO;
        ability.range = config.RANGE;
        ability.speed = config.SPEED;
        
        return ability;
    }

    onLevelUp(ability: SniperAbility, gameplayConfig: GameplayConfig): void {
    }

    useAbility(ability: SniperAbility, heroId: string, x: number, y: number, state: any, gameplayConfig: GameplayConfig): boolean {
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
        projectile.speed = hero.getAbilitySpeed();
        projectile.team = hero.team;
        projectile.type = 'sniper';
        projectile.duration = -1; // Infinite duration
        projectile.range = hero.getAbilityRange(); // Set range for range-based removal
        projectile.createdAt = state.gameTime;
        
        // Add applyDamage effect
        const damageEffect = new ProjectileEffect();
        damageEffect.effectType = 'applyDamage';
        damageEffect.damage = hero.getAbilityStrength();
        projectile.effects.push(damageEffect);
        
        // Apply recoil effect - move backwards from shot direction
        this.applyRecoilEffect(hero, directionX, directionY, state, gameplayConfig);
        
        state.projectiles.set(projectile.id, projectile);
    }

    private applyRecoilEffect(hero: Hero, shotDirectionX: number, shotDirectionY: number, state: any, gameplayConfig: GameplayConfig): void {
        const config = gameplayConfig.COMBAT.ABILITIES.sniper;
        const currentTime = state.gameTime;
        
        // Calculate recoil direction (opposite of shot direction)
        const recoilDirectionX = -shotDirectionX;
        const recoilDirectionY = -shotDirectionY;
        
        // Calculate recoil target position
        const recoilTargetX = hero.x + recoilDirectionX * config.RECOIL_DISTANCE;
        const recoilTargetY = hero.y + recoilDirectionY * config.RECOIL_DISTANCE;
        
        // Create recoil movement effect
        const moveEffect = new MoveEffect();
        moveEffect.type = COMBATANT_EFFECT_TYPES.MOVE;
        moveEffect.moveTargetX = recoilTargetX;
        moveEffect.moveTargetY = recoilTargetY;
        moveEffect.moveSpeed = config.RECOIL_SPEED;
        moveEffect.duration = this.calculateRecoilDuration(hero.x, hero.y, recoilTargetX, recoilTargetY, config.RECOIL_SPEED);
        moveEffect.appliedAt = currentTime;

        // Create no collision effect for the recoil (like thorndive)
        const noCollisionEffect = new NoCollisionEffect();
        noCollisionEffect.type = COMBATANT_EFFECT_TYPES.NOCOLLISION;
        noCollisionEffect.duration = moveEffect.duration;
        noCollisionEffect.appliedAt = currentTime;

        // Apply recoil effects
        hero.effects.push(moveEffect);
        hero.effects.push(noCollisionEffect);
    }

    private calculateRecoilDuration(startX: number, startY: number, targetX: number, targetY: number, speed: number): number {
        const distance = Math.sqrt(Math.pow(targetX - startX, 2) + Math.pow(targetY - startY, 2));
        return (distance / speed) * 1000; // Convert to milliseconds
    }
}
