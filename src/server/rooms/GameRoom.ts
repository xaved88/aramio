import { Room, Client } from '@colyseus/core';
import { GameState } from '../schema/GameState';
import { SERVER_CONFIG } from '../../ServerConfig';
import { GameEngine } from '../game/GameEngine';
import { BotManager } from '../game/bots/BotManager';
import { gameStateToString } from '../../shared/utils/DebugUtils';
import { ControllerId, CombatantId, COMBATANT_TYPES } from '../../shared/types/CombatantTypes';
import { GameCommand, GameMoveCommand, GameUseAbilityCommand } from '../../shared/types/GameCommands';
import { RewardManager } from '../game/rewards/RewardManager';
import { GameplayConfig, configProvider } from '../config/ConfigProvider';

export class GameRoom extends Room<GameState> {
    maxClients = SERVER_CONFIG.MAX_CLIENTS_PER_ROOM;
    private commands: GameCommand[] = [];
    private lastMoveCommands: Map<CombatantId, GameMoveCommand> = new Map();
    private lastUpdateTime = 0;
    private gameEngine!: GameEngine;
    private botManager!: BotManager;
    private restartTimer: NodeJS.Timeout | null = null;
    private gameplayConfig!: GameplayConfig;
    private lobbyData: any = null;


    onCreate(options: any) {
        // Store lobby data if provided
        this.lobbyData = options.lobbyData || null;

        // Initialize gameplay config from selected lobby config if present, otherwise fallback to provided or default
        const selectedConfigName: string | undefined = this.lobbyData?.selectedConfig;
        if (selectedConfigName) {
            try {
                this.gameplayConfig = configProvider.loadConfig(selectedConfigName);
                console.log(`GameRoom loaded config from lobby selection: ${selectedConfigName}`);
            } catch (e) {
                console.warn(`Failed to load selected config '${selectedConfigName}', falling back to default`);
                this.gameplayConfig = options.gameplayConfig;
            }
        } else {
            this.gameplayConfig = options.gameplayConfig;
        }
        
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
                console.log(`Ability used by ${client.sessionId} (hero: ${heroId}) at (${data.x}, ${data.y})`);
                this.commands.push({
                    type: 'useAbility',
                    data: {
                        heroId: heroId,
                        x: data.x,
                        y: data.y
                    }
                });
            } else {
                console.warn(`No hero found for controller ${client.sessionId} when trying to use ability`);
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
        
        let team: 'blue' | 'red';
        const playerLobbyId: string | undefined = options?.playerLobbyId;
        
        // If we have lobby data, find the player's team from lobby
        if (this.lobbyData) {
            const lobbyTeam = this.getPlayerTeamFromLobby(playerLobbyId || client.sessionId);
            if (lobbyTeam) {
                team = lobbyTeam;
            } else {
                console.warn(`Player ${client.sessionId} not found in lobby data, using default team assignment`);
                // Fall back to default team assignment
                const currentPlayerHeroCount = Array.from(this.state.combatants.values())
                    .filter(c => c.type === COMBATANT_TYPES.HERO && !(c as any).controller.startsWith('bot')).length;
                team = currentPlayerHeroCount % 2 === 0 
                    ? SERVER_CONFIG.ROOM.TEAM_ASSIGNMENT.EVEN_PLAYER_COUNT_TEAM 
                    : SERVER_CONFIG.ROOM.TEAM_ASSIGNMENT.ODD_PLAYER_COUNT_TEAM;
            }
        } else {
            // Determine team based on current player hero count (excluding bots)
            const currentPlayerHeroCount = Array.from(this.state.combatants.values())
                .filter(c => c.type === COMBATANT_TYPES.HERO && !(c as any).controller.startsWith('bot')).length;
            team = currentPlayerHeroCount % 2 === 0 
                ? SERVER_CONFIG.ROOM.TEAM_ASSIGNMENT.EVEN_PLAYER_COUNT_TEAM 
                : SERVER_CONFIG.ROOM.TEAM_ASSIGNMENT.ODD_PLAYER_COUNT_TEAM;
        }
        
        // Try to replace a bot on the appropriate team
        const replacedBot = this.replaceBotWithPlayer(client.sessionId, team);
        
        if (!replacedBot) {
            // If no bot to replace, spawn a new hero
            this.gameEngine.spawnControlledHero(client.sessionId, team);
            // The hero ID will be set in the next update cycle when we process the spawn action
        }
        
        // Update player name from lobby data if available
        this.updatePlayerNameFromLobby(playerLobbyId || client.sessionId, client.sessionId);
    }

    onLeave(client: Client, consented: boolean) {
        console.log(`${client.sessionId} left`);
        
        // Find the hero controlled by this player and clean up their move command
        const heroId = this.findHeroByController(client.sessionId);
        if (heroId) {
            this.lastMoveCommands.delete(heroId);
        }
        
        // Replace player with a bot
        this.replacePlayerWithBot(client.sessionId);
        
        // Check if there are any human players left
        this.checkForEmptyRoom();
    }

    onDispose() {
        console.log('Room disposed');
    }

