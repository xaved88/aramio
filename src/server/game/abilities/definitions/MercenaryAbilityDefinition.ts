import { MercenaryAbility } from '../../../schema/Abilities';
import { StatModEffect, NoCollisionEffect, HunterEffect } from '../../../schema/Effects';
import { AbilityDefinition } from './AbilityDefinition';
import { GameplayConfig } from '../../../config/ConfigProvider';
import { COMBATANT_EFFECT_TYPES } from '../../../../shared/types/CombatantTypes';

export class MercenaryAbilityDefinition implements AbilityDefinition<MercenaryAbility> {
    private static _instance: MercenaryAbilityDefinition | null = null;
    
    static get instance(): MercenaryAbilityDefinition {
        if (!MercenaryAbilityDefinition._instance) {
            MercenaryAbilityDefinition._instance = new MercenaryAbilityDefinition();
        }
        return MercenaryAbilityDefinition._instance;
    }

    create(gameplayConfig: GameplayConfig): MercenaryAbility {
        const ability = new MercenaryAbility();
        
        const config = gameplayConfig.COMBAT.ABILITIES.mercenary;
        
        ability.cooldown = config.COOLDOWN_MS;
        ability.lastUsedTime = 0;
        ability.duration = config.DURATION_MS;
        ability.mercenaryRageSpeedBoost = 1.0; // Initialize rage speed boost multiplier
        
        return ability;
    }

    onLevelUp(ability: MercenaryAbility, gameplayConfig: GameplayConfig): void {
        // No stat changes on level up - the level affects the effects when used
    }

    useAbility(ability: MercenaryAbility, heroId: string, x: number, y: number, state: any, gameplayConfig: GameplayConfig): boolean {
        const currentTime = state.gameTime;
        
        // If lastUsedTime is 0, the ability hasn't been used yet, so it's available
        if (ability.lastUsedTime === 0) {
            ability.lastUsedTime = currentTime;
            this.applyRageEffects(ability, heroId, state, 1, gameplayConfig); // Level 1 for new hero
            return true;
        }
        
        const timeSinceLastUse = currentTime - ability.lastUsedTime;
  
        if (timeSinceLastUse < ability.cooldown) {
            return false; // Ability is on cooldown
        }

        ability.lastUsedTime = currentTime;
        
        // Find hero level for scaling
        const hero = state.combatants.get(heroId);
        if (!hero) return false;
        
        this.applyRageEffects(ability, heroId, state, hero.level, gameplayConfig);
        return true;
    }

    private applyRageEffects(ability: MercenaryAbility, heroId: string, state: any, heroLevel: number, gameplayConfig: GameplayConfig): void {
        const hero = state.combatants.get(heroId);
        if (!hero) return;

        const config = gameplayConfig.COMBAT.ABILITIES.mercenary;
        const currentTime = state.gameTime; // Use game time instead of Date.now()
        
        // Calculate ability values
        const attackBoost = config.ATTACK_BOOST_BASE; // Fixed attack boost (no level scaling)
        const baseMoveSpeedBoost = 1 + config.MOVE_SPEED_BOOST_BASE; // Fixed move speed boost (no level scaling)
        const rageSpeedMultiplier = ability.mercenaryRageSpeedBoost || 1.0; // Get reward-based speed boost from ability
        const moveSpeedBoost = baseMoveSpeedBoost * rageSpeedMultiplier; // Apply reward multiplier
        const duration = ability.duration; // Use flat duration (no level scaling)

        // Attack strength boost (600% base, no level scaling)
        const attackStrengthEffect = new StatModEffect();
        attackStrengthEffect.type = COMBATANT_EFFECT_TYPES.STATMOD;
        attackStrengthEffect.stat = 'attackStrength';
        attackStrengthEffect.operator = 'percent';
        attackStrengthEffect.amount = attackBoost;
        attackStrengthEffect.duration = duration;
        attackStrengthEffect.appliedAt = currentTime;

        // Move speed boost
        const moveSpeedEffect = new StatModEffect();
        moveSpeedEffect.type = COMBATANT_EFFECT_TYPES.STATMOD;
        moveSpeedEffect.stat = 'moveSpeed';
        moveSpeedEffect.operator = 'percent';
        moveSpeedEffect.amount = moveSpeedBoost;
        moveSpeedEffect.duration = duration;
        moveSpeedEffect.appliedAt = currentTime;

        // Attack radius reduction to 35
        const attackRadiusEffect = new StatModEffect();
        attackRadiusEffect.type = COMBATANT_EFFECT_TYPES.STATMOD;
        attackRadiusEffect.stat = 'attackRadius';
        attackRadiusEffect.operator = 'absolute';
        attackRadiusEffect.amount = config.RAGE_ATTACK_RADIUS;
        attackRadiusEffect.duration = duration;
        attackRadiusEffect.appliedAt = currentTime;

        // Wind-up reduction to 0.1
        const windUpEffect = new StatModEffect();
        windUpEffect.type = COMBATANT_EFFECT_TYPES.STATMOD;
        windUpEffect.stat = 'windUp';
        windUpEffect.operator = 'absolute';
        windUpEffect.amount = config.RAGE_WIND_UP;
        windUpEffect.duration = duration;
        windUpEffect.appliedAt = currentTime;

        // No collision effect
        const noCollisionEffect = new NoCollisionEffect();
        noCollisionEffect.type = COMBATANT_EFFECT_TYPES.NOCOLLISION;
        noCollisionEffect.duration = duration;
        noCollisionEffect.appliedAt = currentTime;

        // Hunter effect (ignore minions when targeting)
        const hunterEffect = new HunterEffect();
        hunterEffect.type = COMBATANT_EFFECT_TYPES.HUNTER;
        hunterEffect.duration = duration;
        hunterEffect.appliedAt = currentTime;

        // Bullet armor boost
        const bulletArmorEffect = new StatModEffect();
        bulletArmorEffect.type = COMBATANT_EFFECT_TYPES.STATMOD;
        bulletArmorEffect.stat = 'bulletArmor';
        bulletArmorEffect.operator = 'relative';
        bulletArmorEffect.amount = config.RAGE_BULLET_ARMOR;
        bulletArmorEffect.duration = duration;
        bulletArmorEffect.appliedAt = currentTime;

        // Ability armor boost
        const abilityArmorEffect = new StatModEffect();
        abilityArmorEffect.type = COMBATANT_EFFECT_TYPES.STATMOD;
        abilityArmorEffect.stat = 'abilityArmor';
        abilityArmorEffect.operator = 'relative';
        abilityArmorEffect.amount = config.RAGE_ABILITY_ARMOR;
        abilityArmorEffect.duration = duration;
        abilityArmorEffect.appliedAt = currentTime;

        // Apply all effects
        hero.effects.push(attackStrengthEffect);
        hero.effects.push(moveSpeedEffect);
        hero.effects.push(attackRadiusEffect);
        hero.effects.push(windUpEffect);
        hero.effects.push(noCollisionEffect);
        hero.effects.push(hunterEffect);
        hero.effects.push(bulletArmorEffect);
        hero.effects.push(abilityArmorEffect);
    }
}
