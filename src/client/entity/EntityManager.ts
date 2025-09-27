import Phaser from 'phaser';
import { Combatant, COMBATANT_TYPES, isHeroCombatant, CombatantId, ControllerId, ProjectileId } from '../../shared/types/CombatantTypes';
import { SharedGameState, XPEvent, LevelUpEvent, AOEDamageEvent } from '../../shared/types/GameStateTypes';
import { CLIENT_CONFIG } from '../../ClientConfig';
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
    private playerSessionId: ControllerId | null = null;
    private cameraManager: any = null;
    
    // Entity storage
    private entityGraphics: Map<CombatantId, Phaser.GameObjects.Graphics> = new Map();
    private entityTexts: Map<CombatantId, Phaser.GameObjects.Text> = new Map();
    private entityAbilityIconTexts: Map<CombatantId, Phaser.GameObjects.Text> = new Map();
    private entityRadiusIndicators: Map<CombatantId, Phaser.GameObjects.Graphics> = new Map();
    private entityRespawnRings: Map<CombatantId, Phaser.GameObjects.Graphics> = new Map();
    private entityAbilityReadyIndicators: Map<CombatantId, Phaser.GameObjects.Graphics> = new Map();
    private projectileGraphics: Map<ProjectileId, Phaser.GameObjects.Graphics> = new Map();
    private targetingLinesGraphics: Phaser.GameObjects.Graphics | null = null;
    private processedXPEvents: Set<string> = new Set();
    private processedLevelUpEvents: Set<string> = new Set();
    private processedAOEDamageEvents: Set<string> = new Set();
    private lastProcessedTime: number = 0;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.entityFactory = new EntityFactory(scene);
        this.entityRenderer = new EntityRenderer(scene);
    }

    setPlayerSessionId(sessionId: ControllerId | null): void {
        this.playerSessionId = sessionId;
        this.entityRenderer.setPlayerSessionId(sessionId);
    }

    setCameraManager(cameraManager: any): void {
        this.cameraManager = cameraManager;
    }

    /**
     * Forces cleanup of all XP and level-up texts
     * Call this when the browser tab becomes active again
     */
    forceCleanupTexts(): void {
        // Don't clear processed events - this causes notifications to re-display
        // when returning to the tab. The visual text objects are already cleaned up
        // by their animation completion callbacks.
        // The processed events should persist to prevent re-processing old events.
        
        // Note: We don't reset lastProcessedTime here because we need to get the current
        // game time from the next update cycle. The timestamp comparison will handle
        // skipping old events properly.
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
        
        // Render targeting lines
        this.renderTargetingLines(state);
        
        // Process XP events
        this.processXPEvents(state);
        
        // Process level-up events
        this.processLevelUpEvents(state);
        
        // Process AOE damage events
        this.processAOEDamageEvents(state);
        
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
        let entityAbilityIconText = this.entityAbilityIconTexts.get(entityId);
        let radiusIndicator = this.entityRadiusIndicators.get(entityId);
        
        if (!entityGraphics) {
            entityGraphics = this.entityFactory.createEntityGraphics();
            // Set initial position immediately to avoid spawning at (0,0)
            entityGraphics.setPosition(combatantData.x, combatantData.y);
            
            // Set depth based on entity type
            if (combatantData.type === COMBATANT_TYPES.HERO) {
                entityGraphics.setDepth(CLIENT_CONFIG.RENDER_DEPTH.HEROES);
            } else if (combatantData.type === COMBATANT_TYPES.MINION) {
                entityGraphics.setDepth(CLIENT_CONFIG.RENDER_DEPTH.MINIONS);
            } else {
                entityGraphics.setDepth(CLIENT_CONFIG.RENDER_DEPTH.STRUCTURES);
            }
            
            // Assign to main camera
            if (this.cameraManager) {
                this.cameraManager.assignToMainCamera(entityGraphics);
            }
            
            this.entityGraphics.set(entityId, entityGraphics);
        }
        
        if (!entityText) {
            entityText = this.entityFactory.createEntityText();
            // Set initial position immediately to avoid spawning at (0,0)
            entityText.setPosition(combatantData.x, combatantData.y);
            
            // Set depth based on entity type
            if (combatantData.type === COMBATANT_TYPES.HERO) {
                entityText.setDepth(CLIENT_CONFIG.RENDER_DEPTH.HEROES);
            } else if (combatantData.type === COMBATANT_TYPES.MINION) {
                entityText.setDepth(CLIENT_CONFIG.RENDER_DEPTH.MINIONS);
            } else {
                entityText.setDepth(CLIENT_CONFIG.RENDER_DEPTH.STRUCTURES);
            }
            
            // Assign to main camera
            if (this.cameraManager) {
                this.cameraManager.assignToMainCamera(entityText);
            }
            
            this.entityTexts.set(entityId, entityText);
        }
        
        // Create ability icon text for heroes
        if (combatantData.type === COMBATANT_TYPES.HERO && !entityAbilityIconText) {
            entityAbilityIconText = this.entityFactory.createEntityText();
            // Set initial position immediately to avoid spawning at (0,0)
            entityAbilityIconText.setPosition(combatantData.x, combatantData.y);
            entityAbilityIconText.setDepth(CLIENT_CONFIG.RENDER_DEPTH.HEROES);
            
            // Assign to main camera
            if (this.cameraManager) {
                this.cameraManager.assignToMainCamera(entityAbilityIconText);
            }
            
            this.entityAbilityIconTexts.set(entityId, entityAbilityIconText);
        }
        
        if (!radiusIndicator) {
            radiusIndicator = this.entityFactory.createRadiusIndicator();
            // Set initial position immediately to avoid spawning at (0,0)
            radiusIndicator.setPosition(combatantData.x, combatantData.y);
            radiusIndicator.setDepth(CLIENT_CONFIG.RENDER_DEPTH.BACKGROUND); // Behind combatants
            
            // Assign to main camera
            if (this.cameraManager) {
                this.cameraManager.assignToMainCamera(radiusIndicator);
            }
            
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
                respawnRing.setDepth(CLIENT_CONFIG.RENDER_DEPTH.BACKGROUND);
                
                // Assign to main camera
                if (this.cameraManager) {
                    this.cameraManager.assignToMainCamera(respawnRing);
                }
                
                this.entityRespawnRings.set(entityId, respawnRing);
            }
            if (!abilityReadyIndicator) {
                abilityReadyIndicator = this.entityFactory.createAbilityReadyIndicator();
                // Set initial position immediately to avoid spawning at (0,0)
                abilityReadyIndicator.setPosition(combatantData.x, combatantData.y);
                abilityReadyIndicator.setDepth(CLIENT_CONFIG.RENDER_DEPTH.ABILITY_INDICATORS);
                
                // Assign to main camera
                if (this.cameraManager) {
                    this.cameraManager.assignToMainCamera(abilityReadyIndicator);
                }
                
                this.entityAbilityReadyIndicators.set(entityId, abilityReadyIndicator);
            }
        }
        
        // Create smooth movement animation
        const targets = [entityGraphics, entityText, radiusIndicator];
        if (entityAbilityIconText) targets.push(entityAbilityIconText);
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
            entityAbilityIconText,
            state,
            this.playerSessionId
        );
    }

    /**
     * Updates projectile entities
     */
    private updateProjectileEntities(state: SharedGameState): void {
        state.projectiles.forEach((projectileData: any) => {
            this.updateProjectileEntity(projectileData, state);
        });
    }

    /**
     * Updates a single projectile entity, creating it if it doesn't exist
     */
    private updateProjectileEntity(projectileData: any, state: SharedGameState): void {
        const entityId = projectileData.id;
        
        // Get or create projectile graphics
        let projectileGraphics = this.projectileGraphics.get(entityId);
        
        if (!projectileGraphics) {
            projectileGraphics = this.entityFactory.createEntityGraphics();
            // Set initial position immediately to avoid spawning at (0,0)
            projectileGraphics.setPosition(projectileData.x, projectileData.y);
            
            // Assign to main camera
            if (this.cameraManager) {
                this.cameraManager.assignToMainCamera(projectileGraphics);
            }
            
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
        this.entityRenderer.renderProjectile(projectileData, projectileGraphics, state);
    }

    /**
     * Processes XP events and creates XP text animations
     */
    private processXPEvents(state: SharedGameState): void {
        state.xpEvents.forEach((xpEvent, index) => {
            // Use a more robust event key that includes position to prevent duplicates
            const eventKey = `${xpEvent.playerId}-${xpEvent.amount}-${xpEvent.x}-${xpEvent.y}-${xpEvent.timestamp}`;
            
            // Skip if we've already processed this event
            if (this.processedXPEvents.has(eventKey)) return;
            
            // Skip events that are older than when we last processed (prevents re-display after tab switch)
            if (xpEvent.timestamp < this.lastProcessedTime) return;
            
            // Find the player who earned XP and check if it's the current player
            const player = state.combatants.get(xpEvent.playerId);
            if (player && isHeroCombatant(player) && this.playerSessionId && player.controller === this.playerSessionId) {
                this.createXPText(xpEvent);
            }
            
            // Mark as processed
            this.processedXPEvents.add(eventKey);
        });
        
        // Update last processed time to current game time
        this.lastProcessedTime = state.gameTime;
    }

    /**
     * Creates XP text animation at the specified position
     */
    private createXPText(xpEvent: XPEvent): void {
        let text = `+${Math.round(xpEvent.amount)}XP`;
        let color: string = CLIENT_CONFIG.XP_EVENTS.COLORS.DEFAULT;
        let fontSize: string = CLIENT_CONFIG.XP_EVENTS.FONTS.DEFAULT_SIZE;
        
        // Special styling for last hits
        if (xpEvent.type === 'minionKill') {
            color = CLIENT_CONFIG.XP_EVENTS.COLORS.LAST_HIT;
        } else if (xpEvent.type === 'heroKill') {
            color = CLIENT_CONFIG.XP_EVENTS.COLORS.LAST_HIT;
            text = `+${Math.round(xpEvent.amount)}XP Kill!`;
            fontSize = CLIENT_CONFIG.XP_EVENTS.FONTS.HERO_KILL_SIZE;
        }
        
        const xpText = this.scene.add.text(xpEvent.x, xpEvent.y, text, {
            fontSize: fontSize,
            color: color,
            fontFamily: CLIENT_CONFIG.UI.FONTS.DEFAULT_FAMILY
        }).setOrigin(0.5).setDepth(CLIENT_CONFIG.RENDER_DEPTH.OVERLAY); // High depth to appear above everything
        
        // Assign to main camera
        if (this.cameraManager) {
            this.cameraManager.assignToMainCamera(xpText);
        }
        
        // Animate the text floating up and fading out
        this.scene.tweens.add({
            targets: xpText,
            y: xpText.y - CLIENT_CONFIG.XP_EVENTS.ANIMATION.FLOAT_DISTANCE,
            alpha: 0,
            duration: CLIENT_CONFIG.XP_EVENTS.ANIMATION.DURATION_MS,
            ease: 'Power2',
            onComplete: () => {
                xpText.destroy();
            }
        });
    }

    /**
     * Processes level-up events and creates level-up text animations
     */
    private processLevelUpEvents(state: SharedGameState): void {
        state.levelUpEvents.forEach((levelUpEvent, index) => {
            // Use a more robust event key that includes position to prevent duplicates
            const eventKey = `${levelUpEvent.playerId}-${levelUpEvent.newLevel}-${levelUpEvent.x}-${levelUpEvent.y}-${levelUpEvent.timestamp}`;
            
            // Skip if we've already processed this event
            if (this.processedLevelUpEvents.has(eventKey)) return;
            
            // Skip events that are older than when we last processed (prevents re-display after tab switch)
            if (levelUpEvent.timestamp < this.lastProcessedTime) return;
            
            // Find the player who leveled up and check if it's the current player
            const player = state.combatants.get(levelUpEvent.playerId);
            if (player && isHeroCombatant(player) && this.playerSessionId && player.controller === this.playerSessionId) {
                this.createLevelUpText(levelUpEvent);
            }
            
            // Mark as processed
            this.processedLevelUpEvents.add(eventKey);
        });
    }

    /**
     * Processes AOE damage events and creates visual effects
     */
    private processAOEDamageEvents(state: SharedGameState): void {
        state.aoeDamageEvents.forEach((aoeEvent, index) => {
            // Use a more robust event key that includes radius to prevent duplicates
            const eventKey = `${aoeEvent.sourceId}-${aoeEvent.x}-${aoeEvent.y}-${aoeEvent.radius}-${aoeEvent.timestamp}`;
            
            // Skip if we've already processed this event
            if (this.processedAOEDamageEvents.has(eventKey)) return;
            
            this.processedAOEDamageEvents.add(eventKey);
            
            // Create AOE visual effect
            this.createAOEVisualEffect(aoeEvent, state);
        });
    }

    /**
     * Creates AOE visual effect (circle flash) at the specified position
     */
    private createAOEVisualEffect(aoeEvent: AOEDamageEvent, state: SharedGameState): void {
        // Create a graphics object for the AOE effect
        const aoeGraphics = this.scene.add.graphics();
        aoeGraphics.setPosition(aoeEvent.x, aoeEvent.y);
        aoeGraphics.setDepth(CLIENT_CONFIG.RENDER_DEPTH.EFFECTS); // High depth to appear above everything
        
        // Assign to main camera
        if (this.cameraManager) {
            this.cameraManager.assignToMainCamera(aoeGraphics);
        }
        
        // Determine color based on the source combatant
        let aoeColor = 0xff6b35; // Default orange
        
        // Find the source combatant to get team and player info
        const sourceCombatant = state.combatants.get(aoeEvent.sourceId);
        if (sourceCombatant) {
            // Check if this is the player's controlled hero
            const isOwnerControlledByPlayer = this.playerSessionId && 
                sourceCombatant.type === 'hero' && 
                (sourceCombatant as any).controller === this.playerSessionId;
            
            if (isOwnerControlledByPlayer) {
                aoeColor = CLIENT_CONFIG.SELF_COLORS.PROJECTILE; // Purple for player
            } else {
                // Use team colors
                aoeColor = sourceCombatant.team === 'blue' 
                    ? CLIENT_CONFIG.PROJECTILE.BLUE_COLOR 
                    : CLIENT_CONFIG.PROJECTILE.RED_COLOR;
            }
        }
        
        // Draw a circle with the AOE radius
        aoeGraphics.lineStyle(3, aoeColor, 0.8); // Team color with some transparency
        aoeGraphics.fillStyle(aoeColor, 0.3); // Fill with low transparency
        aoeGraphics.strokeCircle(0, 0, aoeEvent.radius);
        aoeGraphics.fillCircle(0, 0, aoeEvent.radius);
        
        // Animate the AOE effect - scale and fade out
        this.scene.tweens.add({
            targets: aoeGraphics,
            scaleX: 1.3,
            scaleY: 1.3,
            alpha: 0,
            duration: 500, // Half a second
            ease: 'Power2',
            onComplete: () => {
                aoeGraphics.destroy();
            }
        });
    }

    /**
     * Creates level-up text animation at the specified position
     */
    private createLevelUpText(levelUpEvent: LevelUpEvent): void {
        const levelUpText = this.scene.add.text(levelUpEvent.x, levelUpEvent.y, `Level Up!`, {
            fontSize: CLIENT_CONFIG.LEVEL_UP_EVENTS.FONT_SIZE,
            color: CLIENT_CONFIG.LEVEL_UP_EVENTS.COLOR,
            fontFamily: CLIENT_CONFIG.UI.FONTS.DEFAULT_FAMILY
        }).setOrigin(0.5).setDepth(CLIENT_CONFIG.RENDER_DEPTH.OVERLAY); // High depth to appear above everything
        
        // Assign to main camera
        if (this.cameraManager) {
            this.cameraManager.assignToMainCamera(levelUpText);
        }
        
        // Animate the text floating up and fading out
        this.scene.tweens.add({
            targets: levelUpText,
            y: levelUpText.y - CLIENT_CONFIG.LEVEL_UP_EVENTS.ANIMATION.FLOAT_DISTANCE,
            alpha: 0,
            duration: CLIENT_CONFIG.LEVEL_UP_EVENTS.ANIMATION.DURATION_MS,
            ease: 'Power2',
            onComplete: () => {
                levelUpText.destroy();
            }
        });
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
    private destroyProjectileEntity(entityId: ProjectileId): void {
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
        
        const entityAbilityIconText = this.entityAbilityIconTexts.get(entityId);
        if (entityAbilityIconText) {
            entityAbilityIconText.destroy();
            this.entityAbilityIconTexts.delete(entityId);
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
    getEntityGraphics(entityId: CombatantId): Phaser.GameObjects.Graphics | undefined {
        return this.entityGraphics.get(entityId);
    }

    /**
     * Gets an entity's radius indicator for external use (e.g., attack animations)
     */
    getEntityRadiusIndicator(entityId: CombatantId): Phaser.GameObjects.Graphics | undefined {
        return this.entityRadiusIndicators.get(entityId);
    }

    /**
     * Animates entity movement to a new position
     */
    private animateEntityMovement(
        entityId: CombatantId,
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
    private stopEntityAnimations(entityId: CombatantId): void {
        // In a more sophisticated system, we'd track tweens by entity ID
        // For now, we'll let Phaser handle cleanup
    }

    /**
     * Cleans up all entities (called when scene is destroyed)
     */
    destroy(): void {
        this.entityGraphics.forEach(graphics => graphics.destroy());
        this.entityTexts.forEach(text => text.destroy());
        this.entityAbilityIconTexts.forEach(text => text.destroy());
        this.entityRadiusIndicators.forEach(indicator => indicator.destroy());
        this.entityRespawnRings.forEach(ring => ring.destroy());
        this.entityAbilityReadyIndicators.forEach(indicator => indicator.destroy());
        this.projectileGraphics.forEach(graphics => graphics.destroy());
        
        if (this.targetingLinesGraphics) {
            this.targetingLinesGraphics.destroy();
            this.targetingLinesGraphics = null;
        }
        
        // Clear flashing targeting lines
        this.entityRenderer.clearFlashingTargetingLines();
        
        this.entityGraphics.clear();
        this.entityTexts.clear();
        this.entityAbilityIconTexts.clear();
        this.entityRadiusIndicators.clear();
        this.entityRespawnRings.clear();
        this.entityAbilityReadyIndicators.clear();
        this.projectileGraphics.clear();
        this.processedXPEvents.clear();
        this.processedLevelUpEvents.clear();
        this.lastProcessedTime = 0;
    }

    /**
     * Renders targeting lines between combatants and their targets
     */
    private renderTargetingLines(state: SharedGameState): void {
        // Create targeting lines graphics if it doesn't exist
        if (!this.targetingLinesGraphics) {
            this.targetingLinesGraphics = this.scene.add.graphics();
            this.targetingLinesGraphics.setDepth(CLIENT_CONFIG.RENDER_DEPTH.TARGETING_LINES); // Above everything, below UI
            
            // Assign to main camera
            if (this.cameraManager) {
                this.cameraManager.assignToMainCamera(this.targetingLinesGraphics);
            }
        }
        
        // Clear the graphics before rendering new targeting lines
        this.targetingLinesGraphics.clear();
        
        // Render the targeting lines
        this.entityRenderer.renderTargetingLines(state.combatants, this.targetingLinesGraphics, state.gameTime);
    }

    /**
     * Triggers a flash animation on a targeting line when an attack fires
     */
    triggerTargetingLineFlash(sourceId: CombatantId, targetId: CombatantId): void {
        this.entityRenderer.triggerTargetingLineFlash(sourceId, targetId);
    }

    /**
     * Clears all entities without destroying the manager
     */
    clearAllEntities(): void {
        // Clear all entity graphics
        this.entityGraphics.forEach(graphics => graphics.destroy());
        this.entityTexts.forEach(text => text.destroy());
        this.entityAbilityIconTexts.forEach(text => text.destroy());
        this.entityRadiusIndicators.forEach(indicator => indicator.destroy());
        this.entityRespawnRings.forEach(ring => ring.destroy());
        this.entityAbilityReadyIndicators.forEach(indicator => indicator.destroy());
        this.projectileGraphics.forEach(graphics => graphics.destroy());
        
        // Clear targeting lines graphics
        if (this.targetingLinesGraphics) {
            this.targetingLinesGraphics.destroy();
            this.targetingLinesGraphics = null;
        }
        
        // Clear flashing targeting lines
        this.entityRenderer.clearFlashingTargetingLines();
        
        // Clear all collections
        this.entityGraphics.clear();
        this.entityTexts.clear();
        this.entityAbilityIconTexts.clear();
        this.entityRadiusIndicators.clear();
        this.entityRespawnRings.clear();
        this.entityAbilityReadyIndicators.clear();
        this.projectileGraphics.clear();
        this.processedXPEvents.clear();
        this.processedLevelUpEvents.clear();
        this.lastProcessedTime = 0;
        
        // Force clear any remaining graphics by recreating the targeting lines graphics
        // This ensures a completely fresh state
        this.targetingLinesGraphics = this.scene.add.graphics();
        this.targetingLinesGraphics.setDepth(CLIENT_CONFIG.RENDER_DEPTH.TARGETING_LINES);
        
        // Assign to main camera
        if (this.cameraManager) {
            this.cameraManager.assignToMainCamera(this.targetingLinesGraphics);
        }
        
        // Ensure all tweens are stopped for this scene
        this.scene.tweens.killAll();
    }
} 
