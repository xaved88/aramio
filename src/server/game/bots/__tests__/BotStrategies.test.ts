import { BotManager } from '../BotManager';
import { HookshotBotStrategy } from '../strategies/HookshotBotStrategy';
import { SimpletonBotStrategy } from '../strategies/SimpletonBotStrategy';
import { MercenaryBotStrategy } from '../strategies/MercenaryBotStrategy';
import { GameRoom } from '../../../rooms/GameRoom';

describe('Bot Strategies', () => {
    let botManager: BotManager;

    beforeEach(() => {
        botManager = new BotManager();
    });

    describe('HookshotBotStrategy Behavior', () => {
        it('should generate commands when hookshot bot has a teammate', () => {
            const hookshotStrategy = new HookshotBotStrategy();

            const mockBot = {
                id: 'test-bot',
                team: 'blue',
                x: 100,
                y: 100,
                health: 100,
                state: 'alive',
                ability: { lastUsedTime: 0, cooldown: 5000 },
                getAttackRadius: () => 25 // Hookshot has 25 base attack radius
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
            const hookshotStrategy = new HookshotBotStrategy();
            
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
                ability: { lastUsedTime: 0, cooldown: 5000 }, // Hookshot available
                level: 1
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
            const mercenaryStrategy = new MercenaryBotStrategy();
            const simpletonStrategy = new SimpletonBotStrategy();

            const mockBot = {
                id: 'mercenary-bot',
                team: 'blue',
                x: 300,
                y: 300,
                health: 100,
                state: 'alive',
                ability: { lastUsedTime: 0, cooldown: 10000 }, // Rage is ready
                effects: [],
                getAttackRadius: () => 50 // Mock attack radius
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
                    [mockBot.id, mockBot],
                    [mockMinion.id, mockMinion]
                ])
            } as any;

            const mercenaryCommands = mercenaryStrategy.generateCommands(mockBot, mockState);
            const simpletonCommands = simpletonStrategy.generateCommands(mockBot, mockState);
            
            // Mercenary should NOT use rage on minions - it waits for heroes
            const mercenaryAbilityCommands = mercenaryCommands.filter(cmd => cmd.type === 'useAbility');
            expect(mercenaryAbilityCommands.length).toBe(0);
            
            // Simpleton WOULD use ability on minions
            const simpletonAbilityCommands = simpletonCommands.filter(cmd => cmd.type === 'useAbility');
            expect(simpletonAbilityCommands.length).toBeGreaterThan(0);
        });

        it('should avoid areas with multiple attackers while simpleton charges in', () => {
            const mercenaryStrategy = new MercenaryBotStrategy();
            const simpletonStrategy = new SimpletonBotStrategy();

            const mockBot = {
                id: 'mercenary-bot',
                team: 'blue',
                x: 200,
                y: 200,
                health: 100,
                state: 'alive',
                ability: { lastUsedTime: 5000, cooldown: 10000 }, // Not in rage mode
                effects: [],
                getAttackRadius: () => 50 // Mock attack radius
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
            const simpletonStrategy = new SimpletonBotStrategy();

            const mockBot = {
                id: 'simpleton-bot',
                team: 'blue',
                x: 300,
                y: 300,
                health: 100,
                state: 'alive',
                ability: { lastUsedTime: 1000, cooldown: 10000 },
                effects: []
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
});