    private checkForEmptyRoom(): void {
        // Count human players (non-bot controllers)
        let humanPlayerCount = 0;
        this.state.combatants.forEach((combatant: any) => {
            if (combatant.type === COMBATANT_TYPES.HERO && 
                combatant.controller && 
                !combatant.controller.startsWith('bot')) {
                humanPlayerCount++;
            }
        });

        // If no human players left, destroy the room after a short delay
        if (humanPlayerCount === 0) {
            console.log('No human players left in game room, destroying in 5 seconds...');
            setTimeout(() => {
                // Double-check that no humans joined in the meantime
                let currentHumanCount = 0;
                this.state.combatants.forEach((combatant: any) => {
                    if (combatant.type === COMBATANT_TYPES.HERO && 
                        combatant.controller && 
                        !combatant.controller.startsWith('bot')) {
                        currentHumanCount++;
                    }
                });

                if (currentHumanCount === 0) {
                    console.log('Destroying empty game room');
                    this.disconnect();
                } else {
                    console.log('Human players rejoined, keeping room alive');
                }
            }, SERVER_CONFIG.ROOM.EMPTY_ROOM_CLEANUP_DELAY_MS);
        }
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
                // Store the latest move command for each hero
                this.lastMoveCommands.set(command.data.heroId, command as GameMoveCommand);
            } else {
                otherCommands.push(command);
            }
        });
        
        // Process latest move commands
        latestMoveCommands.forEach(command => {
            this.processCommand(command);
        });
        
        // For heroes that didn't send move commands this frame, continue with their last move command
        // This enables Control Scheme C to work - when client stops sending move events (mouse down),
        // server continues with the last direction
        this.lastMoveCommands.forEach((lastCommand, heroId) => {
            if (!latestMoveCommands.has(heroId)) {
                // Check if hero is close to target before continuing movement
                const hero = this.state.combatants.get(heroId);
                if (hero && hero.type === 'hero') {
                    const dx = lastCommand.data.targetX - hero.x;
                    const dy = lastCommand.data.targetY - hero.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    // Only continue moving if not close to target (within stop distance)
                    if (distance > this.gameplayConfig.HERO_STOP_DISTANCE) {
                        this.processCommand(lastCommand);
                    }
                }
            }
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
                        const rewards = RewardManager.generateRewardsFromChest(nextChestType, this.gameplayConfig, heroCombatant);
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
        
        // Use lobby data if available, otherwise use config defaults
        let botsPerTeam: number;
        if (this.lobbyData) {
            // Calculate bots needed to fill team size
            const teamSize = this.lobbyData.teamSize || 5;
            botsPerTeam = teamSize; // Will be reduced by actual players in onJoin
        } else {
            botsPerTeam = this.gameplayConfig.BOTS.BOTS_PER_TEAM;
        }
        
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



    private getPlayerTeamFromLobby(lobbyPlayerId: string): 'blue' | 'red' | null {
        if (!this.lobbyData) {
            console.log('No lobby data available');
            return null;
        }
        
        console.log('Lobby data:', JSON.stringify(this.lobbyData, null, 2));
        console.log('Looking for lobby player:', lobbyPlayerId);
        
        // Check blue team
        for (const slot of this.lobbyData.blueTeam) {
            if (slot && slot.playerId === lobbyPlayerId && !slot.isBot) {
                console.log('Found player in blue team');
                return 'blue';
            }
        }
        
        // Check red team
        for (const slot of this.lobbyData.redTeam) {
            if (slot && slot.playerId === lobbyPlayerId && !slot.isBot) {
                console.log('Found player in red team');
                return 'red';
            }
        }
        
        console.log('Player not found in lobby data');
        return null;
    }

    private updatePlayerNameFromLobby(lobbyPlayerId: string, gameSessionId: string): void {
        if (!this.lobbyData) {
            console.log('No lobby data available for name update');
            return;
        }
        
        console.log('Updating player name for lobby player:', lobbyPlayerId);
        
        // Find player's name from lobby data
        let playerName: string | null = null;
        
        // Check blue team
        for (const slot of this.lobbyData.blueTeam) {
            if (slot && slot.playerId === lobbyPlayerId && !slot.isBot) {
                playerName = slot.playerName;
                console.log('Found player name in blue team:', playerName);
                break;
            }
        }
        
        // Check red team if not found in blue
        if (!playerName) {
            for (const slot of this.lobbyData.redTeam) {
                if (slot && slot.playerId === lobbyPlayerId && !slot.isBot) {
                    playerName = slot.playerName;
                    console.log('Found player name in red team:', playerName);
                    break;
                }
            }
        }
        
        // Update the hero's name if found
        if (playerName) {
            let heroFound = false;
            this.state.combatants.forEach((combatant: any) => {
                if (combatant.type === COMBATANT_TYPES.HERO && combatant.controller === gameSessionId) {
                    combatant.playerName = playerName;
                    console.log(`Updated player ${gameSessionId} name to: ${playerName}`);
                    heroFound = true;
                }
            });
            
            if (!heroFound) {
                console.log(`No hero found for player ${gameSessionId} to update name`);
            }
        } else {
            console.log(`No player name found in lobby data for lobby player ${lobbyPlayerId}`);
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
        
        // Set a timer to return to lobby after a few seconds
        if (this.restartTimer) {
            clearTimeout(this.restartTimer);
        }
        
        this.restartTimer = setTimeout(() => {
            this.returnToLobby();
        }, SERVER_CONFIG.ROOM.GAME_RESTART_DELAY_MS);
    }

    private returnToLobby(): void {
        console.log('Returning players to lobby...');
        
        // Clear restart timer
        if (this.restartTimer) {
            clearTimeout(this.restartTimer);
            this.restartTimer = null;
        }
        
        // Notify clients to return to lobby
        this.broadcast('returnToLobby', {});
        
        // Disconnect all clients so they can reconnect to lobby
        this.clients.forEach(client => {
            client.leave();
        });
        
        // Dispose the room
        this.disconnect();
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
