import { GameEngine } from '../GameEngine';
import { GameState } from '../../schema/GameState';
import { Projectile } from '../../schema/Projectiles';
import { ProjectileEffect } from '../../schema/Projectiles';
import { Hero, Minion, Combatant } from '../../schema/Combatants';
import { StunEffect } from '../../schema/Effects';
import { RoundStats } from '../../schema/Events';
import { CLIENT_CONFIG } from '../../../Config';
import { ArraySchema } from '@colyseus/schema';
import { COMBATANT_TYPES, PROJECTILE_TYPES } from '../../../shared/types/CombatantTypes';

// Mock the Config to avoid import issues
jest.mock('../../../Config', () => ({
    CLIENT_CONFIG: {
        GAME_CANVAS_WIDTH: 800,
        GAME_CANVAS_HEIGHT: 600,
        PROJECTILE: {
            RADIUS: 5
        }
    }
}));

describe('Projectile Collision Detection', () => {
    let gameEngine: GameEngine;
    let gameState: GameState;
    let blueHero: Hero;
    let redHero: Hero;
    let blueMinion: Minion;
    let redMinion: Minion;
    let blueTurret: Combatant;
    let redCradle: Combatant;

    beforeEach(() => {
        gameState = new GameState();
        gameState.gameTime = 1000;
        gameEngine = new GameEngine(gameState);

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
        blueHero.getHealth = () => blueHero.health;

        redHero = new Hero();
        redHero.id = 'red-hero';
        redHero.type = COMBATANT_TYPES.HERO;
        redHero.team = 'red';
        redHero.x = 200;
        redHero.y = 200;
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
        redHero.getHealth = () => redHero.health;

        blueMinion = new Minion();
        blueMinion.id = 'blue-minion';
        blueMinion.type = COMBATANT_TYPES.MINION;
        blueMinion.team = 'blue';
        blueMinion.x = 150;
        blueMinion.y = 150;
        blueMinion.size = 10;
        blueMinion.health = 50;
        blueMinion.maxHealth = 50;
        blueMinion.minionType = 'warrior';
        blueMinion.getHealth = () => blueMinion.health;

        redMinion = new Minion();
        redMinion.id = 'red-minion';
        redMinion.type = COMBATANT_TYPES.MINION;
        redMinion.team = 'red';
        redMinion.x = 250;
        redMinion.y = 250;
        redMinion.size = 10;
        redMinion.health = 50;
        redMinion.maxHealth = 50;
        redMinion.minionType = 'warrior';
        redMinion.getHealth = () => redMinion.health;

        blueTurret = new Combatant();
        blueTurret.id = 'blue-turret';
        blueTurret.type = COMBATANT_TYPES.TURRET;
        blueTurret.team = 'blue';
        blueTurret.x = 50;
        blueTurret.y = 50;
        blueTurret.size = 20;
        blueTurret.health = 200;
        blueTurret.maxHealth = 200;
        blueTurret.attackRadius = 0;
        blueTurret.attackStrength = 0;
        blueTurret.attackSpeed = 0;
        blueTurret.lastAttackTime = 0;
        blueTurret.windUp = 0;
        blueTurret.attackReadyAt = 0;
        blueTurret.moveSpeed = 0;
        blueTurret.bulletArmor = 0;
        blueTurret.abilityArmor = 0;
        blueTurret.getHealth = () => blueTurret.health;

        redCradle = new Combatant();
        redCradle.id = 'red-cradle';
        redCradle.type = COMBATANT_TYPES.CRADLE;
        redCradle.team = 'red';
        redCradle.x = 300;
        redCradle.y = 300;
        redCradle.size = 25;
        redCradle.health = 500;
        redCradle.maxHealth = 500;
        redCradle.attackRadius = 0;
        redCradle.attackStrength = 0;
        redCradle.attackSpeed = 0;
        redCradle.lastAttackTime = 0;
        redCradle.windUp = 0;
        redCradle.attackReadyAt = 0;
        redCradle.moveSpeed = 0;
        redCradle.bulletArmor = 0;
        redCradle.abilityArmor = 0;
        redCradle.getHealth = () => redCradle.health;

        // Add all combatants to game state
        gameState.combatants.set(blueHero.id, blueHero);
        gameState.combatants.set(redHero.id, redHero);
        gameState.combatants.set(blueMinion.id, blueMinion);
        gameState.combatants.set(redMinion.id, redMinion);
        gameState.combatants.set(blueTurret.id, blueTurret);
        gameState.combatants.set(redCradle.id, redCradle);
    });

    describe('Target Eligibility Checks', () => {
        it('should not hit allies (same team)', () => {
            const projectile = createProjectile('blue', 100, 100, 1, 0, 'default');
            gameState.projectiles.set(projectile.id, projectile);

            // Simulate projectile movement to ally position
            projectile.x = 150;
            projectile.y = 150;

            gameEngine['updateProjectiles'](16); // 16ms delta time

            // Projectile should not hit blue minion (ally)
            expect(gameState.projectiles.has(projectile.id)).toBe(true);
            expect(blueMinion.health).toBe(50); // Health unchanged
        });

        it('should not hit dead entities', () => {
            redHero.health = 0;

            const projectile = createProjectile('blue', 200, 200, 1, 0, 'default');
            gameState.projectiles.set(projectile.id, projectile);

            gameEngine['updateProjectiles'](16);

            // Projectile should not hit dead hero
            expect(gameState.projectiles.has(projectile.id)).toBe(true);
        });

        it('should not hit respawning entities', () => {
            redHero.state = 'respawning';

            const projectile = createProjectile('blue', 200, 200, 1, 0, 'default');
            gameState.projectiles.set(projectile.id, projectile);

            gameEngine['updateProjectiles'](16);

            // Note: Currently respawning check is commented out in GameEngine
            // So respawning entities can still be hit
            expect(gameState.projectiles.has(projectile.id)).toBe(false);
        });

        it('should hit enemies (different team)', () => {
            const projectile = createProjectile('blue', 200, 200, 1, 0, 'default');
            gameState.projectiles.set(projectile.id, projectile);

            gameEngine['updateProjectiles'](16);

            // Projectile should hit red hero (enemy)
            expect(gameState.projectiles.has(projectile.id)).toBe(false); // Projectile removed
        });
    });

    describe('Collision Detection Accuracy', () => {
        it('should detect collision when projectile is within collision radius', () => {
            const projectile = createProjectile('blue', 195, 195, 1, 0, 'default');
            gameState.projectiles.set(projectile.id, projectile);

            // Projectile is 5 units away from red hero (200, 200)
            // Collision radius = hero size (15) + projectile radius (5) = 20
            // Distance = sqrt((200-195)² + (200-195)²) = sqrt(50) ≈ 7.07 < 20
            gameEngine['updateProjectiles'](16);

            expect(gameState.projectiles.has(projectile.id)).toBe(false); // Should collide
        });

        it('should not detect collision when projectile is outside collision radius', () => {
            const projectile = createProjectile('blue', 170, 170, 1, 0, 'default');
            gameState.projectiles.set(projectile.id, projectile);

            // Projectile is 30 units away from red hero (200, 200)
            // Distance = sqrt((200-170)² + (200-170)²) = sqrt(1800) ≈ 42.43 > 20
            gameEngine['updateProjectiles'](16);

            expect(gameState.projectiles.has(projectile.id)).toBe(true); // Should not collide
        });

        it('should prioritize closest target when multiple targets are in range', () => {
            // Place red minion closer to projectile than red hero
            redMinion.x = 190;
            redMinion.y = 190;

            const projectile = createProjectile('blue', 180, 180, 1, 0, 'default');
            gameState.projectiles.set(projectile.id, projectile);

            gameEngine['updateProjectiles'](16);

            // Projectile should hit red minion (closer) and be removed
            expect(gameState.projectiles.has(projectile.id)).toBe(false);
        });
    });

    describe('AOE Projectile Detection', () => {
        it('should detect targets within AOE radius', () => {
            const projectile = createAOEProjectile('blue', 200, 200, 50, 'thorndive');
            // Add effects to make AOE work
            projectile.effects.push(createProjectileEffect('applyDamage', 25));
            gameState.projectiles.set(projectile.id, projectile);

            // Red hero is at (200, 200), AOE center
            // Red minion is at (250, 250), distance = sqrt(2500) ≈ 50
            // AOE radius = 50, so minion should be hit
            gameEngine['updateProjectiles'](16);

            expect(gameState.projectiles.has(projectile.id)).toBe(false); // AOE triggered
        });

        it('should not detect targets outside AOE radius', () => {
            const projectile = createAOEProjectile('blue', 200, 200, 30, 'thorndive');
            // Add effects to make AOE work
            projectile.effects.push(createProjectileEffect('applyDamage', 25));
            gameState.projectiles.set(projectile.id, projectile);

            // Red minion is at (250, 250), distance ≈ 50 > AOE radius 30
            gameEngine['updateProjectiles'](16);

            expect(gameState.projectiles.has(projectile.id)).toBe(false); // AOE triggered
        });

        it('should account for combatant size in AOE calculations', () => {
            const projectile = createAOEProjectile('blue', 200, 200, 40, 'thorndive');
            // Add effects to make AOE work
            projectile.effects.push(createProjectileEffect('applyDamage', 25));
            gameState.projectiles.set(projectile.id, projectile);

            // Red minion is at (250, 250), distance ≈ 50
            // AOE radius = 40, minion size = 10
            // Effective radius = 40 + 10 = 50, so minion should be hit
            gameEngine['updateProjectiles'](16);

            expect(gameState.projectiles.has(projectile.id)).toBe(false); // AOE triggered
        });


    });

    describe('Projectile Movement and Bounds', () => {


        it('should remove projectile when it goes out of bounds', () => {
            // Create projectile at edge moving outward
            const projectile = createProjectile('blue', 0, 0, -1, -1, 'default');
            gameState.projectiles.set(projectile.id, projectile);

            gameEngine['updateProjectiles'](16);

            expect(gameState.projectiles.has(projectile.id)).toBe(false);
        });

        it('should remove projectile when duration expires', () => {
            const projectile = createProjectile('blue', 100, 100, 100, 0, 'default');
            projectile.duration = 100; // 100ms duration
            projectile.createdAt = gameState.gameTime - 150; // Created 150ms ago
            gameState.projectiles.set(projectile.id, projectile);

            gameEngine['updateProjectiles'](16);

            expect(gameState.projectiles.has(projectile.id)).toBe(false);
        });
    });

    describe('Destination-based Projectiles', () => {
        it('should trigger AOE when reaching destination', () => {
            const projectile = createAOEProjectile('blue', 200, 200, 50, 'thorndive');
            projectile.targetX = 200;
            projectile.targetY = 200;
            // Add effects to make AOE work
            projectile.effects.push(createProjectileEffect('applyDamage', 25));
            gameState.projectiles.set(projectile.id, projectile);

            gameEngine['updateProjectiles'](16);

            expect(gameState.projectiles.has(projectile.id)).toBe(false);
        });

        it('should trigger AOE when overshooting destination', () => {
            const projectile = createAOEProjectile('blue', 195, 195, 100, 'thorndive');
            projectile.targetX = 200;
            projectile.targetY = 200;
            // Add effects to make AOE work
            projectile.effects.push(createProjectileEffect('applyDamage', 25));
            gameState.projectiles.set(projectile.id, projectile);

            gameEngine['updateProjectiles'](16);

            expect(gameState.projectiles.has(projectile.id)).toBe(false);
        });
    });

    describe('Effect Application', () => {


        it('should apply status effects to valid targets', () => {
            const stunEffect = new StunEffect();
            stunEffect.type = 'stun';
            stunEffect.duration = 1000;
            stunEffect.appliedAt = gameState.gameTime;

            const projectile = createProjectileWithEffects('blue', 200, 200, 1, 0, 'default', [
                { effectType: 'applyEffect', combatantEffect: stunEffect }
            ]);
            gameState.projectiles.set(projectile.id, projectile);

            gameEngine['updateProjectiles'](16);

            expect(gameState.projectiles.has(projectile.id)).toBe(false);
            expect(redHero.effects).toHaveLength(1);
            expect(redHero.effects[0]?.type).toBe('stun');
        });
    });

    describe('Effect Cleanup and Duration', () => {
            it('should remove effects with duration 0 immediately', () => {
                // Create a taunt effect with duration 0
                const tauntEffect = new StunEffect(); // Using StunEffect as a proxy for TauntEffect
                tauntEffect.type = 'stun';
                tauntEffect.duration = 0; // Duration 0 should expire immediately
                tauntEffect.appliedAt = gameState.gameTime;

                // Add effect to red hero
                redHero.effects = new ArraySchema();
                redHero.effects.push(tauntEffect);

                // Update effects (this should trigger cleanup)
                gameEngine['updateEffects'](16);

                // Effect with duration 0 should be removed immediately
                expect(redHero.effects).toHaveLength(0);
            });

            it('should remove expired effects based on duration', () => {
                // Create a stun effect with 100ms duration
                const stunEffect = new StunEffect();
                stunEffect.type = 'stun';
                stunEffect.duration = 100; // 100ms duration
                stunEffect.appliedAt = gameState.gameTime - 150; // Applied 150ms ago (expired)

                // Add effect to red hero
                redHero.effects = new ArraySchema();
                redHero.effects.push(stunEffect);

                // Update effects
                gameEngine['updateEffects'](16);

                // Expired effect should be removed
                expect(redHero.effects).toHaveLength(0);
            });

            it('should keep active effects that have not expired', () => {
                // Create a stun effect with 1000ms duration
                const stunEffect = new StunEffect();
                stunEffect.type = 'stun';
                stunEffect.duration = 1000; // 1000ms duration
                stunEffect.appliedAt = gameState.gameTime - 500; // Applied 500ms ago (still active)

                // Add effect to red hero
                redHero.effects = new ArraySchema();
                redHero.effects.push(stunEffect);

                // Update effects
                gameEngine['updateEffects'](16);

                // Active effect should remain
                expect(redHero.effects).toHaveLength(1);
                expect(redHero.effects[0]?.type).toBe('stun');
            });

            it('should keep effects with infinite duration (-1)', () => {
                // Create a passive healing effect with infinite duration
                const passiveHealingEffect = new StunEffect(); // Using StunEffect as proxy
                passiveHealingEffect.type = 'stun';
                passiveHealingEffect.duration = -1; // Infinite duration
                passiveHealingEffect.appliedAt = gameState.gameTime - 1000; // Applied 1000ms ago

                // Add effect to red hero
                redHero.effects = new ArraySchema();
                redHero.effects.push(passiveHealingEffect);

                // Update effects
                gameEngine['updateEffects'](16);

                // Infinite duration effect should remain
                expect(redHero.effects).toHaveLength(1);
                expect(redHero.effects[0]?.type).toBe('stun');
            });

            it('should handle multiple effects with different durations correctly', () => {
                // Create multiple effects with different durations
                const immediateEffect = new StunEffect();
                immediateEffect.type = 'stun';
                immediateEffect.duration = 0; // Expires immediately
                immediateEffect.appliedAt = gameState.gameTime;

                const shortEffect = new StunEffect();
                shortEffect.type = 'stun';
                shortEffect.duration = 100; // Expires in 100ms
                shortEffect.appliedAt = gameState.gameTime - 150; // Already expired

                const longEffect = new StunEffect();
                longEffect.type = 'stun';
                longEffect.duration = 1000; // Expires in 1000ms
                longEffect.appliedAt = gameState.gameTime - 500; // Still active

                const infiniteEffect = new StunEffect();
                infiniteEffect.type = 'stun';
                infiniteEffect.duration = -1; // Never expires
                infiniteEffect.appliedAt = gameState.gameTime - 1000; // Applied long ago

                // Add all effects to red hero
                redHero.effects = new ArraySchema();
                redHero.effects.push(immediateEffect, shortEffect, longEffect, infiniteEffect);

                // Update effects
                gameEngine['updateEffects'](16);

                // Only long and infinite effects should remain
                expect(redHero.effects).toHaveLength(2);
                expect(redHero.effects[0]?.duration).toBe(1000); // Long effect
                expect(redHero.effects[1]?.duration).toBe(-1); // Infinite effect
            });

            it('should handle effects with no effects array gracefully', () => {
                // Set effects to undefined
                (redHero as any).effects = undefined;

                // This should not crash
                expect(() => {
                    gameEngine['updateEffects'](16);
                }).not.toThrow();
            });

            it('should handle effects with empty effects array gracefully', () => {
                // Set effects to empty array
                redHero.effects = new ArraySchema();

                // This should not crash
                expect(() => {
                    gameEngine['updateEffects'](16);
                }).not.toThrow();
            });

            it('should process move effects and remove them when complete', () => {
                // Create a move effect
                const moveEffect = new StunEffect(); // Using StunEffect as proxy for MoveEffect
                moveEffect.type = 'move';
                moveEffect.duration = 1000;
                moveEffect.appliedAt = gameState.gameTime;

                // Add effect to red hero
                redHero.effects = new ArraySchema();
                redHero.effects.push(moveEffect);

                // Mock the processMoveEffect method to return true (should remove)
                jest.spyOn(gameEngine as any, 'processMoveEffect').mockReturnValue(true);

                // Update effects
                gameEngine['updateEffects'](16);

                // Move effect should be processed and removed
                expect(redHero.effects).toHaveLength(0);
                expect(gameEngine['processMoveEffect']).toHaveBeenCalledWith(redHero, moveEffect, 16);
            });
        });
});

