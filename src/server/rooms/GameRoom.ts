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

    onCreate(options: any) {
        // Initialize empty game state
        const gameState = new GameState();
        gameState.gameTime = 0;
        gameState.gamePhase = 'playing';
        
        this.setState(gameState);
        
        // Initialize game engine with the same state reference
        this.gameEngine = new GameEngine(this.state);
        this.gameEngine.setupGame();

        console.log("Game Initialized:", gameStateToString(this.state))
        
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
        // Update game engine with time delta
        const currentTime = Date.now();
        const deltaTime = this.lastUpdateTime === 0 ? SERVER_CONFIG.UPDATE_RATE_MS : currentTime - this.lastUpdateTime;
        this.lastUpdateTime = currentTime;
        
        const totalHP = getTotalCombatantHealth(this.state);
        this.gameEngine.update(deltaTime);
        const afterHp = getTotalCombatantHealth(this.state);

        if(afterHp != totalHP) {
            console.log("Server State Changed:", gameStateToString(this.state))
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

} 