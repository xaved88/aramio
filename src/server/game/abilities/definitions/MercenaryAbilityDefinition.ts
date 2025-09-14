import { MercenaryAbility } from '../../../schema/Abilities';
import { StatModEffect, NoCollisionEffect, HunterEffect } from '../../../schema/Effects';
import { AbilityDefinition } from './AbilityDefinition';
import { GAMEPLAY_CONFIG } from '../../../../GameConfig';
import { COMBATANT_EFFECT_TYPES } from '../../../../shared/types/CombatantTypes';

export class MercenaryAbilityDefinition implements AbilityDefinition<MercenaryAbility> {
    private static _instance: MercenaryAbilityDefinition | null = null;
    
    static get instance(): MercenaryAbilityDefinition {
        if (!MercenaryAbilityDefinition._instance) {
            MercenaryAbilityDefinition._instance = new MercenaryAbilityDefinition();
        }
        return MercenaryAbilityDefinition._instance;
    }

    create(): MercenaryAbility {
        const ability = new MercenaryAbility();
        
        const config = GAMEPLAY_CONFIG.COMBAT.ABILITIES.mercenary;
        
        ability.cooldown = config.COOLDOWN_MS;
        ability.lastUsedTime = 0;
        
        return ability;
    }

    onLevelUp(ability: MercenaryAbility): void {
        // No stat changes on level up - the level affects the effects when used
    }

    useAbility(ability: MercenaryAbility, heroId: string, x: number, y: number, state: any): boolean {
        const currentTime = state.gameTime;
        
        // If lastUsedTime is 0, the ability hasn't been used yet, so it's available
        if (ability.lastUsedTime === 0) {
            ability.lastUsedTime = currentTime;
            this.applyRageEffects(heroId, state, 1); // Level 1 for new hero
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
        
        this.applyRageEffects(heroId, state, hero.level);
        return true;
    }

    private applyRageEffects(heroId: string, state: any, heroLevel: number): void {
        const hero = state.combatants.get(heroId);
        if (!hero) return;

        const config = GAMEPLAY_CONFIG.COMBAT.ABILITIES.mercenary;
        const currentTime = state.gameTime; // Use game time instead of Date.now()
        
        // Calculate scaled values
        const attackBoost = config.ATTACK_BOOST_BASE + (config.ATTACK_BOOST_PER_LEVEL * (heroLevel - 1));
        const moveSpeedBoost = 1 + config.MOVE_SPEED_BOOST_BASE + (config.MOVE_SPEED_BOOST_PER_LEVEL * (heroLevel - 1));
        const duration = config.DURATION_MS + (config.DURATION_BOOST_PER_LEVEL_MS * (heroLevel - 1));

        // Attack strength boost (300% base + 10% per level)
        const attackStrengthEffect = new StatModEffect();
        attackStrengthEffect.type = COMBATANT_EFFECT_TYPES.STATMOD;
        attackStrengthEffect.stat = 'attackStrength';
        attackStrengthEffect.operator = 'percent';
        attackStrengthEffect.amount = attackBoost;
        attackStrengthEffect.duration = duration;
        attackStrengthEffect.appliedAt = currentTime;

        // Move speed boost (50% base + 5% per level)  
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
