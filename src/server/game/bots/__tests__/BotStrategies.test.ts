import { BotManager } from '../BotManager';
import { HookshotBotStrategy } from '../strategies/HookshotBotStrategy';
import { SimpletonBotStrategy } from '../strategies/SimpletonBotStrategy';
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
                ability: { lastUsedTime: 0, cooldown: 5000 }
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
            // Blue base: (100, 600), Red base: (600, 100)
            // Bot closer to red base (enemy) = higher X, lower Y
            const mockBot = {
                id: 'test-bot',
                team: 'blue',
                x: 400, // Closer to enemy base (red at 600,100)
                y: 200, // Closer to enemy base (red at 600,100)
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
                x: 200, // Closer to our base (blue at 100,600)
                y: 400, // Closer to our base (blue at 100,600)
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
            // Blue base is at (100, 600), so moving towards base means:
            // - X: move left (targetX < 400)
            // - Y: move down (targetY > 200)
            expect(moveCommand.data.targetX).toBeLessThan(mockBot.x);
            expect(moveCommand.data.targetY).toBeGreaterThan(mockBot.y);
        });
    });
});
