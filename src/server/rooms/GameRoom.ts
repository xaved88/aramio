import { Room, Client } from '@colyseus/core';
import { GameState, Player, Cradle, Combatant } from '../schema/GameState';
import { SERVER_CONFIG, GAMEPLAY_CONFIG } from '../../Config';
import { CombatantUtils } from '../game/combatants/CombatantUtils';
import { GameEngine, GamePhase } from '../game/GameEngine';

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
        const gameState = new GameState();
        gameState.gameTime = 0;
        gameState.gamePhase = GamePhase.PLAYING;
        
        // Create blue cradle (bottom left)
        const blueCradle = new Cradle();
        blueCradle.id = 'blue-cradle';
        blueCradle.x = GAMEPLAY_CONFIG.CRADLE_POSITIONS.BLUE.x;
        blueCradle.y = GAMEPLAY_CONFIG.CRADLE_POSITIONS.BLUE.y;
        blueCradle.team = 'blue';
        blueCradle.health = GAMEPLAY_CONFIG.CRADLE_HEALTH;
        blueCradle.maxHealth = GAMEPLAY_CONFIG.CRADLE_MAX_HEALTH;
        blueCradle.attackRadius = GAMEPLAY_CONFIG.COMBAT.CRADLE.ATTACK_RADIUS;
        blueCradle.attackStrength = GAMEPLAY_CONFIG.COMBAT.CRADLE.ATTACK_STRENGTH;
        blueCradle.attackSpeed = GAMEPLAY_CONFIG.COMBAT.CRADLE.ATTACK_SPEED;
        blueCradle.lastAttackTime = 0;
        gameState.blueCradle = blueCradle;
        
        // Create red cradle (top right)
        const redCradle = new Cradle();
        redCradle.id = 'red-cradle';
        redCradle.x = GAMEPLAY_CONFIG.CRADLE_POSITIONS.RED.x;
        redCradle.y = GAMEPLAY_CONFIG.CRADLE_POSITIONS.RED.y;
        redCradle.team = 'red';
        redCradle.health = GAMEPLAY_CONFIG.CRADLE_HEALTH;
        redCradle.maxHealth = GAMEPLAY_CONFIG.CRADLE_MAX_HEALTH;
        redCradle.attackRadius = GAMEPLAY_CONFIG.COMBAT.CRADLE.ATTACK_RADIUS;
        redCradle.attackStrength = GAMEPLAY_CONFIG.COMBAT.CRADLE.ATTACK_STRENGTH;
        redCradle.attackSpeed = GAMEPLAY_CONFIG.COMBAT.CRADLE.ATTACK_SPEED;
        redCradle.lastAttackTime = 0;
        gameState.redCradle = redCradle;
        
        this.setState(gameState);
        
        // Initialize game engine
        this.gameEngine = new GameEngine(gameState);
        
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
        const player = new Player();
        player.id = client.sessionId;
        player.team = this.state.players.size % 2 === 0 ? 'blue' : 'red';
        
        // Spawn player near their team's cradle
        if (player.team === 'blue') {
            player.x = GAMEPLAY_CONFIG.CRADLE_POSITIONS.BLUE.x + GAMEPLAY_CONFIG.PLAYER_SPAWN_OFFSET;
            player.y = GAMEPLAY_CONFIG.CRADLE_POSITIONS.BLUE.y - GAMEPLAY_CONFIG.PLAYER_SPAWN_OFFSET;
        } else {
            player.x = GAMEPLAY_CONFIG.CRADLE_POSITIONS.RED.x - GAMEPLAY_CONFIG.PLAYER_SPAWN_OFFSET;
            player.y = GAMEPLAY_CONFIG.CRADLE_POSITIONS.RED.y + GAMEPLAY_CONFIG.PLAYER_SPAWN_OFFSET;
        }
        
        player.health = GAMEPLAY_CONFIG.COMBAT.PLAYER.HEALTH;
        player.maxHealth = GAMEPLAY_CONFIG.COMBAT.PLAYER.MAX_HEALTH;
        player.attackRadius = GAMEPLAY_CONFIG.COMBAT.PLAYER.ATTACK_RADIUS;
        player.attackStrength = GAMEPLAY_CONFIG.COMBAT.PLAYER.ATTACK_STRENGTH;
        player.attackSpeed = GAMEPLAY_CONFIG.COMBAT.PLAYER.ATTACK_SPEED;
        player.lastAttackTime = 0;
        this.state.players.set(client.sessionId, player);
    }

    onLeave(client: Client, consented: boolean) {
        console.log(`${client.sessionId} left`);
        this.state.players.delete(client.sessionId);
    }

    onDispose() {
        console.log('Room disposed');
    }

    private update() {
        // Update game engine
        this.gameEngine.update(SERVER_CONFIG.UPDATE_RATE_MS);
        
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
        const player = this.state.players.get(command.clientId);
        if (player && command.data.targetX !== undefined && command.data.targetY !== undefined) {
            const targetX = command.data.targetX;
            const targetY = command.data.targetY;
            
            // Calculate direction vector
            const dx = targetX - player.x;
            const dy = targetY - player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // If we're close enough, don't move
            if (distance < GAMEPLAY_CONFIG.PLAYER_STOP_DISTANCE) {
                return;
            }
            
            // Normalize direction and apply speed
            const normalizedDx = dx / distance;
            const normalizedDy = dy / distance;
            
            // Calculate new position
            const newX = player.x + normalizedDx * GAMEPLAY_CONFIG.PLAYER_MOVE_SPEED;
            const newY = player.y + normalizedDy * GAMEPLAY_CONFIG.PLAYER_MOVE_SPEED;
            
            // Clamp to game bounds
            player.x = Math.max(GAMEPLAY_CONFIG.GAME_BOUNDS.MIN_X, Math.min(GAMEPLAY_CONFIG.GAME_BOUNDS.MAX_X, newX));
            player.y = Math.max(GAMEPLAY_CONFIG.GAME_BOUNDS.MIN_Y, Math.min(GAMEPLAY_CONFIG.GAME_BOUNDS.MAX_Y, newY));
        }
    }
} 