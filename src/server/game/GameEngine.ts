import { GameState } from '../schema/GameState';
import { Combatant } from '../schema/Combatants';
import { Projectile, ProjectileEffect } from '../schema/Projectiles';
import { MoveEffect, CombatantEffect } from '../schema/Effects';
import { GameStateMachine } from './stateMachine/GameStateMachine';
import { GameActionTypes } from './stateMachine/types';
import { StateMachineResult } from './stateMachine/types';
import { CLIENT_CONFIG } from '../../ClientConfig';
import { CombatantUtils } from './combatants/CombatantUtils';
import { ControllerId, CombatantId } from '../../shared/types/CombatantTypes';
import { AbilityUseManager } from './abilities/AbilityUseManager';
import { AOEDamageEvent } from '../schema/Events';
import { getMinX, getMaxX, getMinY, getMaxY } from '../../shared/utils/GameBounds';
import { GameplayConfig } from '../config/ConfigProvider';
import { MinionManager } from './combatants/MinionManager';

export class GameEngine {
    private state: GameState;
    private gameplayConfig: GameplayConfig;
    private stateMachine: GameStateMachine;
    private abilityUseManager: AbilityUseManager;
    private minionManager: MinionManager;

    constructor(state: GameState, gameplayConfig: GameplayConfig) {
        this.state = state;
        this.gameplayConfig = gameplayConfig;
        this.minionManager = new MinionManager(gameplayConfig);
        this.stateMachine = new GameStateMachine(gameplayConfig, this.minionManager);
        this.abilityUseManager = new AbilityUseManager(gameplayConfig);
    }

    /**
     * Gets the minion manager instance
     */
    getMinionManager(): MinionManager {
        return this.minionManager;
    }

