import { StatProgressionDisplay } from '../ui/StatProgressionDisplay';
import { HeroCombatant } from '../../shared/types/CombatantTypes';
import { CLIENT_CONFIG } from '../../ClientConfig';

// Mock Phaser.Scene
const mockScene = {
    add: {
        graphics: jest.fn().mockReturnValue({
            fillStyle: jest.fn().mockReturnThis(),
            fillRoundedRect: jest.fn().mockReturnThis(),
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
            destroy: jest.fn(),
        }),
    },
} as any;

// Mock IconManager
jest.mock('../utils/IconManager', () => ({
    IconManager: {
        getInstance: jest.fn().mockReturnValue({
            createIconImage: jest.fn().mockReturnValue({
                setDisplaySize: jest.fn().mockReturnThis(),
                setDepth: jest.fn().mockReturnThis(),
                setScrollFactor: jest.fn().mockReturnThis(),
                setVisible: jest.fn().mockReturnThis(),
                destroy: jest.fn(),
            }),
        }),
    },
}));

describe('StatProgressionDisplay', () => {
    let statProgressionDisplay: StatProgressionDisplay;
    let mockHero: HeroCombatant;

    beforeEach(() => {
        statProgressionDisplay = new StatProgressionDisplay(mockScene);
        
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
            ability: {
                type: 'default',
                cooldown: 5000,
                lastUsedTime: 0,
            },
            levelRewards: [],
            rewardsForChoice: [],
            permanentEffects: [],
            effects: [],
        };
    });

    describe('updateDisplay', () => {
        it('should not display anything when hero has no permanent effects', () => {
            mockHero.permanentEffects = [];
            
            statProgressionDisplay.updateDisplay(mockHero);
            
            expect(mockScene.add.graphics).not.toHaveBeenCalled();
        });

        it('should not display anything when hero has no stat modification effects', () => {
            mockHero.permanentEffects = [
                { type: 'stun', duration: 1000, appliedAt: 0 } as any
            ];
            
            statProgressionDisplay.updateDisplay(mockHero);
            
            expect(mockScene.add.graphics).not.toHaveBeenCalled();
        });

        it('should create background and icons for stat modification effects', () => {
            mockHero.permanentEffects = [
                { type: 'statmod', stat: 'maxHealth', operator: 'percent', amount: 1.15, duration: -1, appliedAt: 0 } as any,
                { type: 'statmod', stat: 'attackStrength', operator: 'percent', amount: 1.15, duration: -1, appliedAt: 0 } as any,
            ];
            
            statProgressionDisplay.updateDisplay(mockHero);
            
            expect(mockScene.add.graphics).toHaveBeenCalled();
        });
    });

    describe('clearDisplay', () => {
        it('should destroy background and icons', () => {
            mockHero.permanentEffects = [
                { type: 'statmod', stat: 'maxHealth', operator: 'percent', amount: 1.15, duration: -1, appliedAt: 0 } as any,
            ];
            
            statProgressionDisplay.updateDisplay(mockHero);
            statProgressionDisplay.clearDisplay();
            
            // The mock destroy methods should have been called
            expect(mockScene.add.graphics().destroy).toHaveBeenCalled();
        });
    });

    describe('setVisible', () => {
        it('should set visibility of background and icons', () => {
            mockHero.permanentEffects = [
                { type: 'statmod', stat: 'maxHealth', operator: 'percent', amount: 1.15, duration: -1, appliedAt: 0 } as any,
            ];
            
            statProgressionDisplay.updateDisplay(mockHero);
            statProgressionDisplay.setVisible(false);
            
            expect(mockScene.add.graphics().setVisible).toHaveBeenCalledWith(false);
        });
    });
});
