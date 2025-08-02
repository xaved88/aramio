import { Room, Client } from '@colyseus/core';
import { GameState } from '../schema/GameState';
import { SERVER_CONFIG } from '../../Config';
import { GameEngine } from '../game/GameEngine';
import { getTotalCombatantHealth, gameStateToString } from '../../shared/utils/DebugUtils';

interface GameCommand {
    type: string;
    data: any;
    clientId: string;
}

export class GameRoom extends Room<GameState> {
    maxClients = SERVER_CONFIG.MAX_CLIENTS_PER_ROOM;
    private commands: GameCommand[] = [];
    private lastUpdateTime = 0;
    private gameEngine!: GameEngine;
    private restartTimer: NodeJS.Timeout | null = null;

    onCreate(options: any) {
        this.initializeGame();
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
        
        // Initialize game engine with the same state reference
        this.gameEngine = new GameEngine(this.state);
        this.gameEngine.setupGame();

        console.log("Game Initialized:", gameStateToString(this.state))
        console.log(`Room created with ${this.state.combatants.size} initial combatants`);
        
        // Set up fixed update rate
        this.setSimulationInterval(() => this.update(), SERVER_CONFIG.UPDATE_RATE_MS);
        
        this.onMessage('move', (client, data) => {
            this.commands.push({
                type: 'move',
                data: data,
                clientId: client.sessionId
            });
        });
    }

    onJoin(client: Client, options: any) {
        console.log(`${client.sessionId} joined`);
        
        // Determine team based on current player count
        const currentPlayerCount = Array.from(this.state.combatants.values())
            .filter(c => c.type === 'player').length;
        const team = currentPlayerCount % 2 === 0 ? 'blue' : 'red';
        
        // Spawn player through the game engine
        this.gameEngine.spawnPlayer(client.sessionId, team);
    }

    onLeave(client: Client, consented: boolean) {
        console.log(`${client.sessionId} left`);
        
        // Remove player through the game engine
        this.gameEngine.removePlayer(client.sessionId);
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
        const currentTime = Date.now();
        const deltaTime = this.lastUpdateTime === 0 ? SERVER_CONFIG.UPDATE_RATE_MS : currentTime - this.lastUpdateTime;
        this.lastUpdateTime = currentTime;
        
        const totalHP = getTotalCombatantHealth(this.state);
        const result = this.gameEngine.update(deltaTime);
        const afterHp = getTotalCombatantHealth(this.state);

        if(afterHp != totalHP) {
            console.log("Server State Changed:", gameStateToString(this.state))
        }

        // Handle game over events
        if (result && result.events) {
            this.handleGameEvents(result.events);
        }

        // Process all commands
        this.processCommands();
        
        // Clear commands for next frame
        this.commands = [];
    }

    private processCommands() {
        // Group commands by client and take the latest from each
        const latestCommands = new Map<string, GameCommand>();
        
        this.commands.forEach(command => {
            latestCommands.set(command.clientId, command);
        });
        
        // Process each latest command
        latestCommands.forEach(command => {
            this.processCommand(command);
        });
    }

    private processCommand(command: GameCommand) {
        switch (command.type) {
            case 'move':
                this.handleMoveCommand(command);
                break;
            default:
                console.log(`Unknown command type: ${command.type}`);
        }
    }

    private handleMoveCommand(command: GameCommand) {
        if (command.data.targetX !== undefined && command.data.targetY !== undefined) {
            this.gameEngine.movePlayer(command.clientId, command.data.targetX, command.data.targetY);
        }
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
        }, 5000); // 5 seconds delay
    }

    private restartGame(): void {
        console.log('Restarting game...');
        
        // Clear restart timer
        if (this.restartTimer) {
            clearTimeout(this.restartTimer);
            this.restartTimer = null;
        }
        
        // Disconnect all clients so they reconnect and spawn new players
        console.log(`Disconnecting ${this.clients.length} clients for restart`);
        this.clients.forEach(client => {
            console.log(`Disconnecting client: ${client.sessionId}`);
            client.leave();
        });
        
        // The room will be automatically disposed when all clients leave
        // A new room will be created when clients reconnect
    }



} 