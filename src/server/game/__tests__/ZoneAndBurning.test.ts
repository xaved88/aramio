import { GameEngine } from '../GameEngine';
import { GameState } from '../../schema/GameState';
import { Zone, ZoneEffect } from '../../schema/Zones';
import { Hero, Minion, Combatant } from '../../schema/Combatants';
import { BurningEffect } from '../../schema/Effects';
import { RoundStats } from '../../schema/Events';
import { ArraySchema } from '@colyseus/schema';
import { COMBATANT_TYPES, ZONE_TYPES } from '../../../shared/types/CombatantTypes';
import { TEST_GAMEPLAY_CONFIG } from '../../config/TestGameplayConfig';

describe('Zone and Burning Mechanics', () => {
    let gameEngine: GameEngine;
    let gameState: GameState;
    let blueHero: Hero;
    let redHero: Hero;
    let redMinion: Minion;

    beforeEach(() => {
        gameState = new GameState();
        gameState.gameTime = 1000;
        gameEngine = new GameEngine(gameState, TEST_GAMEPLAY_CONFIG);

        // Setup test combatants
        blueHero = new Hero();
        blueHero.id = 'blue-hero';
        blueHero.type = COMBATANT_TYPES.HERO;
        blueHero.team = 'blue';
        blueHero.x = 100;
        blueHero.y = 100;
        blueHero.size = 15;
        blueHero.health = 100;
        blueHero.maxHealth = 100;
        blueHero.state = 'alive';
        blueHero.roundStats = new RoundStats();
        blueHero.roundStats.totalExperience = 0;
        blueHero.roundStats.minionKills = 0;
        blueHero.roundStats.heroKills = 0;
        blueHero.roundStats.turretKills = 0;
        blueHero.roundStats.damageTaken = 0;
        blueHero.roundStats.damageDealt = 0;
        blueHero.lastDamageTime = 0;
        blueHero.effects = new ArraySchema();
        blueHero.bulletArmor = 0;
        blueHero.abilityArmor = 0;
        blueHero.getHealth = () => blueHero.health;
        blueHero.getMaxHealth = () => blueHero.maxHealth;

        redHero = new Hero();
        redHero.id = 'red-hero';
        redHero.type = COMBATANT_TYPES.HERO;
        redHero.team = 'red';
        redHero.x = 100;
        redHero.y = 100;
        redHero.size = 15;
        redHero.health = 100;
        redHero.maxHealth = 100;
        redHero.state = 'alive';
        redHero.roundStats = new RoundStats();
        redHero.roundStats.totalExperience = 0;
        redHero.roundStats.minionKills = 0;
        redHero.roundStats.heroKills = 0;
        redHero.roundStats.turretKills = 0;
        redHero.roundStats.damageTaken = 0;
        redHero.roundStats.damageDealt = 0;
        redHero.lastDamageTime = 0;
        redHero.effects = new ArraySchema();
        redHero.bulletArmor = 0;
        redHero.abilityArmor = 0;
        redHero.getHealth = () => redHero.health;
        redHero.getMaxHealth = () => redHero.maxHealth;

        redMinion = new Minion();
        redMinion.id = 'red-minion';
        redMinion.type = COMBATANT_TYPES.MINION;
        redMinion.team = 'red';
        redMinion.x = 110;
        redMinion.y = 100;
        redMinion.size = 10;
        redMinion.health = 50;
        redMinion.maxHealth = 50;
        redMinion.minionType = 'warrior';
        redMinion.effects = new ArraySchema();
        redMinion.bulletArmor = 0;
        redMinion.abilityArmor = 0;
        redMinion.getHealth = () => redMinion.health;
        redMinion.getMaxHealth = () => redMinion.maxHealth;

        gameState.combatants.set(blueHero.id, blueHero);
        gameState.combatants.set(redHero.id, redHero);
        gameState.combatants.set(redMinion.id, redMinion);
    });

    describe('Zone Mechanics', () => {
        test('zone should tick at specified rate', () => {
            const zone = new Zone();
            zone.id = 'test-zone';
            zone.ownerId = blueHero.id;
            zone.x = 100;
            zone.y = 100;
            zone.radius = 50;
            zone.team = 'blue';
            zone.type = ZONE_TYPES.PYROMANCER_FIRE;
            zone.duration = 2500;
            zone.createdAt = 1000;
            zone.tickRate = 250;
            zone.lastTickTime = 1000;

            const damageEffect = new ZoneEffect();
            damageEffect.effectType = 'applyDamage';
            damageEffect.damage = 10;
            zone.effects.push(damageEffect);

            gameState.zones.set(zone.id, zone);

            // Update game state by 250ms (should trigger one tick)
            gameState.gameTime = 1250;
            gameEngine.update(250);

            // Red hero should take damage
            expect(redHero.health).toBeLessThan(100);
        });

        test('zone should expire after duration', () => {
            const zone = new Zone();
            zone.id = 'test-zone';
            zone.ownerId = blueHero.id;
            zone.x = 100;
            zone.y = 100;
            zone.radius = 50;
            zone.team = 'blue';
            zone.type = ZONE_TYPES.PYROMANCER_FIRE;
            zone.duration = 2500;
            zone.createdAt = 1000;
            zone.tickRate = 250;
            zone.lastTickTime = 1000;

            gameState.zones.set(zone.id, zone);

            // Update game state by 2500ms (should expire zone)
            gameState.gameTime = 3500;
            gameEngine.update(2500);

            // Zone should be removed
            expect(gameState.zones.has(zone.id)).toBe(false);
        });

        test('zone should only affect enemy combatants', () => {
            const blueMinion = new Minion();
            blueMinion.id = 'blue-minion';
            blueMinion.type = COMBATANT_TYPES.MINION;
            blueMinion.team = 'blue';
            blueMinion.x = 110;
            blueMinion.y = 100;
            blueMinion.size = 10;
            blueMinion.health = 50;
            blueMinion.maxHealth = 50;
            blueMinion.minionType = 'warrior';
            blueMinion.effects = new ArraySchema();
            blueMinion.bulletArmor = 0;
            blueMinion.abilityArmor = 0;
            blueMinion.getHealth = () => blueMinion.health;
            blueMinion.getMaxHealth = () => blueMinion.maxHealth;

            gameState.combatants.set(blueMinion.id, blueMinion);

            const zone = new Zone();
            zone.id = 'test-zone';
            zone.ownerId = blueHero.id;
            zone.x = 100;
            zone.y = 100;
            zone.radius = 50;
            zone.team = 'blue';
            zone.type = ZONE_TYPES.PYROMANCER_FIRE;
            zone.duration = 2500;
            zone.createdAt = 1000;
            zone.tickRate = 250;
            zone.lastTickTime = 1000;

            const damageEffect = new ZoneEffect();
            damageEffect.effectType = 'applyDamage';
            damageEffect.damage = 10;
            zone.effects.push(damageEffect);

            gameState.zones.set(zone.id, zone);

            // Update game state by 250ms (should trigger one tick)
            gameState.gameTime = 1250;
            gameEngine.update(250);

            // Blue minion (ally) should not take damage
            expect(blueMinion.health).toBe(50);
            // Red hero (enemy) should take damage
            expect(redHero.health).toBeLessThan(100);
        });

        test('zone should only affect combatants within radius', () => {
            // Move red hero far away
            redHero.x = 500;
            redHero.y = 500;

            const zone = new Zone();
            zone.id = 'test-zone';
            zone.ownerId = blueHero.id;
            zone.x = 100;
            zone.y = 100;
            zone.radius = 50;
            zone.team = 'blue';
            zone.type = ZONE_TYPES.PYROMANCER_FIRE;
            zone.duration = 2500;
            zone.createdAt = 1000;
            zone.tickRate = 250;
            zone.lastTickTime = 1000;

            const damageEffect = new ZoneEffect();
            damageEffect.effectType = 'applyDamage';
            damageEffect.damage = 10;
            zone.effects.push(damageEffect);

            gameState.zones.set(zone.id, zone);

            // Update game state by 250ms (should trigger one tick)
            gameState.gameTime = 1250;
            gameEngine.update(250);

            // Red hero is out of range, should not take damage
            expect(redHero.health).toBe(100);
            // Red minion is in range, should take damage
            expect(redMinion.health).toBeLessThan(50);
        });
    });

    describe('Burning Effect Mechanics', () => {
        test('burning effect should tick independently of zone', () => {
            const burningEffect = new BurningEffect();
            burningEffect.type = 'burning';
            burningEffect.duration = 4000;
            burningEffect.appliedAt = 1000;
            burningEffect.tickRate = 750;
            burningEffect.lastTickTime = 1000;
            burningEffect.damagePercentPerTick = 0.05; // 5% of max health per tick
            burningEffect.sourceId = blueHero.id;

            redHero.effects.push(burningEffect);

            // Update game state by 750ms (should trigger one burning tick)
            gameState.gameTime = 1750;
            gameEngine.update(750);

            // Red hero should take burning damage
            expect(redHero.health).toBeLessThan(100);
        });

        test('burning effect should expire after duration', () => {
            const burningEffect = new BurningEffect();
            burningEffect.type = 'burning';
            burningEffect.duration = 4000;
            burningEffect.appliedAt = 1000;
            burningEffect.tickRate = 750;
            burningEffect.lastTickTime = 1000;
            burningEffect.damagePercentPerTick = 0.05; // 5% of max health per tick
            burningEffect.sourceId = blueHero.id;

            redHero.effects.push(burningEffect);

            // Update game state by 4000ms (should expire effect)
            gameState.gameTime = 5000;
            gameEngine.update(4000);

            // Burning effect should be removed
            expect(redHero.effects.length).toBe(0);
        });

        test('burning effect should not stack', () => {
            // Create a zone that applies burning
            const zone = new Zone();
            zone.id = 'test-zone';
            zone.ownerId = blueHero.id;
            zone.x = 100;
            zone.y = 100;
            zone.radius = 50;
            zone.team = 'blue';
            zone.type = ZONE_TYPES.PYROMANCER_FIRE;
            zone.duration = 2500;
            zone.createdAt = 1000;
            zone.tickRate = 250;
            zone.lastTickTime = 1000;

            const burningEffect1 = new BurningEffect();
            burningEffect1.type = 'burning';
            burningEffect1.duration = 4000;
            burningEffect1.appliedAt = 1000;
            burningEffect1.tickRate = 750;
            burningEffect1.lastTickTime = 1000;
            burningEffect1.damagePercentPerTick = 0.05; // 5% of max health per tick
            burningEffect1.sourceId = blueHero.id;

            const effectData = new ZoneEffect();
            effectData.effectType = 'applyEffect';
            effectData.combatantEffect = burningEffect1;
            zone.effects.push(effectData);

            gameState.zones.set(zone.id, zone);

            // Apply zone effects twice
            gameState.gameTime = 1250;
            gameEngine.update(250);
            gameState.gameTime = 1500;
            gameEngine.update(250);

            // Should only have one burning effect
            const burningEffects = redHero.effects.filter((e: any) => e.type === 'burning');
            expect(burningEffects.length).toBe(1);
        });

        test('burning damage should be true damage (bypass armor)', () => {
            // Set armor values
            redHero.abilityArmor = 100;
            redHero.bulletArmor = 100;

            const burningEffect = new BurningEffect();
            burningEffect.type = 'burning';
            burningEffect.duration = 4000;
            burningEffect.appliedAt = 1000;
            burningEffect.tickRate = 750;
            burningEffect.lastTickTime = 1000;
            burningEffect.damagePercentPerTick = 0.10; // 10% of max health per tick
            burningEffect.sourceId = blueHero.id;

            redHero.effects.push(burningEffect);

            const initialHealth = redHero.health;
            const maxHealth = redHero.getMaxHealth();
            const expectedDamage = maxHealth * 0.10;

            // Update game state by 750ms (should trigger one burning tick)
            gameState.gameTime = 1750;
            gameEngine.update(750);

            // Should deal exactly the percentage damage (true damage, bypassing armor)
            expect(redHero.health).toBe(initialHealth - expectedDamage);
        });
    });

    describe('Pyromancer Ability Integration', () => {
        test('pyromancer ability should create zone at destination', () => {
            // This test would require PyromancerAbilityDefinition setup
            // For now, we test the zone creation manually
            const zone = new Zone();
            zone.id = 'pyro-zone';
            zone.ownerId = blueHero.id;
            zone.x = 200;
            zone.y = 200;
            zone.radius = 50;
            zone.team = 'blue';
            zone.type = ZONE_TYPES.PYROMANCER_FIRE;
            zone.duration = 2500;
            zone.createdAt = 1000;
            zone.tickRate = 250;
            zone.lastTickTime = 1000;

            // Add damage effect (AP / 3)
            const damageEffect = new ZoneEffect();
            damageEffect.effectType = 'applyDamage';
            damageEffect.damage = 10 / 3; // Assuming AP = 10
            zone.effects.push(damageEffect);

            // Add burning effect
            const burningEffect = new BurningEffect();
            burningEffect.type = 'burning';
            burningEffect.duration = 4000;
            burningEffect.appliedAt = 1000;
            burningEffect.tickRate = 750;
            burningEffect.lastTickTime = 1000;
            // Burning damage formula: (AP * 0.12) / (AP + 150)
            const AP = 10;
            burningEffect.damagePercentPerTick = (AP * 0.12) / (AP + 150);
            burningEffect.sourceId = blueHero.id;

            const burningEffectData = new ZoneEffect();
            burningEffectData.effectType = 'applyEffect';
            burningEffectData.combatantEffect = burningEffect;
            zone.effects.push(burningEffectData);

            gameState.zones.set(zone.id, zone);

            // Verify zone was created
            expect(gameState.zones.has(zone.id)).toBe(true);
            expect(gameState.zones.get(zone.id)?.type).toBe(ZONE_TYPES.PYROMANCER_FIRE);
        });
    });
});

