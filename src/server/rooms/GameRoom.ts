import { Room, Client } from '@colyseus/core';
import { GameState } from '../schema/GameState';
import { SERVER_CONFIG } from '../../ServerConfig';
import { GameEngine } from '../game/GameEngine';
import { BotManager } from '../game/bots/BotManager';
import { gameStateToString } from '../../shared/utils/DebugUtils';
import { ControllerId, CombatantId, COMBATANT_TYPES } from '../../shared/types/CombatantTypes';
import { GameCommand, GameMoveCommand, GameUseAbilityCommand } from '../../shared/types/GameCommands';
import { RewardManager } from '../game/rewards/RewardManager';
import { GameplayConfig } from '../config/ConfigProvider';

export class GameRoom extends Room<GameState> {
    maxClients = SERVER_CONFIG.MAX_CLIENTS_PER_ROOM;
    private commands: GameCommand[] = [];
    private lastUpdateTime = 0;
    private gameEngine!: GameEngine;
    private botManager!: BotManager;
    private restartTimer: NodeJS.Timeout | null = null;
    private gameplayConfig!: GameplayConfig;


    onCreate(options: any) {
        // Initialize gameplay config from options
        this.gameplayConfig = options.gameplayConfig;
        
        this.initializeGame();
        this.setupMessageHandlers();
    }

    private initializeGame() {
        console.log('Initializing game...');
        
        // Clear any existing restart timer
        if (this.restartTimer) {
            clearTimeout(this.restartTimer);
            this.restartTimer = null;
        }
        
        // Initialize empty game state
        const gameState = new GameState();
        gameState.gameTime = 0;
        gameState.gamePhase = 'playing';
        gameState.winningTeam = '';
        gameState.gameEndTime = 0;
        
        this.setState(gameState);
        
        // Serialize gameplay config for client
        this.state.gameplayConfig = JSON.stringify(this.gameplayConfig);
        
        // Initialize game engine with the same state reference
        this.gameEngine = new GameEngine(this.state, this.gameplayConfig);
        this.gameEngine.setupGame();

        // Initialize bot manager
        this.botManager = new BotManager(this.gameplayConfig);

        // Spawn bots
        this.spawnBots();

        console.log("Game Initialized:", gameStateToString(this.state));
        
        // Set up fixed update rate
        this.setSimulationInterval(() => this.update(), SERVER_CONFIG.UPDATE_RATE_MS);
    }

    private setupMessageHandlers() {
        this.onMessage('move', (client, data) => {
            const heroId = this.findHeroByController(client.sessionId);
            if (heroId) {
                this.commands.push({
                    type: 'move',
                    data: {
                        heroId: heroId,
                        targetX: data.targetX,
                        targetY: data.targetY
                    }
                });
            }
        });
        
        this.onMessage('useAbility', (client, data) => {
            const heroId = this.findHeroByController(client.sessionId);
            if (heroId) {
                this.commands.push({
                    type: 'useAbility',
                    data: {
                        heroId: heroId,
                        x: data.x,
                        y: data.y
                    }
                });
            }
        });

        this.onMessage('choose_reward', (client, data) => {
            const heroId = this.findHeroByController(client.sessionId);
            if (heroId) {
                this.commands.push({
                    type: 'choose_reward',
                    data: {
                        heroId: heroId,
                        rewardId: data.rewardId
                    }
                });
            }
        });

        this.onMessage('debugKill', (client) => {
            // Only allow debug kill if enabled in config
            if (this.gameplayConfig.DEBUG.CHEAT_KILL_PLAYER_ENABLED) {
                const heroId = this.findHeroByController(client.sessionId);
                if (heroId) {
                    this.gameEngine.debugKill(heroId);
                }
            }
        });

        this.onMessage('instantRespawn', (client) => {
            // Only allow instant respawn if enabled in config
            if (this.gameplayConfig.DEBUG.CHEAT_INSTANT_RESPAWN_ENABLED) {
                const heroId = this.findHeroByController(client.sessionId);
                if (heroId) {
                    this.gameEngine.instantRespawn(heroId);
                }
            }
        });

        this.onMessage('toggleHero', (client) => {
            this.handleToggleHero(client.sessionId);
        });
    }

