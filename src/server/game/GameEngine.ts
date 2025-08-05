import { GameState } from '../schema/GameState';
import { GameStateMachine } from './stateMachine/GameStateMachine';
import { GameActionTypes, StateMachineResult } from './stateMachine/types';
import { GAMEPLAY_CONFIG } from '../../Config';
import { CLIENT_CONFIG } from '../../Config';
import { CombatantUtils } from './combatants/CombatantUtils';

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
        
        // Update projectiles
        this.updateProjectiles(deltaTime);
        
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
    spawnPlayer(playerId: string, team: 'blue' | 'red', position?: { x: number, y: number }): void {
        this.processAction({
            type: 'SPAWN_PLAYER',
            payload: { 
                playerId, 
                team,
                ...(position && { x: position.x, y: position.y })
            }
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
     * Moves a hero to a target position
     * @param heroId The hero's ID
     * @param targetX Target X coordinate
     * @param targetY Target Y coordinate
     */
    moveHero(heroId: string, targetX: number, targetY: number): void {
        this.processAction({
            type: 'MOVE_HERO',
            payload: { heroId, targetX, targetY }
        });
    }

    /**
     * Uses a player's ability at the specified coordinates
     * @param playerId The player's ID
     * @param x X coordinate where ability was used
     * @param y Y coordinate where ability was used
     */
    useAbility(playerId: string, x: number, y: number): void {
        // Find hero by controller (client ID)
        let player: any = null;
        this.state.combatants.forEach((combatant: any) => {
            if (combatant.controller === playerId) {
                player = combatant;
            }
        });
        
        if (!player || player.type !== 'hero') {
            return;
        }

        // Prevent respawning entities from firing projectiles
        if (player.state === 'respawning') {
            return;
        }

        const currentTime = Date.now();
        
        // If lastUsedTime is 0, the ability hasn't been used yet, so it's available
        if (player.ability.lastUsedTime === 0) {
            player.ability.lastUsedTime = currentTime;
            this.createProjectile(playerId, x, y);
            return;
        }
        
        const timeSinceLastUse = currentTime - player.ability.lastUsedTime;
  
        if (timeSinceLastUse < player.ability.cooldown) {
            return; // Ability is on cooldown
        }

        player.ability.lastUsedTime = currentTime;
        this.createProjectile(playerId, x, y);
    }

    private createProjectile(playerId: string, targetX: number, targetY: number): void {
        // Find hero by controller (client ID)
        let player: any = null;
        this.state.combatants.forEach((combatant: any) => {
            if (combatant.controller === playerId) {
                player = combatant;
            }
        });
        if (!player) return;

        // Calculate direction from player to target
        const dx = targetX - player.x;
        const dy = targetY - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance === 0) return; // Can't shoot at self
        
        // Normalize direction
        const directionX = dx / distance;
        const directionY = dy / distance;
        
        // Create projectile
        const projectile = new (require('../schema/GameState').Projectile)();
        projectile.id = `projectile_${Date.now()}_${Math.random()}`;
        projectile.ownerId = playerId;
        projectile.x = player.x;
        projectile.y = player.y;
        projectile.directionX = directionX;
        projectile.directionY = directionY;
        projectile.speed = GAMEPLAY_CONFIG.COMBAT.PLAYER.ABILITY.SPEED;
        projectile.strength = player.ability.strength;
        projectile.team = player.team;
        
        this.state.projectiles.set(projectile.id, projectile);
    }

    private updateProjectiles(deltaTime: number): void {
        const projectilesToRemove: string[] = [];
        
        this.state.projectiles.forEach((projectile: any) => {
            // Move projectile
            const distance = (projectile.speed * deltaTime) / 1000; // Convert to pixels
            projectile.x += projectile.directionX * distance;
            projectile.y += projectile.directionY * distance;
            
            // Check bounds
            if (projectile.x < 0 || projectile.x > CLIENT_CONFIG.GAME_CANVAS_WIDTH || 
                projectile.y < 0 || projectile.y > CLIENT_CONFIG.GAME_CANVAS_HEIGHT) {
                projectilesToRemove.push(projectile.id);
                return;
            }
            
            // Check collision with combatants - find the closest enemy
            let closestCombatant: any = null;
            let closestDistance = Infinity;
            
            this.state.combatants.forEach((combatant: any) => {
                if (combatant.team === projectile.team) return; // Don't hit allies
                if (combatant.health <= 0) return; // Don't hit dead entities
                
                const dx = projectile.x - combatant.x;
                const dy = projectile.y - combatant.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                // Check if projectile hits the combatant's collision radius (unit size + projectile radius)
                const collisionRadius = combatant.size + CLIENT_CONFIG.PROJECTILE.RADIUS;
                if (distance < collisionRadius && distance < closestDistance) {
                    closestCombatant = combatant;
                    closestDistance = distance;
                }
            });
            
            // If we found a target, hit it and remove the projectile
            if (closestCombatant) {
                projectilesToRemove.push(projectile.id);
                
                // Only damage units (players and minions), not structures
                if (closestCombatant.type === 'hero' || closestCombatant.type === 'minion') {
                    CombatantUtils.damageCombatant(closestCombatant, projectile.strength);
                }
            }
        });
        
        // Remove projectiles that hit something or went out of bounds
        projectilesToRemove.forEach(projectileId => {
            this.state.projectiles.delete(projectileId);
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
