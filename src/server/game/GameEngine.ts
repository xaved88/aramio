import { GameState } from '../schema/GameState';
import { GameStateMachine } from './stateMachine/GameStateMachine';
import { GameActionTypes, StateMachineResult } from './stateMachine/types';

export class GameEngine {
    private state: GameState;

    constructor(state: GameState) {
        this.state = state;
    }

    /**
     * Gets the current game state
     */
    getState(): GameState {
        return this.state;
    }

    /**
     * Processes an action and updates the state directly
     * @param action The action to process
     */
    processAction(action: GameActionTypes): void {
        const result = GameStateMachine.processAction(this.state, action);
        // The state machine now returns the same state reference, so no need to reassign
        
        // Handle any events returned by the state machine
        if (result.events) {
            this.handleEvents(result.events);
        }
    }

    /**
     * Updates the game with a time delta
     * @param deltaTime Time since last update in milliseconds
     */
    update(deltaTime: number): StateMachineResult {
        const result = GameStateMachine.processAction(this.state, {
            type: 'UPDATE_GAME',
            payload: { deltaTime }
        });
        
        // Handle any events returned by the state machine
        if (result.events) {
            this.handleEvents(result.events);
        }
        
        return result;
    }

    /**
     * Sets up the initial game state with cradles and turrets
     */
    setupGame(): void {
        this.processAction({ type: 'SETUP_GAME' });
    }

    /**
     * Spawns a new player
     * @param playerId The player's ID
     * @param team The player's team
     */
    spawnPlayer(playerId: string, team: 'blue' | 'red'): void {
        this.processAction({
            type: 'SPAWN_PLAYER',
            payload: { playerId, team }
        });
    }

    /**
     * Removes a player (for disconnections)
     * @param playerId The player's ID
     */
    removePlayer(playerId: string): void {
        this.processAction({
            type: 'REMOVE_PLAYER',
            payload: { playerId }
        });
    }

    /**
     * Moves a player to a target position
     * @param playerId The player's ID
     * @param targetX Target X coordinate
     * @param targetY Target Y coordinate
     */
    movePlayer(playerId: string, targetX: number, targetY: number): void {
        this.processAction({
            type: 'MOVE_PLAYER',
            payload: { playerId, targetX, targetY }
        });
    }

    /**
     * Uses a player's ability at the specified coordinates
     * @param playerId The player's ID
     * @param x X coordinate where ability was used
     * @param y Y coordinate where ability was used
     */
    useAbility(playerId: string, x: number, y: number): void {
        const player = this.state.combatants.get(playerId) as any;
        if (!player || player.type !== 'player') {
            console.log(`Ability use failed: Player ${playerId} not found or not a player`);
            return;
        }

        const currentTime = Date.now();
        
        // If lastUsedTime is 0, the ability hasn't been used yet, so it's available
        if (player.ability.lastUsedTime === 0) {
            console.log('Ability used (first time)');
            player.ability.lastUsedTime = currentTime;
            return;
        }
        
        const timeSinceLastUse = currentTime - player.ability.lastUsedTime;
        if (timeSinceLastUse < player.ability.cooldown) {
            return; // Ability is on cooldown
        }

        console.log('Ability used');
        player.ability.lastUsedTime = currentTime;
    }

    /**
     * Ends the game with a winner
     * @param winningTeam The team that won
     */
    endGame(winningTeam: 'blue' | 'red'): void {
        this.processAction({
            type: 'END_GAME',
            payload: { winningTeam }
        });
    }



    /**
     * Handles events returned by the state machine
     * @param events Array of events to handle
     */
    private handleEvents(events: any[]): void {
        events.forEach(event => {
            switch (event.type) {
                case 'SETUP_GAME':
                    this.setupGame();
                    break;
                case 'GAME_OVER':
                    // This event will be handled by the room
                    console.log(`Game over event triggered with winning team: ${event.payload.winningTeam}`);
                    break;
                default:
                    console.log('Unknown event type:', event.type);
            }
        });
    }
} 