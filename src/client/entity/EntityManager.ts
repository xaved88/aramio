import Phaser from 'phaser';
import { Combatant, COMBATANT_TYPES, isHeroCombatant } from '../../shared/types/CombatantTypes';
import { SharedGameState } from '../../shared/types/GameStateTypes';
import { CLIENT_CONFIG } from '../../Config';
import { EntityFactory } from './EntityFactory';
import { EntityRenderer } from './EntityRenderer';

/**
 * EntityManager handles the lifecycle of all game world entities.
 * An entity is defined as anything which has a position value in the game 
 * (or is directly attached to something that has a position value).
 * 
 * This includes:
 * - Combatants (players, cradles, turrets, minions)
 * - Projectiles (skillshots, bullets)
 * - Particles (effects, explosions)
 * - Visual indicators (health bars, status effects)
 */
export class EntityManager {
    private scene: Phaser.Scene;
    private entityFactory: EntityFactory;
    private entityRenderer: EntityRenderer;
    
    // Entity storage
    private entityGraphics: Map<string, Phaser.GameObjects.Graphics> = new Map();
    private entityTexts: Map<string, Phaser.GameObjects.Text> = new Map();
    private entityRadiusIndicators: Map<string, Phaser.GameObjects.Graphics> = new Map();
    private entityRespawnRings: Map<string, Phaser.GameObjects.Graphics> = new Map();
    private entityAbilityReadyIndicators: Map<string, Phaser.GameObjects.Graphics> = new Map();
    private projectileGraphics: Map<string, Phaser.GameObjects.Graphics> = new Map();

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.entityFactory = new EntityFactory(scene);
        this.entityRenderer = new EntityRenderer(scene);
    }

    /**
     * Updates all combatant entities based on the current game state
     */
    updateCombatantEntities(state: SharedGameState): void {
        // Update existing combatants and create new ones
        state.combatants.forEach((combatantData: Combatant) => {
            this.updateCombatantEntity(combatantData, state);
        });
        
        // Update projectiles
        this.updateProjectileEntities(state);
        
        // Remove combatants that no longer exist
        this.cleanupRemovedCombatants(state);
        
        // Remove projectiles that no longer exist
        this.cleanupRemovedProjectiles(state);
    }

    /**
     * Updates a single combatant entity, creating it if it doesn't exist
     */
    private updateCombatantEntity(combatantData: Combatant, state: SharedGameState): void {
        const entityId = combatantData.id;
        
        // Get or create entity graphics
        let entityGraphics = this.entityGraphics.get(entityId);
        let entityText = this.entityTexts.get(entityId);
        let radiusIndicator = this.entityRadiusIndicators.get(entityId);
        
        if (!entityGraphics) {
            entityGraphics = this.entityFactory.createEntityGraphics();
            // Set initial position immediately to avoid spawning at (0,0)
            entityGraphics.setPosition(combatantData.x, combatantData.y);
            // Set depth based on entity type
            if (combatantData.type === COMBATANT_TYPES.HERO) {
                entityGraphics.setDepth(10); // Heroes on top
            } else if (combatantData.type === COMBATANT_TYPES.MINION) {
                entityGraphics.setDepth(5); // Minions in middle
            } else {
                entityGraphics.setDepth(0); // Buildings at bottom
            }
            this.entityGraphics.set(entityId, entityGraphics);
        }
        
        if (!entityText) {
            entityText = this.entityFactory.createEntityText();
            // Set initial position immediately to avoid spawning at (0,0)
            entityText.setPosition(combatantData.x, combatantData.y);
            // Set depth to match entity graphics
            if (combatantData.type === COMBATANT_TYPES.HERO) {
                entityText.setDepth(10); // Heroes on top
            } else if (combatantData.type === COMBATANT_TYPES.MINION) {
                entityText.setDepth(5); // Minions in middle
            } else {
                entityText.setDepth(0); // Buildings at bottom
            }
            this.entityTexts.set(entityId, entityText);
        }
        
        if (!radiusIndicator) {
            radiusIndicator = this.entityFactory.createRadiusIndicator();
            // Set initial position immediately to avoid spawning at (0,0)
            radiusIndicator.setPosition(combatantData.x, combatantData.y);
            this.entityRadiusIndicators.set(entityId, radiusIndicator);
        }
        
        // Handle respawn ring for heroes
        let respawnRing = this.entityRespawnRings.get(entityId);
        let abilityReadyIndicator = this.entityAbilityReadyIndicators.get(entityId);
        if (combatantData.type === COMBATANT_TYPES.HERO) {
            if (!respawnRing) {
                respawnRing = this.entityFactory.createRespawnRing();
                // Set initial position immediately to avoid spawning at (0,0)
                respawnRing.setPosition(combatantData.x, combatantData.y);
                this.entityRespawnRings.set(entityId, respawnRing);
            }
            if (!abilityReadyIndicator) {
                abilityReadyIndicator = this.entityFactory.createAbilityReadyIndicator();
                // Set initial position immediately to avoid spawning at (0,0)
                abilityReadyIndicator.setPosition(combatantData.x, combatantData.y);
                this.entityAbilityReadyIndicators.set(entityId, abilityReadyIndicator);
            }
        }
        
        // Create smooth movement animation
        const targets = [entityGraphics, entityText, radiusIndicator];
        if (respawnRing) targets.push(respawnRing);
        if (abilityReadyIndicator) targets.push(abilityReadyIndicator);
        
        this.animateEntityMovement(
            entityId,
            targets,
            combatantData.x,
            combatantData.y
        );
        
        // Render the entity
        this.entityRenderer.renderEntity(
            combatantData,
            entityGraphics,
            entityText,
            radiusIndicator,
            respawnRing,
            abilityReadyIndicator,
            state
        );
    }

    /**
     * Updates projectile entities
     */
    private updateProjectileEntities(state: SharedGameState): void {
        state.projectiles.forEach((projectileData: any) => {
            this.updateProjectileEntity(projectileData);
        });
    }

    /**
     * Updates a single projectile entity, creating it if it doesn't exist
     */
    private updateProjectileEntity(projectileData: any): void {
        const entityId = projectileData.id;
        
        // Get or create projectile graphics
        let projectileGraphics = this.projectileGraphics.get(entityId);
        
        if (!projectileGraphics) {
            projectileGraphics = this.entityFactory.createEntityGraphics();
            // Set initial position immediately to avoid spawning at (0,0)
            projectileGraphics.setPosition(projectileData.x, projectileData.y);
            this.projectileGraphics.set(entityId, projectileGraphics);
        }
        
        // Create smooth movement animation
        this.animateEntityMovement(
            entityId,
            [projectileGraphics],
            projectileData.x,
            projectileData.y
        );
        
        // Render the projectile
        this.entityRenderer.renderProjectile(projectileData, projectileGraphics);
    }

    /**
     * Removes projectiles that no longer exist in the game state
     */
    private cleanupRemovedProjectiles(state: SharedGameState): void {
        this.projectileGraphics.forEach((projectileGraphics, entityId) => {
            if (!state.projectiles.has(entityId)) {
                this.destroyProjectileEntity(entityId);
            }
        });
    }

    /**
     * Destroys a projectile entity
     */
    private destroyProjectileEntity(entityId: string): void {
        // Stop any animations
        this.stopEntityAnimations(entityId);
        
        // Destroy graphics
        const projectileGraphics = this.projectileGraphics.get(entityId);
        if (projectileGraphics) {
            projectileGraphics.destroy();
            this.projectileGraphics.delete(entityId);
        }
    }

    /**
     * Removes combatants that no longer exist in the game state
     */
    private cleanupRemovedCombatants(state: SharedGameState): void {
        this.entityGraphics.forEach((entityGraphics, entityId) => {
            if (!state.combatants.has(entityId)) {
                this.destroyCombatantEntity(entityId);
            }
        });
    }

    /**
     * Destroys a combatant entity and all its associated graphics
     */
    private destroyCombatantEntity(entityId: string): void {
        // Stop any animations
        this.stopEntityAnimations(entityId);
        
        // Destroy graphics
        const entityGraphics = this.entityGraphics.get(entityId);
        if (entityGraphics) {
            entityGraphics.destroy();
            this.entityGraphics.delete(entityId);
        }
        
        const entityText = this.entityTexts.get(entityId);
        if (entityText) {
            entityText.destroy();
            this.entityTexts.delete(entityId);
        }
        
        const radiusIndicator = this.entityRadiusIndicators.get(entityId);
        if (radiusIndicator) {
            radiusIndicator.destroy();
            this.entityRadiusIndicators.delete(entityId);
        }
        
        const respawnRing = this.entityRespawnRings.get(entityId);
        if (respawnRing) {
            respawnRing.destroy();
            this.entityRespawnRings.delete(entityId);
        }
        
        const abilityReadyIndicator = this.entityAbilityReadyIndicators.get(entityId);
        if (abilityReadyIndicator) {
            abilityReadyIndicator.destroy();
            this.entityAbilityReadyIndicators.delete(entityId);
        }
    }

    /**
     * Gets an entity's graphics for external use (e.g., animations)
     */
    getEntityGraphics(entityId: string): Phaser.GameObjects.Graphics | undefined {
        return this.entityGraphics.get(entityId);
    }

    /**
     * Gets an entity's radius indicator for external use (e.g., attack animations)
     */
    getEntityRadiusIndicator(entityId: string): Phaser.GameObjects.Graphics | undefined {
        return this.entityRadiusIndicators.get(entityId);
    }

    /**
     * Animates entity movement to a new position
     */
    private animateEntityMovement(
        entityId: string,
        targets: (Phaser.GameObjects.Graphics | Phaser.GameObjects.Text)[],
        targetX: number,
        targetY: number
    ): void {
        // Stop any existing tween for this entity
        this.stopEntityAnimations(entityId);
        
        // Create smooth tween to new position
        const tween = this.scene.tweens.add({
            targets: targets,
            x: targetX,
            y: targetY,
            duration: CLIENT_CONFIG.ENTITY_MOVEMENT_DURATION_MS,
            ease: 'Linear',
            onComplete: () => {
                // Cleanup handled by the tween itself
            }
        });
    }

    /**
     * Stops all animations for a specific entity
     */
    private stopEntityAnimations(entityId: string): void {
        // In a more sophisticated system, we'd track tweens by entity ID
        // For now, we'll let Phaser handle cleanup
    }

    /**
     * Cleans up all entities (called when scene is destroyed)
     */
    destroy(): void {
        this.entityGraphics.forEach(graphics => graphics.destroy());
        this.entityTexts.forEach(text => text.destroy());
        this.entityRadiusIndicators.forEach(indicator => indicator.destroy());
        this.entityRespawnRings.forEach(ring => ring.destroy());
        this.entityAbilityReadyIndicators.forEach(indicator => indicator.destroy());
        this.projectileGraphics.forEach(graphics => graphics.destroy());
        
        this.entityGraphics.clear();
        this.entityTexts.clear();
        this.entityRadiusIndicators.clear();
        this.entityRespawnRings.clear();
        this.entityAbilityReadyIndicators.clear();
        this.projectileGraphics.clear();
    }

    /**
     * Clears all entities without destroying the manager
     */
    clearAllEntities(): void {
        this.entityGraphics.forEach(graphics => graphics.destroy());
        this.entityTexts.forEach(text => text.destroy());
        this.entityRadiusIndicators.forEach(indicator => indicator.destroy());
        this.entityRespawnRings.forEach(ring => ring.destroy());
        this.entityAbilityReadyIndicators.forEach(indicator => indicator.destroy());
        this.projectileGraphics.forEach(graphics => graphics.destroy());
        
        this.entityGraphics.clear();
        this.entityTexts.clear();
        this.entityRadiusIndicators.clear();
        this.entityRespawnRings.clear();
        this.entityAbilityReadyIndicators.clear();
        this.projectileGraphics.clear();
    }
} 
