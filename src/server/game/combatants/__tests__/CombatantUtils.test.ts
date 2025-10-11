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
        hero.lastDamageTime = 0;
        
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

    describe('reflect effect', () => {
        let attacker: Hero;

        beforeEach(() => {
            attacker = new Hero();
            attacker.id = 'attacker-hero';
            attacker.type = 'hero';
            attacker.team = 'red';
            attacker.health = 100;
            attacker.maxHealth = 100;
            attacker.attackRadius = 50;
            attacker.attackStrength = 20;
            attacker.attackSpeed = 1;
            attacker.windUp = 0.5;
            attacker.moveSpeed = 100;
            attacker.bulletArmor = 0;
            attacker.abilityArmor = 0;
            attacker.attackReadyAt = 0;
            attacker.lastAttackTime = 0;
            attacker.size = 15;
            attacker.controller = 'test-attacker';
            attacker.experience = 0;
            attacker.level = 1;
            attacker.state = 'alive';
            attacker.respawnTime = 0;
            attacker.respawnDuration = 5000;
            attacker.roundStats = new RoundStats();
            attacker.roundStats.totalExperience = 0;
            attacker.roundStats.minionKills = 0;
            attacker.roundStats.heroKills = 0;
            attacker.roundStats.turretKills = 0;
            attacker.roundStats.damageTaken = 0;
            attacker.roundStats.damageDealt = 0;

            gameState.combatants.set(attacker.id, attacker);
        });

        it('should reflect damage back to the attacker', () => {
            // Add reflect effect to hero
            const reflectEffect = {
                type: 'reflect',
                reflectPercentage: 50, // 50% reflect
                duration: 3000,
                appliedAt: 0
            } as any;
            hero.effects.push(reflectEffect);

            // Attacker deals 60 damage to hero
            CombatantUtils.damageCombatant(hero, 60, gameState, attacker.id, 'auto-attack');

            // Hero should take 60 damage (no armor)
            expect(hero.health).toBe(40); // 100 - 60 = 40

            // Attacker should take reflect damage: 60 * 50% = 30
            expect(attacker.health).toBe(70); // 100 - 30 = 70
        });

        it('should not create infinite reflect loops', () => {
            // Add reflect effect to both combatants
            const reflectEffect1 = {
                type: 'reflect',
                reflectPercentage: 100, // 100% reflect
                duration: 3000,
                appliedAt: 0
            } as any;
            const reflectEffect2 = {
                type: 'reflect',
                reflectPercentage: 100, // 100% reflect
                duration: 3000,
                appliedAt: 0
            } as any;

            hero.effects.push(reflectEffect1);
            attacker.effects.push(reflectEffect2);

            // Attacker deals 50 damage to hero
            CombatantUtils.damageCombatant(hero, 50, gameState, attacker.id, 'auto-attack');

            // Hero should take 50 damage and reflect 50 back
            expect(hero.health).toBe(50); // 100 - 50 = 50
            
            // Attacker should take 50 reflect damage but NOT reflect it back
            expect(attacker.health).toBe(50); // 100 - 50 = 50
        });

        it('should reflect original damage before armor mitigation', () => {
            // Give hero 100 armor (50% damage reduction)
            hero.bulletArmor = 100;
            
            // Add reflect effect to hero
            const reflectEffect = {
                type: 'reflect',
                reflectPercentage: 100, // 100% reflect
                duration: 3000,
                appliedAt: 0
            } as any;
            hero.effects.push(reflectEffect);

            // Attacker deals 100 damage to hero
            CombatantUtils.damageCombatant(hero, 100, gameState, attacker.id, 'auto-attack');

            // Hero should take only 50 damage due to 50% armor reduction
            expect(hero.health).toBe(50); // 100 - 50 = 50

            // Attacker should take reflect damage based on ORIGINAL damage (100), not reduced damage (50)
            // So reflect should be 100 * 100% = 100
            expect(attacker.health).toBe(0); // 100 - 100 = 0
        });

        it('should only reflect auto-attack damage, not ability damage', () => {
            // Add reflect effect to hero
            const reflectEffect = {
                type: 'reflect',
                reflectPercentage: 100, // 100% reflect
                duration: 3000,
                appliedAt: 0
            } as any;
            hero.effects.push(reflectEffect);

            // Attacker deals ability damage to hero
            CombatantUtils.damageCombatant(hero, 60, gameState, attacker.id, 'ability');

            // Hero should take 60 damage
            expect(hero.health).toBe(40); // 100 - 60 = 40

            // Attacker should NOT take reflect damage from ability damage
            expect(attacker.health).toBe(100); // No reflect damage
        });
    });
});