    /**
     * Processes an action and updates the state directly
     * @param action The action to process
     */
    processAction(action: GameActionTypes): void {
        const result = this.stateMachine.processAction(this.state, action);
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
        const result = this.stateMachine.processAction(this.state, {
            type: 'UPDATE_GAME',
            payload: { deltaTime }
        });
        
        // Handle any events returned by the state machine
        if (result.events) {
            this.handleEvents(result.events);
        }
        
        // Update projectiles
        this.updateProjectiles(deltaTime);
        
        // Update effects (remove expired ones and process active effects)
        this.updateEffects(deltaTime);
        
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
     * @param playerDisplayName Optional player display name from lobby
     */
    spawnControlledHero(controllerId: ControllerId, team: 'blue' | 'red', position?: { x: number, y: number }, abilityType?: string, playerDisplayName?: string): void {
        this.processAction({
            type: 'SPAWN_PLAYER',
            payload: { 
                playerId: controllerId, 
                team,
                ...(position && { x: position.x, y: position.y }),
                ...(abilityType && { abilityType }),
                ...(playerDisplayName && { playerDisplayName })
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
        // Find hero by ID
        const hero = this.state.combatants.get(heroId);
        
        if (!hero || hero.type !== 'hero') {
            return;
        }

        // Check if hero is stunned
        if (this.isCombatantStunned(hero)) {
            return; // Stunned heroes cannot move
        }

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

        // Check if hero is stunned
        if (this.isCombatantStunned(hero)) {
            return; // Stunned heroes cannot use abilities
        }

        // Use the AbilityUseManager to handle the ability usage
        this.abilityUseManager.useAbility(heroCombatant.ability, heroId, x, y, this.state);
    }

    /**
     * Debug method to instantly kill a hero (for testing)
     * @param heroId The hero's ID
     */
    debugKill(heroId: CombatantId): void {
        // Only allow if debug kill is enabled
        if (!this.gameplayConfig.DEBUG.CHEAT_KILL_PLAYER_ENABLED) {
            return;
        }

        const hero = this.state.combatants.get(heroId);
        if (!hero || hero.type !== 'hero') {
            return;
        }

        // Set health to 0 to trigger death
        hero.health = 0;
        console.log(`Debug kill: Hero ${heroId} killed for testing`);
    }

    /**
     * Debug method to instantly respawn a hero (for testing)
     * @param heroId The hero's ID
     */
    instantRespawn(heroId: CombatantId): void {
        // Only allow if instant respawn is enabled
        if (!this.gameplayConfig.DEBUG.CHEAT_INSTANT_RESPAWN_ENABLED) {
            return;
        }

        const hero = this.state.combatants.get(heroId);
        if (!hero || hero.type !== 'hero') {
            return;
        }

        // Cast to Hero type to access respawnTime property
        const heroCombatant = hero as any;

        // Set respawn time to 1 to trigger immediate respawn
        heroCombatant.respawnTime = 1;
        console.log(`Debug instant respawn: Hero ${heroId} respawn timer set to 1`);
    }

    private updateProjectiles(deltaTime: number): void {
        const projectilesToRemove: string[] = [];
        
        this.state.projectiles.forEach((projectile: any) => {
            // Move projectile
            const distance = (projectile.speed * deltaTime) / 1000; // Convert to pixels
            projectile.x += projectile.directionX * distance;
            projectile.y += projectile.directionY * distance;
            
            // Check bounds
            if (projectile.x < 0 || projectile.x > CLIENT_CONFIG.MAP_WIDTH || 
                projectile.y < 0 || projectile.y > CLIENT_CONFIG.MAP_HEIGHT) {
                projectilesToRemove.push(projectile.id);
                return;
            }
            
            // Check duration (expiration)
            if (projectile.duration !== -1) { // -1 means infinite duration
                const currentTime = this.state.gameTime;
                const timeSinceCreation = currentTime - projectile.createdAt;
                if (timeSinceCreation >= projectile.duration) {
                    projectilesToRemove.push(projectile.id);
                    return;
                }
            }
            
            // Check range-based removal for projectiles with range limits
            if (projectile.duration === -1 && projectile.range !== undefined) {
                // Calculate distance traveled from starting position
                const startX = projectile.startX || projectile.x;
                const startY = projectile.startY || projectile.y;
                const distanceTraveled = Math.sqrt(
                    Math.pow(projectile.x - startX, 2) + 
                    Math.pow(projectile.y - startY, 2)
                );
                
                if (distanceTraveled >= projectile.range) {
                    projectilesToRemove.push(projectile.id);
                    return;
                }
            }
            
            // Handle destination-based projectiles (like fireball and thorndive)
            if ((projectile.type === 'fireball' || projectile.type === 'thorndive') && projectile.targetX !== undefined && projectile.targetY !== undefined) {
                const targetDistance = Math.sqrt(
                    Math.pow(projectile.x - projectile.targetX, 2) + 
                    Math.pow(projectile.y - projectile.targetY, 2)
                );
                
                // Calculate if projectile has passed the target
                const nextX = projectile.x + projectile.directionX * ((projectile.speed * deltaTime) / 1000);
                const nextY = projectile.y + projectile.directionY * ((projectile.speed * deltaTime) / 1000);
                const nextDistance = Math.sqrt(
                    Math.pow(nextX - projectile.targetX, 2) + 
                    Math.pow(nextY - projectile.targetY, 2)
                );
                
                // If reached destination (close enough OR would overshoot), trigger AOE damage
                if (targetDistance <= 10 || nextDistance > targetDistance) {
                    projectilesToRemove.push(projectile.id);
                    this.applyAOEDamage(projectile, projectile.targetX, projectile.targetY);
                    return;
                }
            } else {
                // Standard collision detection for regular projectiles
                let closestCombatant: any = null;
                let closestDistance = Infinity;
                
                this.state.combatants.forEach((combatant: any) => {
                    if (!this.isValidProjectileTarget(combatant, projectile)) return;
                    
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
                
                // If we found a target, handle it based on type
                if (closestCombatant) {
                    projectilesToRemove.push(projectile.id);
                    
                    // Only apply effects to heroes and minions
                    if (this.canReceiveProjectileEffects(closestCombatant)) {
                        // Apply projectile effects
                        this.applyProjectileEffects(projectile, closestCombatant);
                    }
                    // For structures (turrets, cradles), just destroy the projectile without applying effects
                }
            }
        });
        
        // Remove projectiles that hit something, went out of bounds, or expired
        projectilesToRemove.forEach(projectileId => {
            this.state.projectiles.delete(projectileId);
        });
    }

    /**
     * Applies projectile effects to a target combatant
     */
    private applyProjectileEffects(projectile: Projectile, target: Combatant): void {
        if (!projectile.effects || projectile.effects.length === 0) return;
        
        projectile.effects.forEach((effect: ProjectileEffect) => {
            switch (effect.effectType) {
                case 'applyDamage':
                    if (effect.damage && this.canReceiveProjectileEffects(target)) {
                        CombatantUtils.damageCombatant(target, effect.damage, this.state, projectile.ownerId, 'ability');
                    }
                    break;
                case 'applyEffect':
                    if (effect.combatantEffect) {
                        this.applyCombatantEffect(target, effect.combatantEffect);
                    }
                    break;
            }
        });
    }

    /**
     * Applies a combatant effect to a target
     */
    private applyCombatantEffect(target: any, effect: CombatantEffect): void {
        effect.appliedAt = this.state.gameTime;
        target.effects.push(effect);
        // Handle specific effects that need immediate processing
        if (effect.type === 'stun') {
            // Remove target when stunned
            target.target = undefined;
            // Reset attack ready time to prevent immediate attacks
            target.attackReadyAt = 0;
        }
    }

    /**
     * Checks if a combatant is a valid target for a projectile
     * @param combatant The combatant to check
     * @param projectile The projectile checking the target
     * @returns true if the combatant is a valid target
     */
    private isValidProjectileTarget(combatant: any, projectile: any): boolean {
        // Don't hit allies
        if (combatant.team === projectile.team) return false;
        // Don't hit dead entities
        if (combatant.getHealth() <= 0) return false;
        
        return true;
    }

    /**
     * Checks if a combatant can receive projectile effects
     * @param combatant The combatant to check
     * @returns true if the combatant can receive effects
     */
    private canReceiveProjectileEffects(combatant: any): boolean {
        return combatant.type === 'hero' || combatant.type === 'minion';
    }

    /**
     * Applies AOE damage at a specific location
     */
    private applyAOEDamage(projectile: any, targetX: number, targetY: number): void {
        if (!projectile.aoeRadius || !projectile.effects || projectile.effects.length === 0) {

            return;
        }
        

        
        // Create AOE damage event for visual effect
        const aoeEvent = new AOEDamageEvent();
        aoeEvent.sourceId = projectile.ownerId;
        aoeEvent.x = targetX;
        aoeEvent.y = targetY;
        aoeEvent.radius = projectile.aoeRadius;
        aoeEvent.timestamp = this.state.gameTime;
        this.state.aoeDamageEvents.push(aoeEvent);
        
        this.state.combatants.forEach((combatant: any) => {
            if (!this.isValidProjectileTarget(combatant, projectile)) return;
            
            const dx = combatant.x - targetX;
            const dy = combatant.y - targetY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Check if combatant is within AOE radius (accounting for combatant size)
            if (distance <= projectile.aoeRadius + combatant.size) {
                // Only apply effects to heroes and minions
                if (this.canReceiveProjectileEffects(combatant)) {
                    this.applyProjectileEffects(projectile, combatant);
                }
            }
        });
    }
    
    /**
     * Updates effects by removing expired ones and processing active effects
     */
    private updateEffects(deltaTime: number): void {
        const currentTime = this.state.gameTime;
        
        this.state.combatants.forEach((combatant: Combatant) => {
            if (!combatant.effects || combatant.effects.length === 0) return;
            
            const effectsToRemove: number[] = [];
            
            combatant.effects.forEach((effect: CombatantEffect, index: number) => {
                // Process move effects
                if (effect.type === 'move') {
                    const shouldRemove = this.processMoveEffect(combatant, effect as MoveEffect, deltaTime);
                    if (shouldRemove) {
                        effectsToRemove.push(index);
                    }
                }
                
                // Check for expired effects (only skip truly infinite duration effects)
                if (effect.duration === -1) return; // Only skip infinite effects

                // Effects with duration 0 should expire immediately
                if (effect.duration === 0) {
                    effectsToRemove.push(index);
                } else {
                    // Check if effect has expired based on time
                    const timeSinceApplied = currentTime - effect.appliedAt;
                    if (timeSinceApplied >= effect.duration) {
                        effectsToRemove.push(index);
                    }
                }
            });
            
            // Remove expired effects (in reverse order to maintain indices)
            effectsToRemove.reverse().forEach(index => {
                combatant.effects.splice(index, 1);
            });
        });
    }
    
    /**
     * Processes a move effect on a combatant
     * @returns true if the effect should be removed
     */
    private processMoveEffect(combatant: Combatant, effect: MoveEffect, deltaTime: number): boolean {
        // Validate move effect data
        if (!effect.moveTargetX || !effect.moveTargetY || !effect.moveSpeed) {
            console.warn(`Move effect has invalid data: targetX=${effect.moveTargetX}, targetY=${effect.moveTargetY}, speed=${effect.moveSpeed}`);
            return true; // Remove invalid effect
        }
        
        // Validate combatant position
        if (!combatant.x || !combatant.y) {
            console.warn(`Combatant ${combatant.id} has invalid position: x=${combatant.x}, y=${combatant.y}`);
            return true; // Remove effect if combatant has invalid position
        }
        
        // Calculate direction to target
        const dx = effect.moveTargetX - combatant.x;
        const dy = effect.moveTargetY - combatant.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // If we've reached the target, remove the effect
        if (distance < 5) { // 5 pixel threshold
            return true;
        }
        
        // Calculate movement distance for this frame
        const moveDistance = (effect.moveSpeed * deltaTime) / 1000; // Convert to pixels
        
        // If we would overshoot the target, just move to the target exactly
        if (moveDistance >= distance) {
            combatant.x = effect.moveTargetX;
            combatant.y = effect.moveTargetY;
            return true; // Remove the effect since we've reached the target
        }
        
        // Calculate normalized direction and move
        const normalizedDx = dx / distance;
        const normalizedDy = dy / distance;
        
        // Move the combatant
        combatant.x += normalizedDx * moveDistance;
        combatant.y += normalizedDy * moveDistance;
        
        // Clamp to game bounds
        combatant.x = Math.max(getMinX(this.gameplayConfig.GAME_BOUND_BUFFER), Math.min(getMaxX(this.gameplayConfig.GAME_BOUND_BUFFER), combatant.x));
        combatant.y = Math.max(getMinY(this.gameplayConfig.GAME_BOUND_BUFFER), Math.min(getMaxY(this.gameplayConfig.GAME_BOUND_BUFFER), combatant.y));
        
        return false; // Don't remove the effect yet
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
                    break;
                default:
                    // Unknown event type - could log in development if needed
                    break;
            }
        });
    }

    /**
     * Checks if a combatant is stunned
     * @param combatant The combatant to check
     * @returns True if the combatant is stunned, false otherwise
     */
    private isCombatantStunned(combatant: any): boolean {
        if (!combatant.effects || combatant.effects.length === 0) return false;
        
        return combatant.effects.some((effect: any) => effect.type === 'stun');
    }
} 