    onJoin(client: Client, options: any) {
        console.log(`${client.sessionId} joined`);
        
        // Determine team based on current player hero count (excluding bots)
        const currentPlayerHeroCount = Array.from(this.state.combatants.values())
            .filter(c => c.type === COMBATANT_TYPES.HERO && !(c as any).controller.startsWith('bot')).length;
        const team = currentPlayerHeroCount % 2 === 0 
            ? SERVER_CONFIG.ROOM.TEAM_ASSIGNMENT.EVEN_PLAYER_COUNT_TEAM 
            : SERVER_CONFIG.ROOM.TEAM_ASSIGNMENT.ODD_PLAYER_COUNT_TEAM;
        
        // Try to replace a bot on the appropriate team
        const replacedBot = this.replaceBotWithPlayer(client.sessionId, team);
        
        if (!replacedBot) {
            // If no bot to replace, spawn a new hero
            this.gameEngine.spawnControlledHero(client.sessionId, team);
            // The hero ID will be set in the next update cycle when we process the spawn action
        }
    }

    onLeave(client: Client, consented: boolean) {
        console.log(`${client.sessionId} left`);
        
        // Find the hero controlled by this player and replace it with a bot
        this.replacePlayerWithBot(client.sessionId);
    }

    onDispose() {
        console.log('Room disposed');
    }

    private update() {
        // Don't update if the game is finished
        if (this.state.gamePhase === 'finished') {
            return;
        }
        
        // Update game engine with time delta
        const currentTime = this.state.gameTime;
        const deltaTime = this.lastUpdateTime === 0 ? SERVER_CONFIG.UPDATE_RATE_MS : currentTime - this.lastUpdateTime;
        this.lastUpdateTime = currentTime;
        const result = this.gameEngine.update(deltaTime);
        // Handle game over events
        if (result && result.events) {
            this.handleGameEvents(result.events);
        }



        // Process bot commands
        const botCommands = this.botManager.processBots(this.state);
        this.commands.push(...botCommands);

        // Process all commands
        this.processCommands();
        
        // Clear commands for next frame
        this.commands = [];
    }

    private processCommands() {
        // Group move commands by hero and take the latest from each
        const latestMoveCommands = new Map<CombatantId, GameCommand>();
        const otherCommands: GameCommand[] = [];
        
        this.commands.forEach(command => {
            if (command.type === 'move') {
                latestMoveCommands.set(command.data.heroId, command);
            } else {
                otherCommands.push(command);
            }
        });
        
        // Process latest move commands
        latestMoveCommands.forEach(command => {
            this.processCommand(command);
        });
        
        // Process all other commands
        otherCommands.forEach(command => {
            this.processCommand(command);
        });
    }

    private processCommand(command: GameCommand) {
        switch (command.type) {
            case 'move':
                this.handleMoveCommand(command);
                break;
            case 'useAbility':
                this.handleUseAbilityCommand(command);
                break;
            case 'choose_reward':
                this.handleChooseRewardCommand(command);
                break;
            default:
                console.log(`Unknown command type: ${(command as any).type}`);
        }
    }

    private handleMoveCommand(command: GameMoveCommand) {
        this.gameEngine.moveHero(command.data.heroId, command.data.targetX, command.data.targetY);
    }

    private handleUseAbilityCommand(command: GameUseAbilityCommand) {
        this.gameEngine.useAbility(command.data.heroId, command.data.x, command.data.y);
    }

