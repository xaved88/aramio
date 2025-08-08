import { GameState } from '../schema/GameState';
import { GameStateMachine } from './stateMachine/GameStateMachine';
import { GameActionTypes, StateMachineResult } from './stateMachine/types';
import { CLIENT_CONFIG } from '../../Config';
import { CombatantUtils } from './combatants/CombatantUtils';
import { ControllerId, CombatantId } from '../../shared/types/CombatantTypes';
import { AbilityUseManager } from './abilities/AbilityUseManager';

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
     * Spawns a new hero controlled by a player
     * @param controllerId The controller's ID (player session or bot strategy)
     * @param team The hero's team
     * @param position Optional position for the hero
     * @param abilityType Optional ability type for the hero
     */
    spawnControlledHero(controllerId: ControllerId, team: 'blue' | 'red', position?: { x: number, y: number }, abilityType?: string): void {
        this.processAction({
            type: 'SPAWN_PLAYER',
            payload: { 
                playerId: controllerId, 
                team,
                ...(position && { x: position.x, y: position.y }),
                ...(abilityType && { abilityType })
            }
        });
    }



    /**
     * Moves a hero to a target position
     * @param heroId The hero's ID
     * @param targetX Target X coordinate
     * @param targetY Target Y coordinate
     */
    moveHero(heroId: CombatantId, targetX: number, targetY: number): void {
        this.processAction({
            type: 'MOVE_HERO',
            payload: { heroId, targetX, targetY }
        });
    }



    /**
     * Uses a hero's ability at the specified coordinates
     * @param heroId The hero's ID
     * @param x X coordinate where ability was used
     * @param y Y coordinate where ability was used
     */
    useAbility(heroId: CombatantId, x: number, y: number): void {
        // Find hero by ID
        const hero = this.state.combatants.get(heroId);
        
        if (!hero || hero.type !== 'hero') {
            return;
        }

        // Cast to Hero type to access hero-specific properties
        const heroCombatant = hero as any;

        // Prevent respawning entities from firing projectiles
        if (heroCombatant.state === 'respawning') {
            return;
        }

        // Use the AbilityUseManager to handle the ability usage
        AbilityUseManager.useAbility(heroCombatant.ability, heroId, x, y, this.state);
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
                    CombatantUtils.damageCombatant(closestCombatant, projectile.strength, this.state, projectile.ownerId);
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
