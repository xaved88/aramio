import { PermanentEffectsDisplay } from '../PermanentEffectsDisplay';
import { HeroCombatant } from '../../../shared/types/CombatantTypes';

// Mock Phaser.Scene
const mockScene = {
    add: {
        graphics: jest.fn().mockReturnValue({
            fillStyle: jest.fn().mockReturnThis(),
            fillRoundedRect: jest.fn().mockReturnThis(),
            lineStyle: jest.fn().mockReturnThis(),
            strokeRoundedRect: jest.fn().mockReturnThis(),
            setDepth: jest.fn().mockReturnThis(),
            setScrollFactor: jest.fn().mockReturnThis(),
            setVisible: jest.fn().mockReturnThis(),
            destroy: jest.fn(),
        }),
        image: jest.fn().mockReturnValue({
            setDisplaySize: jest.fn().mockReturnThis(),
            setDepth: jest.fn().mockReturnThis(),
            setScrollFactor: jest.fn().mockReturnThis(),
            setVisible: jest.fn().mockReturnThis(),
            setInteractive: jest.fn().mockReturnThis(),
            on: jest.fn().mockReturnThis(),
            destroy: jest.fn(),
        }),
        container: jest.fn().mockReturnValue({
            setDepth: jest.fn().mockReturnThis(),
            setScrollFactor: jest.fn().mockReturnThis(),
            setVisible: jest.fn().mockReturnThis(),
            add: jest.fn().mockReturnThis(),
            destroy: jest.fn(),
        }),
        text: jest.fn().mockReturnValue({
            setDepth: jest.fn().mockReturnThis(),
            setScrollFactor: jest.fn().mockReturnThis(),
            setVisible: jest.fn().mockReturnThis(),
            setOrigin: jest.fn().mockReturnThis(),
            destroy: jest.fn(),
            width: 100, // Mock width for text measurement
        }),
    },
} as any;

// Mock IconManager
jest.mock('../../utils/IconManager', () => ({
    IconManager: {
        getInstance: jest.fn().mockReturnValue({
            createIconImage: jest.fn().mockReturnValue({
                setDisplaySize: jest.fn().mockReturnThis(),
                setDepth: jest.fn().mockReturnThis(),
                setScrollFactor: jest.fn().mockReturnThis(),
                setVisible: jest.fn().mockReturnThis(),
                setInteractive: jest.fn().mockReturnThis(),
                on: jest.fn().mockReturnThis(),
                destroy: jest.fn(),
            }),
        }),
    },
}));

describe('PermanentEffectsDisplay', () => {
    let permanentEffectsDisplay: PermanentEffectsDisplay;
    let mockHero: HeroCombatant;

    beforeEach(() => {
        permanentEffectsDisplay = new PermanentEffectsDisplay(mockScene);
        
        mockHero = {
            id: 'hero1',
            type: 'hero',
            controller: 'test-session' as any,
            x: 350,
            y: 350,
            health: 100,
            maxHealth: 100,
            team: 'blue',
            state: 'alive',
            respawnTime: 0,
            respawnDuration: 6000,
            displayName: 'Hero 1',
            level: 1,
            experience: 0,
            experienceNeeded: 15,
            roundStats: {
                totalExperience: 0,
                minionKills: 0,
                heroKills: 0,
                turretKills: 0,
                damageTaken: 0,
                damageDealt: 0,
            },
            attackRadius: 50,
            attackStrength: 5,
            attackSpeed: 1,
            moveSpeed: 3.5,
            lastAttackTime: 0,
            lastDamageTime: 0,
            size: 15,
            windUp: 0.25,
            attackReadyAt: 0,
            bulletArmor: 0,
            abilityArmor: 0,
            direction: 0,
            abilityPower: 10,
            ability: {
                type: 'default',
                cooldown: 5000,
                lastUsedTime: 0,
                strength: 10,
                strengthRatio: 1.0,
            } as any,
            levelRewards: [],
            rewardsForChoice: [],
            permanentEffects: [],
            effects: [],
        };
    });

    describe('updateDisplay', () => {
        it('should not display anything when hero has no permanent effects', () => {
            mockHero.permanentEffects = [];
            
            permanentEffectsDisplay.updateDisplay(mockHero);
            
            expect(mockScene.add.graphics).not.toHaveBeenCalled();
        });

        it('should not display anything when hero has no stat modification effects', () => {
            mockHero.permanentEffects = [
                { type: 'stun', duration: 1000, appliedAt: 0 } as any
            ];
            
            permanentEffectsDisplay.updateDisplay(mockHero);
            
            expect(mockScene.add.graphics).not.toHaveBeenCalled();
        });

        it('should create background and icons for stat modification effects', () => {
            mockHero.permanentEffects = [
                { type: 'statmod', stat: 'maxHealth', operator: 'percent', amount: 1.15, duration: -1, appliedAt: 0 } as any,
                { type: 'statmod', stat: 'attackStrength', operator: 'percent', amount: 1.15, duration: -1, appliedAt: 0 } as any,
            ];
            
            permanentEffectsDisplay.updateDisplay(mockHero);
            
            expect(mockScene.add.graphics).toHaveBeenCalled();
        });
    });

    describe('clearDisplay', () => {
        it('should destroy background and icons', () => {
            mockHero.permanentEffects = [
                { type: 'statmod', stat: 'maxHealth', operator: 'percent', amount: 1.15, duration: -1, appliedAt: 0 } as any,
            ];
            
            permanentEffectsDisplay.updateDisplay(mockHero);
            permanentEffectsDisplay.clearDisplay();
            
            // The mock destroy methods should have been called
            expect(mockScene.add.graphics().destroy).toHaveBeenCalled();
        });
    });

    describe('setVisible', () => {
        it('should set visibility of background and icons', () => {
            mockHero.permanentEffects = [
                { type: 'statmod', stat: 'maxHealth', operator: 'percent', amount: 1.15, duration: -1, appliedAt: 0 } as any,
            ];
            
            permanentEffectsDisplay.updateDisplay(mockHero);
            permanentEffectsDisplay.setVisible(false);
            
            expect(mockScene.add.graphics().setVisible).toHaveBeenCalledWith(false);
        });
    });
});