    private handleChooseRewardCommand(command: any) {
        const hero = this.state.combatants.get(command.data.heroId);
        if (hero && hero.type === COMBATANT_TYPES.HERO) {
            const heroCombatant = hero as any; // Cast to access levelRewards
            if (heroCombatant.levelRewards && heroCombatant.levelRewards.length > 0) {
                // Apply the chosen reward
                const success = RewardManager.applyReward(heroCombatant, command.data.rewardId, this.state.gameTime, this.gameplayConfig);
                if (success) {
                    // Remove the chest from levelRewards and clear rewardsForChoice
                    heroCombatant.levelRewards.splice(0, 1);
                    heroCombatant.rewardsForChoice.clear();
                    
                    // Generate new reward choices for the next chest if there are more
                    if (heroCombatant.levelRewards.length > 0) {
                        const nextChestType = heroCombatant.levelRewards[0];
                        const rewards = RewardManager.generateRewardsFromChest(nextChestType, this.gameplayConfig);
                        heroCombatant.rewardsForChoice.push(...rewards);
                    }
                    
                    console.log(`Reward applied: ${command.data.rewardId} by player ${heroCombatant.controller}, remaining chests: ${heroCombatant.levelRewards.length}`);
                } else {
                    console.warn(`Failed to apply reward: ${command.data.rewardId} by player ${heroCombatant.controller}`);
                }
            }
        }
    }


    private findHeroByController(controllerId: ControllerId): CombatantId | null {
        for (const [heroId, combatant] of this.state.combatants.entries()) {
            if (combatant.type === COMBATANT_TYPES.HERO && (combatant as any).controller === controllerId) {
                return heroId;
            }
        }
        return null;
    }



    private spawnBots() {
        // Spawn bots at different positions around the cradles
        const blueSpawnPositions = this.gameplayConfig.HERO_SPAWN_POSITIONS.BLUE;
        const redSpawnPositions = this.gameplayConfig.HERO_SPAWN_POSITIONS.RED;
        const botAbilityTypes = this.gameplayConfig.BOTS.ABILITY_TYPES;
        const botsPerTeam = this.gameplayConfig.BOTS.BOTS_PER_TEAM;
        
        // Spawn bots for each team
        this.spawnBotsForTeam('blue', blueSpawnPositions, botAbilityTypes, botsPerTeam);
        this.spawnBotsForTeam('red', redSpawnPositions, botAbilityTypes, botsPerTeam);
    }

    private spawnBotsForTeam(team: 'blue' | 'red', spawnPositions: readonly any[], botAbilityTypes: readonly string[], botsPerTeam: number) {
        for (let i = 0; i < botsPerTeam; i++) {
            const spawnPosition = spawnPositions[i % spawnPositions.length];
            const abilityType = botAbilityTypes[i % botAbilityTypes.length];
            
            // Spawn bot with generic 'bot' controller - strategy will be determined dynamically
            this.gameEngine.spawnControlledHero('bot', team, spawnPosition, abilityType);
        }
    }


    private replaceBotWithPlayer(playerId: ControllerId, team: string): boolean {
        // Find a bot on the specified team to replace
        let botToReplace: any = null;
        this.state.combatants.forEach((combatant: any) => {
            if (combatant.type === COMBATANT_TYPES.HERO && 
                combatant.controller.startsWith('bot') && 
                combatant.team === team && 
                !botToReplace) {
                botToReplace = combatant;
            }
        });
        
        if (botToReplace) {
            // Replace the bot's controller with the player
            botToReplace.controller = playerId;
            console.log(`Replaced bot ${botToReplace.id} with player ${playerId} on team ${team}`);
            return true;
        }
        
        return false;
    }

    private replacePlayerWithBot(playerId: ControllerId): void {
        // Find the hero controlled by this player
        let playerHero: any = null;
        this.state.combatants.forEach((combatant: any) => {
            if (combatant.type === COMBATANT_TYPES.HERO && combatant.controller === playerId) {
                playerHero = combatant;
            }
        });
        
        if (playerHero) {
            // Replace the player's controller with a bot
            this.assignBotStrategyToHero(playerHero);
            console.log(`Replaced player ${playerId} with bot on hero ${playerHero.id} (${playerHero.ability?.type || 'default'})`);
        }
    }