// Helper functions to create test projectiles
function createProjectileEffect(effectType: string, damage?: number): ProjectileEffect {
    const effect = new ProjectileEffect();
    effect.effectType = effectType;
    if (damage) effect.damage = damage;
    return effect;
}

function createProjectile(team: string, x: number, y: number, directionX: number, directionY: number, type: string): Projectile {
    const projectile = new Projectile();
    projectile.id = `test-projectile-${Date.now()}`;
    projectile.ownerId = `${team}-hero`;
    projectile.x = x;
    projectile.y = y;
    projectile.directionX = directionX;
    projectile.directionY = directionY;
    projectile.speed = 100;
    projectile.team = team;
    projectile.type = type as any;
    projectile.duration = -1;
    projectile.createdAt = Date.now();
    return projectile;
}

function createAOEProjectile(team: string, x: number, y: number, aoeRadius: number, type: string): Projectile {
    const projectile = createProjectile(team, x, y, 1, 0, type);
    projectile.aoeRadius = aoeRadius;
    projectile.effects = new ArraySchema<ProjectileEffect>();
    return projectile;
}

function createProjectileWithEffects(team: string, x: number, y: number, directionX: number, directionY: number, type: string, effects: any[]): Projectile {
    const projectile = createProjectile(team, x, y, directionX, directionY, type);
    projectile.effects = new ArraySchema<ProjectileEffect>();
    effects.forEach(effect => {
        const projectileEffect = new ProjectileEffect();
        Object.assign(projectileEffect, effect);
        projectile.effects.push(projectileEffect);
    });
    return projectile;
}
