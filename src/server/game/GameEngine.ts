import { GameState } from '../schema/GameState';
import { GameStateMachine } from './stateMachine/GameStateMachine';
import { GameActionTypes } from './stateMachine/types';

export class GameEngine {
    private currentState: GameState;

    constructor(initialState: GameState) {
        this.currentState = initialState;
    }

    /**
     * Gets the current game state
     */
    getState(): GameState {
        return this.currentState;
    }

    /**
     * Processes an action and updates the internal state
     * @param action The action to process
     */
    processAction(action: GameActionTypes): void {
        const result = GameStateMachine.processAction(this.currentState, action);
        this.currentState = result.newState;
        
        // Handle any events returned by the state machine
        if (result.events) {
            this.handleEvents(result.events);
        }
    }

    /**
     * Updates the game with a time delta
     * @param deltaTime Time since last update in milliseconds
     */
    update(deltaTime: number): void {
        this.processAction({
            type: 'UPDATE_GAME',
            payload: { deltaTime }
        });
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
        // For now, we don't have any events to handle
        // This could be used for things like notifications, achievements, etc.
        events.forEach(event => {
            console.log('Game event:', event);
        });
    }
} 