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
    });
});
