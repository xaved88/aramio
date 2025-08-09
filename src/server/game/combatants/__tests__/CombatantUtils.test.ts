import { CombatantUtils, DamageSource } from '../CombatantUtils';
import { GameState } from '../../../schema/GameState';
import { Hero } from '../../../schema/Combatants';
import { RoundStats } from '../../../schema/Events';

describe('CombatantUtils', () => {
    let gameState: GameState;
    let hero: Hero;

    beforeEach(() => {
        gameState = new GameState();
        hero = new Hero();
        hero.id = 'test-hero';
        hero.type = 'hero';
        hero.team = 'blue';
        hero.health = 100;
        hero.maxHealth = 100;
        hero.attackRadius = 50;
        hero.attackStrength = 20;
        hero.attackSpeed = 1;
        hero.windUp = 0.5;
        hero.moveSpeed = 100;
        hero.bulletArmor = 0;
        hero.abilityArmor = 0;
        hero.attackReadyAt = 0;
        hero.lastAttackTime = 0;
        hero.size = 15;
        hero.controller = 'test-player';
        hero.experience = 0;
        hero.level = 1;
        hero.state = 'alive';
        hero.respawnTime = 0;
        hero.respawnDuration = 5000;
        hero.roundStats = new RoundStats();
        hero.roundStats.totalExperience = 0;
        hero.roundStats.minionKills = 0;
        hero.roundStats.heroKills = 0;
        hero.roundStats.turretKills = 0;
        hero.roundStats.damageTaken = 0;
        hero.roundStats.damageDealt = 0;
        
        gameState.combatants.set(hero.id, hero);
    });

    describe('armor damage reduction', () => {
        it('should apply no damage reduction with 0 armor', () => {
            hero.bulletArmor = 0;
            hero.abilityArmor = 0;

            CombatantUtils.damageCombatant(hero, 100, gameState, 'attacker-id', 'auto-attack');
            expect(hero.health).toBe(0); // 100 - 100 = 0

            hero.health = 100; // Reset for ability test
            CombatantUtils.damageCombatant(hero, 100, gameState, 'attacker-id', 'ability');
            expect(hero.health).toBe(0); // 100 - 100 = 0
        });

        it('should apply 33% damage reduction with 50 armor', () => {
            hero.bulletArmor = 50;
            hero.abilityArmor = 50;

            // Test bullet armor: 50 armor = 50/(50+100) = 1/3 reduction = 2/3 damage
            CombatantUtils.damageCombatant(hero, 100, gameState, 'attacker-id', 'auto-attack');
            expect(Math.round(hero.health)).toBe(33); // 100 - 66.67 ≈ 33

            hero.health = 100; // Reset for ability test
            CombatantUtils.damageCombatant(hero, 100, gameState, 'attacker-id', 'ability');
            expect(Math.round(hero.health)).toBe(33); // 100 - 66.67 ≈ 33
        });

        it('should apply 50% damage reduction with 100 armor', () => {
            hero.bulletArmor = 100;
            hero.abilityArmor = 100;

            // Test bullet armor: 100 armor = 100/(100+100) = 1/2 reduction = 1/2 damage
            CombatantUtils.damageCombatant(hero, 100, gameState, 'attacker-id', 'auto-attack');
            expect(hero.health).toBe(50); // 100 - 50 = 50

            hero.health = 100; // Reset for ability test
            CombatantUtils.damageCombatant(hero, 100, gameState, 'attacker-id', 'ability');
            expect(hero.health).toBe(50); // 100 - 50 = 50
        });

        it('should apply 66% damage reduction with 200 armor', () => {
            hero.bulletArmor = 200;
            hero.abilityArmor = 200;

            // Test bullet armor: 200 armor = 200/(200+100) = 2/3 reduction = 1/3 damage
            CombatantUtils.damageCombatant(hero, 100, gameState, 'attacker-id', 'auto-attack');
            expect(Math.round(hero.health)).toBe(67); // 100 - 33.33 ≈ 67

            hero.health = 100; // Reset for ability test
            CombatantUtils.damageCombatant(hero, 100, gameState, 'attacker-id', 'ability');
            expect(Math.round(hero.health)).toBe(67); // 100 - 33.33 ≈ 67
        });

        it('should amplify damage with negative armor', () => {
            hero.bulletArmor = -50;
            hero.abilityArmor = -50;

            // Test bullet armor: -50 armor = -50/(-50+100) = -1 reduction = 2x damage
            // Formula: damage * (1 - armor / (armor + 100))
            // damage * (1 - (-50) / (-50 + 100)) = damage * (1 - (-50) / 50) = damage * (1 + 1) = damage * 2
            CombatantUtils.damageCombatant(hero, 50, gameState, 'attacker-id', 'auto-attack');
            expect(hero.health).toBe(0); // 100 - 100 = 0 (50 * 2 = 100)

            hero.health = 100; // Reset for ability test
            CombatantUtils.damageCombatant(hero, 50, gameState, 'attacker-id', 'ability');
            expect(hero.health).toBe(0); // 100 - 100 = 0 (50 * 2 = 100)
        });

        it('should use correct armor type based on damage source', () => {
            hero.bulletArmor = 100; // 50% reduction
            hero.abilityArmor = 200; // 66% reduction

            // Auto-attack should use bullet armor (50% reduction)
            CombatantUtils.damageCombatant(hero, 100, gameState, 'attacker-id', 'auto-attack');
            expect(hero.health).toBe(50); // 100 - 50 = 50

            hero.health = 100; // Reset for ability test

            // Ability should use ability armor (66% reduction)
            CombatantUtils.damageCombatant(hero, 100, gameState, 'attacker-id', 'ability');
            expect(Math.round(hero.health)).toBe(67); // 100 - 33.33 ≈ 67
        });

        it('should default to auto-attack damage source when not specified', () => {
            hero.bulletArmor = 100; // 50% reduction
            hero.abilityArmor = 200; // 66% reduction

            // Should use bullet armor by default
            CombatantUtils.damageCombatant(hero, 100, gameState, 'attacker-id');
            expect(hero.health).toBe(50); // 100 - 50 = 50
        });

        it('should properly handle AOE damage as ability damage', () => {
            hero.bulletArmor = 100; // 50% reduction for auto-attacks
            hero.abilityArmor = 200; // 66% reduction for abilities

            // Simulate AOE damage (which should use 'ability' damage source)
            CombatantUtils.damageCombatant(hero, 100, gameState, 'pyromancer-id', 'ability');
            
            // Should use ability armor (66% reduction), so 100 * (1/3) = 33.33 damage
            expect(Math.round(hero.health)).toBe(67); // 100 - 33.33 ≈ 67
        });
    });
});