    private assignBotStrategyToHero(hero: any): void {
        // Assign generic 'bot' controller - strategy will be determined dynamically
        hero.controller = 'bot';
    }



    private handleToggleHero(playerId: ControllerId): void {
        // Find current hero controlled by the player
        let currentHero: any = null;
        this.state.combatants.forEach((combatant: any) => {
            if (combatant.type === COMBATANT_TYPES.HERO && combatant.controller === playerId) {
                currentHero = combatant;
            }
        });

        if (!currentHero) {
            console.log(`No hero found for player ${playerId}`);
            return;
        }

        // Get all heroes on the same team
        const teamHeroes: any[] = [];
        this.state.combatants.forEach((combatant: any) => {
            if (combatant.type === COMBATANT_TYPES.HERO && combatant.team === currentHero.team) {
                teamHeroes.push(combatant);
            }
        });

        // Sort heroes by ID for consistent ordering
        teamHeroes.sort((a, b) => a.id.localeCompare(b.id));

        // Find current hero index
        const currentIndex = teamHeroes.findIndex(hero => hero.id === currentHero.id);
        if (currentIndex === -1) {
            console.log(`Current hero not found in team list`);
            return;
        }

        // Get next hero (loop back to first if at end)
        const nextIndex = (currentIndex + 1) % teamHeroes.length;
        const nextHero = teamHeroes[nextIndex];

        // Give the next hero to the player
        nextHero.controller = playerId;
        
        // Give the current hero back to bot control with the appropriate strategy for its ability type
        this.assignBotStrategyToHero(currentHero);

        console.log(`Player ${playerId} switched from hero ${currentHero.id} (${currentHero.ability?.type || 'default'}) to hero ${nextHero.id} (${nextHero.ability?.type || 'default'})`);
        console.log(`Previous hero now controlled by ${currentHero.controller}`);
    }


    private handleGameEvents(events: any[]): void {
        events.forEach(event => {
            switch (event.type) {
                case 'GAME_OVER':
                    this.handleGameOver(event.payload);
                    break;
                default:
                    console.log('Unknown game event type:', event.type);
            }
        });
    }

    private handleGameOver(payload: any): void {
        console.log(`Game over! Winning team: ${payload.winningTeam}`);
        
        // Set a timer to restart the game after a few seconds
        if (this.restartTimer) {
            clearTimeout(this.restartTimer);
        }
        
        this.restartTimer = setTimeout(() => {
            this.restartGame();
        }, SERVER_CONFIG.ROOM.GAME_RESTART_DELAY_MS);
    }

    private restartGame(): void {
        console.log('Restarting game...');
        
        // Clear restart timer
        if (this.restartTimer) {
            clearTimeout(this.restartTimer);
            this.restartTimer = null;
        }
        
        // Clear any pending commands
        this.commands = [];
        
        // Reset update time
        this.lastUpdateTime = 0;
        
        // Store existing players before resetting
        const existingPlayers = Array.from(this.clients).map(client => client.sessionId);
        
        // Instead of disconnecting clients, reset the game state
        // This keeps the room alive and allows clients to continue playing
        this.initializeGame();
        
        // Reassign existing players to new heroes
        existingPlayers.forEach((playerId, index) => {
            const team = index % 2 === 0 
                ? SERVER_CONFIG.ROOM.TEAM_ASSIGNMENT.EVEN_PLAYER_COUNT_TEAM 
                : SERVER_CONFIG.ROOM.TEAM_ASSIGNMENT.ODD_PLAYER_COUNT_TEAM;
            
            // Try to replace a bot on the appropriate team
            const replacedBot = this.replaceBotWithPlayer(playerId, team);
            
            if (!replacedBot) {
                // If no bot to replace, spawn a new hero
                this.gameEngine.spawnControlledHero(playerId, team);
            }
        });
        
        // Notify clients that the game has restarted
        this.broadcast('gameRestarted', {});
    }



} 
