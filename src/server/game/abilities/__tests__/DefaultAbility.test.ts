import { DefaultAbilityDefinition } from '../definitions/DefaultAbilityDefinition';
import { DefaultAbility } from '../../../schema/Abilities';
import { GameState } from '../../../schema/GameState';
import { Hero } from '../../../schema/Combatants';
import { COMBATANT_TYPES } from '../../../../shared/types/CombatantTypes';

describe('DefaultAbility', () => {
    let defaultAbility: DefaultAbility;
    let gameState: GameState;
    let hero: Hero;

    beforeEach(() => {
        defaultAbility = DefaultAbilityDefinition.instance.create();
        gameState = new GameState();
        gameState.gameTime = 0;
        
        // Create a test hero
        hero = new Hero();
        hero.id = 'test-hero';
        hero.type = COMBATANT_TYPES.HERO;
        hero.team = 'blue';
        hero.x = 100;
        hero.y = 100;
        hero.health = 100;
        hero.maxHealth = 100;
        hero.state = 'alive';
        
        gameState.combatants.set(hero.id, hero);
    });

    describe('useAbility', () => {
        it('should create a projectile when used', () => {
            const initialProjectileCount = gameState.projectiles.size;
            
            const result = DefaultAbilityDefinition.instance.useAbility(
                defaultAbility, 
                hero.id, 
                200, 
                200, 
                gameState
            );
            
            expect(result).toBe(true);
            expect(gameState.projectiles.size).toBe(initialProjectileCount + 1);
        });


        it('should create projectile with correct properties', () => {
            DefaultAbilityDefinition.instance.useAbility(
                defaultAbility, 
                hero.id, 
                200, 
                200, 
                gameState
            );
            
            const projectile = Array.from(gameState.projectiles.values())[0];
            expect(projectile.ownerId).toBe(hero.id);
            expect(projectile.team).toBe(hero.team);
            expect(projectile.x).toBe(hero.x);
            expect(projectile.y).toBe(hero.y);
            expect(projectile.type).toBe('default');
            expect(projectile.effects.length).toBe(1);
            expect(projectile.effects[0]?.effectType).toBe('applyDamage');
            expect(projectile.effects[0]?.damage).toBe(defaultAbility.strength);
        });


        it('should not clamp target when target is within ability range', () => {
            // Default ability has range 100, hero at (100, 100)
            // Target at (150, 100) is 50 units away, should not be clamped
            const targetX = 150;
            const targetY = 100;
            
            DefaultAbilityDefinition.instance.useAbility(
                defaultAbility, 
                hero.id, 
                targetX, 
                targetY, 
                gameState
            );
            
            const projectile = Array.from(gameState.projectiles.values())[0];
            
            // Projectile should be created at hero position
            expect(projectile.x).toBe(hero.x);
            expect(projectile.y).toBe(hero.y);
            
            // Check that the projectile direction points toward the original target (not clamped)
            const distance = Math.sqrt((targetX - hero.x) ** 2 + (targetY - hero.y) ** 2);
            expect(projectile.directionX).toBeCloseTo((targetX - hero.x) / distance, 5);
            expect(projectile.directionY).toBeCloseTo((targetY - hero.y) / distance, 5);
        });
    });
});
