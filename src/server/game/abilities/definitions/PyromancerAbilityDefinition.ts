import { PyromancerAbility } from '../../../schema/Abilities';
import { AbilityDefinition } from './AbilityDefinition';
import { Projectile, ProjectileEffect } from '../../../schema/Projectiles';
import { Hero } from '../../../schema/Combatants';
import { GameplayConfig } from '../../../config/ConfigProvider';
import { BurningEffect } from '../../../schema/Effects';

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
        ability.strengthRatio = config.STRENGTH_RATIO;
        ability.radius = config.RADIUS;
        ability.range = config.RANGE;
        ability.fireballRadius = config.RADIUS; // Initialize reward-modifiable radius
        ability.speed = config.SPEED;
        
        return ability;
    }

    onLevelUp(ability: PyromancerAbility, gameplayConfig: GameplayConfig): void {
        // No stat changes on level up - radius now improved through rewards
    }

    useAbility(ability: PyromancerAbility, heroId: string, x: number, y: number, state: any, gameplayConfig: GameplayConfig): boolean {
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
        
        // Use ability speed
        const speed = hero.getAbilitySpeed();
        
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
        const maxTravelTime = hero.getAbilityRange() / speed * 1000; // Convert to milliseconds
        projectile.duration = maxTravelTime * 2; // Double the expected time as safety margin
        projectile.createdAt = state.gameTime;
        projectile.targetX = targetX;
        projectile.targetY = targetY;
        
        // Calculate damage values
        const abilityPower = hero.getAbilityPower();
        const zoneDamage = this.calculateZoneDamage(abilityPower);
        const burningDamagePercent = this.calculateBurningDamagePercent(abilityPower);
        
        // Add zone data to projectile
        (projectile as any).zoneData = {
            radius: hero.getPyromancerRadius(),
            type: 'pyromancer_fire',
            duration: 2500, // 2.5 seconds
            tickRate: 250, // 0.25 seconds
            effects: [
                {
                    effectType: 'applyDamage',
                    damage: zoneDamage
                },
                {
                    effectType: 'applyEffect',
                    combatantEffect: this.createBurningEffect(burningDamagePercent, state.gameTime, heroId)
                }
            ]
        };
        
        state.projectiles.set(projectile.id, projectile);
    }
    
    /**
     * Calculates zone damage per tick: AP / 3
     */
    private calculateZoneDamage(abilityPower: number): number {
        return abilityPower / 3;
    }
    
    /**
     * Calculates burning damage percent per tick based on AP
     * Formula: (AP * 0.12) / (AP + 150)
     * Results: 10 AP = 0.75% per tick (3.75% total), 50 AP = 3% per tick (15% total), 100 AP = 4.8% per tick (24% total)
     */
    private calculateBurningDamagePercent(abilityPower: number): number {
        return (abilityPower * 0.12) / (abilityPower + 150);
    }
    
    /**
     * Creates a burning effect
     */
    private createBurningEffect(damagePercentPerTick: number, currentTime: number, sourceId: string): BurningEffect {
        const burningEffect = new BurningEffect();
        burningEffect.type = 'burning';
        burningEffect.duration = 4000; // 4 seconds
        burningEffect.appliedAt = currentTime;
        burningEffect.tickRate = 750; // 0.75 seconds
        burningEffect.lastTickTime = currentTime;
        burningEffect.damagePercentPerTick = damagePercentPerTick;
        burningEffect.sourceId = sourceId;
        return burningEffect;
    }
}
