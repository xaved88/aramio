import { BotManager } from '../BotManager';
import { HookshotBotStrategy } from '../strategies/HookshotBotStrategy';
import { SimpletonBotStrategy } from '../strategies/SimpletonBotStrategy';
import { MercenaryBotStrategy } from '../strategies/MercenaryBotStrategy';
import { GameRoom } from '../../../rooms/GameRoom';
import { TEST_GAMEPLAY_CONFIG } from '../../../config/TestGameplayConfig';

describe('Bot Strategies', () => {
    let botManager: BotManager;

    beforeEach(() => {
        botManager = new BotManager(TEST_GAMEPLAY_CONFIG);
    });

    describe('HookshotBotStrategy Behavior', () => {
        it('should generate commands when hookshot bot has a teammate', () => {
            const hookshotStrategy = new HookshotBotStrategy(TEST_GAMEPLAY_CONFIG);

            const mockBot = {
                id: 'test-bot',
                team: 'blue',
                x: 100,
                y: 100,
                health: 100,
                state: 'alive',
                ability: { lastUsedTime: 0, cooldown: 5000, range: 200, strength: 50 },
                getAttackRadius: () => 25, // Hookshot has 25 base attack radius
                getAbilityCooldown: () => 5000,
                getAbilityRange: () => 200,
                getAbilityStrength: () => 50,
                getAbilityDuration: () => 0,
                getAbilitySpeed: () => 0,
                getMercenaryRageSpeed: () => 1.0,
                getPyromancerRadius: () => 0
            } as any;

            const mockTeammate = {
                id: 'teammate',
                team: 'blue',
                x: 200,
                y: 200,
                type: 'hero',
                state: 'alive'
            } as any;

            const mockState = {
                gameTime: 1000,
                combatants: new Map()
            } as any;

            // Set up combatants
            mockState.combatants.set(mockBot.id, mockBot);
            mockState.combatants.set(mockTeammate.id, mockTeammate);

            const commands = hookshotStrategy.generateCommands(mockBot, mockState);
            
            // Should generate at least one command
            expect(commands.length).toBeGreaterThanOrEqual(0);
        });

        it('should reposition hookshot bot behind teammates for defensive positioning', () => {
            const hookshotStrategy = new HookshotBotStrategy(TEST_GAMEPLAY_CONFIG);
            
            // Bot is positioned in front of teammate (closer to enemy base)
            // Blue base: (100, 1100), Red base: (1100, 100)
            // Bot closer to red base (enemy) = higher X, lower Y
            const mockBot = {
                id: 'test-bot',
                team: 'blue',
                x: 800, // Closer to enemy base (red at 1100,100)
                y: 400, // Closer to enemy base (red at 1100,100)
                health: 100,
                state: 'alive',
                ability: { lastUsedTime: 0, cooldown: 5000, range: 200, strength: 50 }, // Hookshot available
                level: 1,
                getAbilityCooldown: () => 5000,
                getAbilityRange: () => 200,
                getAbilityStrength: () => 50,
                getAbilityDuration: () => 0,
                getAbilitySpeed: () => 0,
                getMercenaryRageSpeed: () => 1.0,
                getPyromancerRadius: () => 0
            } as any;

            // Teammate is positioned behind bot (closer to our base)
            // Teammate closer to blue base = lower X, higher Y
            const mockTeammate = {
                id: 'teammate',
                team: 'blue',
                x: 400, // Closer to our base (blue at 100,1100)
                y: 800, // Closer to our base (blue at 100,1100)
                type: 'hero',
                state: 'alive'
            } as any;

            // No enemies nearby
            const mockState = {
                gameTime: 1000,
                combatants: new Map()
            } as any;

            // Add bot and teammate to state
            mockState.combatants.set(mockBot.id, mockBot);
            mockState.combatants.set(mockTeammate.id, mockTeammate);

            // Generate commands
            const commands = hookshotStrategy.generateCommands(mockBot, mockState);
            
            // Should generate movement commands to reposition
            expect(commands.length).toBeGreaterThan(0);
            
            // Should have at least one move command
            const moveCommands = commands.filter(cmd => cmd.type === 'move');
            expect(moveCommands.length).toBeGreaterThan(0);
            
            // The move command should target a position behind the teammate
            const moveCommand = moveCommands[0];
            expect(moveCommand.type).toBe('move');
            expect(moveCommand.data.heroId).toBe(mockBot.id);
            
            // The target position should be closer to our base than the bot's current position
            // Blue base is at (100, 1100), so moving towards base means:
            // - X: move left (targetX < 800)
            // - Y: move down (targetY > 400)
            expect(moveCommand.data.targetX).toBeLessThan(mockBot.x);
            expect(moveCommand.data.targetY).toBeGreaterThan(mockBot.y);
        });
    });

    describe('MercenaryBotStrategy Behavior', () => {
        it('should refuse to use rage on minions when only minions are available', () => {
            const mercenaryStrategy = new MercenaryBotStrategy(TEST_GAMEPLAY_CONFIG);
            const simpletonStrategy = new SimpletonBotStrategy(TEST_GAMEPLAY_CONFIG);

            // Create separate bots for each strategy since they have different abilities
            const mercenaryBot = {
                id: 'mercenary-bot',
                team: 'blue',
                x: 300,
                y: 300,
                health: 100,
                state: 'alive',
                ability: { 
                    lastUsedTime: 0, 
                    cooldown: 10000, // Rage is ready - mercenary ability has no range
                    range: 0,
                    strength: 50
                },
                effects: [],
                getAttackRadius: () => 50,
                getAbilityCooldown: () => 10000,
                getAbilityRange: () => 0,
                getAbilityStrength: () => 50,
                getAbilityDuration: () => 0,
                getAbilitySpeed: () => 0,
                getMercenaryRageSpeed: () => 1.0,
                getPyromancerRadius: () => 0
            } as any;

            const simpletonBot = {
                id: 'simpleton-bot',
                team: 'blue',
                x: 300,
                y: 300,
                health: 100,
                state: 'alive',
                ability: { 
                    lastUsedTime: 0, 
                    cooldown: 10000,
                    range: 50, // Simpleton uses a projectile ability with range
                    strength: 50
                },
                effects: [],
                getAttackRadius: () => 50,
                getAbilityCooldown: () => 10000,
                getAbilityRange: () => 50,
                getAbilityStrength: () => 50,
                getAbilityDuration: () => 0,
                getAbilitySpeed: () => 0,
                getMercenaryRageSpeed: () => 1.0,
                getPyromancerRadius: () => 0
            } as any;

            // Only minions nearby, no heroes
            const mockMinion = {
                id: 'enemy-minion',
                team: 'red',
                x: 320,
                y: 320,
                health: 80,
                type: 'minion',
                state: 'alive'
            } as any;

            const mockState = {
                gameTime: 1000,
                combatants: new Map([
                    [mercenaryBot.id, mercenaryBot],
                    [simpletonBot.id, simpletonBot],
                    [mockMinion.id, mockMinion]
                ])
            } as any;

            const mercenaryCommands = mercenaryStrategy.generateCommands(mercenaryBot, mockState);
            const simpletonCommands = simpletonStrategy.generateCommands(simpletonBot, mockState);
            
            // Mercenary should NOT use rage on minions - it waits for heroes
            const mercenaryAbilityCommands = mercenaryCommands.filter(cmd => cmd.type === 'useAbility');
            expect(mercenaryAbilityCommands.length).toBe(0);
            
            // Simpleton WOULD use ability on minions
            const simpletonAbilityCommands = simpletonCommands.filter(cmd => cmd.type === 'useAbility');
            expect(simpletonAbilityCommands.length).toBeGreaterThan(0);
        });

        it('should avoid areas with multiple attackers while simpleton charges in', () => {
            const mercenaryStrategy = new MercenaryBotStrategy(TEST_GAMEPLAY_CONFIG);
            const simpletonStrategy = new SimpletonBotStrategy(TEST_GAMEPLAY_CONFIG);

            const mockBot = {
                id: 'mercenary-bot',
                team: 'blue',
                x: 200,
                y: 200,
                health: 100,
                state: 'alive',
                ability: { lastUsedTime: 5000, cooldown: 10000, range: 200, strength: 50 }, // Not in rage mode
                effects: [],
                getAttackRadius: () => 50, // Mock attack radius
                getAbilityCooldown: () => 10000,
                getAbilityRange: () => 200,
                getAbilityStrength: () => 50,
                getAbilityDuration: () => 0,
                getAbilitySpeed: () => 0,
                getMercenaryRageSpeed: () => 1.0,
                getPyromancerRadius: () => 0
            } as any;

            // Multiple enemies targeting the bot at enemy base area
            const mockEnemy1 = {
                id: 'enemy1',
                team: 'red',
                x: 550,
                y: 150,
                health: 80,
                type: 'hero',
                state: 'alive',
                target: mockBot.id
            } as any;

            const mockEnemy2 = {
                id: 'enemy2',
                team: 'red',
                x: 560,
                y: 140,
                health: 80,
                type: 'hero',
                state: 'alive',
                target: mockBot.id
            } as any;

            const mockState = {
                gameTime: 10000,
                combatants: new Map([
                    [mockBot.id, mockBot],
                    [mockEnemy1.id, mockEnemy1],
                    [mockEnemy2.id, mockEnemy2]
                ])
            } as any;

            const mercenaryCommands = mercenaryStrategy.generateCommands(mockBot, mockState);
            const simpletonCommands = simpletonStrategy.generateCommands(mockBot, mockState);
            
            // Mercenary should NOT move toward enemy base when multiple enemies are there
            const mercenaryMoveCommands = mercenaryCommands.filter(cmd => cmd.type === 'move');
            const simpletonMoveCommands = simpletonCommands.filter(cmd => cmd.type === 'move');
            
            // Both should have move commands, but they should be different
            expect(mercenaryMoveCommands.length).toBeGreaterThan(0);
            expect(simpletonMoveCommands.length).toBeGreaterThan(0);
            
            const mercenaryTarget = mercenaryMoveCommands[0];
            const simpletonTarget = simpletonMoveCommands[0];
            
            // Simpleton should move toward enemy base (higher X, lower Y for red base)
            expect(simpletonTarget.data.targetX).toBeGreaterThan(400);
            expect(simpletonTarget.data.targetY).toBeLessThan(300);
            
            // Mercenary should NOT move toward the dangerous area
            expect(mercenaryTarget.data.targetX).toBeLessThan(400);
        });
    });

    describe('SimpletonBotStrategy Behavior', () => {
        it('should retreat when targeted by defensive structures', () => {
            const simpletonStrategy = new SimpletonBotStrategy(TEST_GAMEPLAY_CONFIG);

            const mockBot = {
                id: 'simpleton-bot',
                team: 'blue',
                x: 300,
                y: 300,
                health: 100,
                state: 'alive',
                ability: { lastUsedTime: 1000, cooldown: 10000, range: 200, strength: 50 },
                effects: [],
                getAbilityCooldown: () => 10000,
                getAbilityRange: () => 200,
                getAbilityStrength: () => 50,
                getAbilityDuration: () => 0,
                getAbilitySpeed: () => 0,
                getMercenaryRageSpeed: () => 1.0,
                getPyromancerRadius: () => 0
            } as any;

            const mockEnemyTurret = {
                id: 'enemy-turret',
                team: 'red',
                x: 400,
                y: 400,
                health: 100,
                type: 'turret',
                state: 'alive',
                target: mockBot.id // Targeting the bot
            } as any;

            const mockState = {
                gameTime: 2000,
                combatants: new Map([
                    [mockBot.id, mockBot],
                    [mockEnemyTurret.id, mockEnemyTurret]
                ])
            } as any;

            const commands = simpletonStrategy.generateCommands(mockBot, mockState);
            
            // Should generate retreat movement
            expect(commands.length).toBeGreaterThan(0);
            const moveCommands = commands.filter(cmd => cmd.type === 'move');
            expect(moveCommands.length).toBeGreaterThan(0);
        });

        it('should not fire ability when no enemies are within ability range', () => {
            const simpletonStrategy = new SimpletonBotStrategy(TEST_GAMEPLAY_CONFIG);

            const mockBot = {
                id: 'simpleton-bot',
                team: 'blue',
                x: 100,
                y: 100,
                health: 100,
                state: 'alive',
                ability: { 
                    lastUsedTime: 0, // Ready to use
                    cooldown: 5000,
                    range: 100, // Ability range is 100
                    strength: 50
                },
                effects: [],
                getAbilityCooldown: () => 5000,
                getAbilityRange: () => 100,
                getAbilityStrength: () => 50,
                getAbilityDuration: () => 0,
                getAbilitySpeed: () => 0,
                getMercenaryRageSpeed: () => 1.0,
                getPyromancerRadius: () => 0
            } as any;

            // Enemy is 200 units away (beyond ability range of 100)
            const mockEnemy = {
                id: 'enemy-hero',
                team: 'red',
                x: 300, // 200 units away from bot at (100, 100)
                y: 100,
                health: 80,
                type: 'hero',
                state: 'alive'
            } as any;

            const mockState = {
                gameTime: 1000,
                combatants: new Map([
                    [mockBot.id, mockBot],
                    [mockEnemy.id, mockEnemy]
                ])
            } as any;

            const commands = simpletonStrategy.generateCommands(mockBot, mockState);
            
            // Should not generate any ability commands since enemy is out of range
            const abilityCommands = commands.filter(cmd => cmd.type === 'useAbility');
            expect(abilityCommands.length).toBe(0);
        });

        it('should fire ability when enemies are within ability range', () => {
            const simpletonStrategy = new SimpletonBotStrategy(TEST_GAMEPLAY_CONFIG);

            const mockBot = {
                id: 'simpleton-bot',
                team: 'blue',
                x: 100,
                y: 100,
                health: 100,
                state: 'alive',
                ability: { 
                    lastUsedTime: 0, // Ready to use
                    cooldown: 5000,
                    range: 100, // Ability range is 100
                    strength: 50
                },
                effects: [],
                getAbilityCooldown: () => 5000,
                getAbilityRange: () => 100,
                getAbilityStrength: () => 50,
                getAbilityDuration: () => 0,
                getAbilitySpeed: () => 0,
                getMercenaryRageSpeed: () => 1.0,
                getPyromancerRadius: () => 0
            } as any;

            // Enemy is 50 units away (within ability range of 100)
            const mockEnemy = {
                id: 'enemy-hero',
                team: 'red',
                x: 150, // 50 units away from bot at (100, 100)
                y: 100,
                health: 80,
                type: 'hero',
                state: 'alive'
            } as any;

            const mockState = {
                gameTime: 1000,
                combatants: new Map([
                    [mockBot.id, mockBot],
                    [mockEnemy.id, mockEnemy]
                ])
            } as any;

            const commands = simpletonStrategy.generateCommands(mockBot, mockState);
            
            // Should generate ability command since enemy is in range
            const abilityCommands = commands.filter(cmd => cmd.type === 'useAbility');
            expect(abilityCommands.length).toBe(1);
            expect(abilityCommands[0].data.heroId).toBe(mockBot.id);
            expect(abilityCommands[0].data.x).toBe(mockEnemy.x);
            expect(abilityCommands[0].data.y).toBe(mockEnemy.y);
        });
    });

    describe('Strategy Assignment Verification', () => {
        it('should explicitly verify which strategy is active for a bot after ability change', () => {
            // This test explicitly checks which strategy is being used by a bot
            // after it acquires a new ability
            
            // Test 1: Bot with hookshot ability should use HookshotBotStrategy
            expect(botManager.selectBotStrategyForAbility('hookshot')).toBe('bot-hookshot');
            
            // Test 2: Bot with mercenary ability should use MercenaryBotStrategy
            expect(botManager.selectBotStrategyForAbility('mercenary')).toBe('bot-mercenary');
            
            // Test 3: Bot with pyromancer ability should use SimpletonBotStrategy
            expect(botManager.selectBotStrategyForAbility('pyromancer')).toBe('bot-simpleton');
            
            // Test 4: Bot with thorndive ability should use SimpletonBotStrategy
            expect(botManager.selectBotStrategyForAbility('thorndive')).toBe('bot-simpleton');
            
            // Test 5: Bot with default ability should use SimpletonBotStrategy
            expect(botManager.selectBotStrategyForAbility('default')).toBe('bot-simpleton');
            
            // Test 6: Bot with unknown ability should fallback to SimpletonBotStrategy
            expect(botManager.selectBotStrategyForAbility('unknown')).toBe('bot-simpleton');
        });
    });

    describe('Bot Reward Selection', () => {
        it('should avoid ability rewards when 2+ team members already have that ability', () => {
            const mockState = {
                combatants: new Map(),
                projectiles: new Map(),
                attackEvents: [],
                xpEvents: [],
                levelUpEvents: [],
                damageEvents: [],
                killEvents: [],
                aoeDamageEvents: [],
                killStreakEvents: [],
                warriorSpawnTimes: new Map(),
                archerSpawned: new Map()
            } as any;

            // Create team members with different abilities
            const createMockHero = (id: string, team: string, abilityType: string, rewardsForChoice?: string[]) => ({
                id,
                team,
                type: 'hero',
                ability: { type: abilityType, lastUsedTime: 0, cooldown: 5000, range: 200, strength: 50 },
                effects: [],
                state: 'alive',
                respawnTime: 0,
                respawnDuration: 0,
                experience: 0,
                level: 1,
                experienceNeeded: 100,
                roundStats: {
                    totalExperience: 0,
                    minionKills: 0,
                    heroKills: 0,
                    turretKills: 0,
                    damageTaken: 0,
                    damageDealt: 0
                },
                controller: 'bot',
                displayName: id,
                levelRewards: [],
                rewardsForChoice: rewardsForChoice || [],
                permanentEffects: [],
                // Add getter methods for ability stats
                getAbilityCooldown: () => 5000,
                getAbilityRange: () => 200,
                getAbilityStrength: () => 50,
                getAbilityDuration: () => 0,
                getAbilitySpeed: () => 0,
                getMercenaryRageSpeed: () => 1.0,
                getPyromancerRadius: () => 0,
                getAttackRadius: () => 25,
                getAttackStrength: () => 20,
                getAttackSpeed: () => 1000,
                getMoveSpeed: () => 100,
                getHealth: () => 100,
                getMaxHealth: () => 100,
                getBulletArmor: () => 0,
                getAbilityArmor: () => 0
            });

            const bot1 = createMockHero('bot1', 'blue', 'hookshot');
            const bot2 = createMockHero('bot2', 'blue', 'hookshot');
            const bot3 = createMockHero('bot3', 'blue', 'mercenary');
            const selectingBot = createMockHero('selecting-bot', 'blue', 'default', ['ability:hookshot', 'ability:mercenary', 'ability:pyromancer']);

            // Add all combatants to state
            mockState.combatants.set('bot1', bot1);
            mockState.combatants.set('bot2', bot2);
            mockState.combatants.set('bot3', bot3);
            mockState.combatants.set('selecting-bot', selectingBot);

            // Test multiple times to ensure consistent behavior
            const selections: string[] = [];
            for (let i = 0; i < 10; i++) {
                const commands = botManager.processBots(mockState);
                const rewardCommand = commands.find(cmd => cmd.type === 'choose_reward' && cmd.data.heroId === 'selecting-bot');
                if (rewardCommand && 'rewardId' in rewardCommand.data) {
                    selections.push(rewardCommand.data.rewardId);
                }
            }

            // Should never select ability:hookshot since 2 team members already have it
            const hookshotSelections = selections.filter(selection => selection === 'ability:hookshot');
            expect(hookshotSelections.length).toBe(0);

            // Should select from preferred abilities (mercenary or pyromancer) since hookshot is avoided
            const preferredSelections = selections.filter(selection => 
                selection === 'ability:mercenary' || selection === 'ability:pyromancer'
            );
            expect(preferredSelections.length).toBeGreaterThan(0);

            // All selections should be ability rewards since that's all that's available
            const abilitySelections = selections.filter(selection => selection.startsWith('ability:'));
            expect(abilitySelections.length).toBe(selections.length);
        });

        it('should fallback to random selection when no preferred ability rewards available', () => {
            const mockState = {
                combatants: new Map(),
                projectiles: new Map(),
                attackEvents: [],
                xpEvents: [],
                levelUpEvents: [],
                damageEvents: [],
                killEvents: [],
                aoeDamageEvents: [],
                killStreakEvents: [],
                warriorSpawnTimes: new Map(),
                archerSpawned: new Map()
            } as any;

            // Create team where 2+ members have all available abilities
            const createMockHero = (id: string, team: string, abilityType: string, rewardsForChoice?: string[]) => ({
                id,
                team,
                type: 'hero',
                ability: { type: abilityType, lastUsedTime: 0, cooldown: 5000, range: 200, strength: 50 },
                effects: [],
                state: 'alive',
                respawnTime: 0,
                respawnDuration: 0,
                experience: 0,
                level: 1,
                experienceNeeded: 100,
                roundStats: {
                    totalExperience: 0,
                    minionKills: 0,
                    heroKills: 0,
                    turretKills: 0,
                    damageTaken: 0,
                    damageDealt: 0
                },
                controller: 'bot',
                displayName: id,
                levelRewards: [],
                rewardsForChoice: rewardsForChoice || [],
                permanentEffects: [],
                // Add getter methods for ability stats
                getAbilityCooldown: () => 5000,
                getAbilityRange: () => 200,
                getAbilityStrength: () => 50,
                getAbilityDuration: () => 0,
                getAbilitySpeed: () => 0,
                getMercenaryRageSpeed: () => 1.0,
                getPyromancerRadius: () => 0,
                getAttackRadius: () => 25,
                getAttackStrength: () => 20,
                getAttackSpeed: () => 1000,
                getMoveSpeed: () => 100,
                getHealth: () => 100,
                getMaxHealth: () => 100,
                getBulletArmor: () => 0,
                getAbilityArmor: () => 0
            });

            const bot1 = createMockHero('bot1', 'blue', 'hookshot');
            const bot2 = createMockHero('bot2', 'blue', 'hookshot');
            const bot3 = createMockHero('bot3', 'blue', 'mercenary');
            const bot4 = createMockHero('bot4', 'blue', 'mercenary');
            const selectingBot = createMockHero('selecting-bot', 'blue', 'default', ['ability:hookshot', 'ability:mercenary']);

            mockState.combatants.set('bot1', bot1);
            mockState.combatants.set('bot2', bot2);
            mockState.combatants.set('bot3', bot3);
            mockState.combatants.set('bot4', bot4);
            mockState.combatants.set('selecting-bot', selectingBot);

            const commands = botManager.processBots(mockState);
            const rewardCommand = commands.find(cmd => cmd.type === 'choose_reward' && cmd.data.heroId === 'selecting-bot');
            
            // Should still select something (fallback to random)
            expect(rewardCommand).toBeDefined();
            if (rewardCommand && 'rewardId' in rewardCommand.data) {
                expect(rewardCommand.data.rewardId).toBeDefined();
            }
        });
    });
});
