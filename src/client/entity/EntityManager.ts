import Phaser from 'phaser';
import { Combatant, COMBATANT_TYPES, isHeroCombatant, isMinionCombatant, HeroCombatant, MinionCombatant, CombatantId, ControllerId, ProjectileId } from '../../shared/types/CombatantTypes';
import { Obstacle, ObstacleId } from '../../shared/types/ObstacleTypes';
import { SharedGameState, XPEvent, LevelUpEvent, AOEDamageEvent, DeathEffectEvent } from '../../shared/types/GameStateTypes';
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
    private animationManager: any = null;
    
    // Entity storage
    private entityGraphics: Map<CombatantId, Phaser.GameObjects.Graphics> = new Map();
    private entitySprites: Map<CombatantId, Phaser.GameObjects.Sprite> = new Map();
    private entityShadowSprites: Map<CombatantId, Phaser.GameObjects.Sprite> = new Map();
    private entityHealthBars: Map<CombatantId, Phaser.GameObjects.Graphics> = new Map();
    private entityTexts: Map<CombatantId, Phaser.GameObjects.Text> = new Map();
    private entityEffectOverlays: Map<CombatantId, Phaser.GameObjects.Graphics> = new Map();
    private entityRadiusIndicators: Map<CombatantId, Phaser.GameObjects.Graphics> = new Map();
    private entityRespawnRings: Map<CombatantId, Phaser.GameObjects.Graphics> = new Map();
    private projectileGraphics: Map<ProjectileId, Phaser.GameObjects.Graphics> = new Map();
    private projectileLastPositions: Map<ProjectileId, { x: number, y: number, range?: number, startX?: number, startY?: number, team?: string }> = new Map();
    private zoneGraphics: Map<string, Phaser.GameObjects.Graphics> = new Map();
    private obstacleGraphics: Map<ObstacleId, Phaser.GameObjects.Graphics> = new Map();
    private processedDeathEffectEvents: Set<string> = new Set(); // Track processed death effect events
    private targetingLinesGraphics: Phaser.GameObjects.Graphics | null = null;
    private targetingReticleGraphics: Map<CombatantId, Phaser.GameObjects.Graphics> = new Map(); // Individual reticles per target
    private processedXPEvents: Set<string> = new Set();
    private processedLevelUpEvents: Set<string> = new Set();
    private processedAOEDamageEvents: Set<string> = new Set();
    private lastProcessedTime: number = 0;
    private activeExplosionGraphics: Set<Phaser.GameObjects.Graphics> = new Set(); // Track explosion, AOE effect, and other visual effect graphics for cleanup
    private activeXPTexts: Set<Phaser.GameObjects.Text> = new Set(); // Track XP text displays for cleanup
    private activeLevelUpTexts: Set<Phaser.GameObjects.Text> = new Set(); // Track level-up text displays for cleanup
    
    // Track recent attackers (heroes that attacked the player in the last 1 second)
    private recentAttackers: Map<CombatantId, number> = new Map();

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.entityFactory = new EntityFactory(scene);
        this.entityRenderer = new EntityRenderer(scene);
    }

    setPlayerSessionId(sessionId: ControllerId | null): void {
        this.playerSessionId = sessionId;
        this.entityRenderer.setPlayerSessionId(sessionId);
        // Also set it in the color manager
        const colorManager = this.entityFactory.getColorManager();
        colorManager.setPlayerSessionId(sessionId);
    }

    setCameraManager(cameraManager: any): void {
        this.cameraManager = cameraManager;
    }

    setAnimationManager(animationManager: any): void {
        this.animationManager = animationManager;
    }

    /**
     * Forces cleanup of all XP and level-up texts, explosions, muzzle flashes, and other visual effects
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
        
        // Clean up any lingering explosion graphics when window regains focus
        this.cleanupActiveExplosions();
        
        // Clean up any lingering XP text displays when window regains focus
        this.cleanupActiveXPTexts();
        
        // Clean up any lingering level-up text displays when window regains focus
        this.cleanupActiveLevelUpTexts();
        
        // Clean up any lingering muzzle flash graphics when window regains focus
        if (this.animationManager) {
            this.animationManager.cleanupActiveMuzzleFlashes();
        }
        
        // Clean up any lingering red flash graphics when window regains focus
        if (this.cameraManager && this.cameraManager.cleanupActiveRedFlashes) {
            this.cameraManager.cleanupActiveRedFlashes();
        }
    }
    
    /**
     * Cleans up all active explosion and AOE effect graphics (rings, particles, and AOE circles)
     */
    private cleanupActiveExplosions(): void {
        this.cleanupGraphicsSet(this.activeExplosionGraphics);
    }

    /**
     * Cleans up all active XP text displays
     */
    private cleanupActiveXPTexts(): void {
        this.cleanupTextsSet(this.activeXPTexts);
    }

    /**
     * Cleans up all active level-up text displays
     */
    private cleanupActiveLevelUpTexts(): void {
        this.cleanupTextsSet(this.activeLevelUpTexts);
    }

    /**
     * Generic helper to cleanup a set of graphics objects
     */
    private cleanupGraphicsSet(set: Set<Phaser.GameObjects.Graphics>): void {
        set.forEach(graphics => {
            if (graphics && graphics.scene) {
                graphics.destroy();
            }
        });
        set.clear();
    }

    /**
     * Generic helper to cleanup a set of text objects
     */
    private cleanupTextsSet(set: Set<Phaser.GameObjects.Text>): void {
        set.forEach(text => {
            if (text && text.scene) {
                text.destroy();
            }
        });
        set.clear();
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
        
        // Update zones
        this.updateZoneEntities(state);
        
        // Update obstacles
        this.updateObstacleEntities(state);
        
        // Render targeting lines
        this.renderTargetingLines(state);
        
        // Process XP events
        this.processXPEvents(state);
        
        // Process level-up events
        this.processLevelUpEvents(state);
        
        // Process AOE damage events
        this.processAOEDamageEvents(state);
        
        // Process death effect events
        this.processDeathEffectEvents(state);
        
        // Clean up old recent attackers
        this.cleanupOldRecentAttackers(state.gameTime);
        
        // Clean up old processed events
        this.cleanupOldProcessedEvents(state.gameTime);
        
        // Remove combatants that no longer exist
        this.cleanupRemovedCombatants(state);
        
        // Remove projectiles that no longer exist
        this.cleanupRemovedProjectiles(state);
        
        // Remove zones that no longer exist
        this.cleanupRemovedZones(state);
    }

    /**
     * Updates a single combatant entity, creating it if it doesn't exist
     */
    private updateCombatantEntity(combatantData: Combatant, state: SharedGameState): void {
        const entityId = combatantData.id;
        
        // Get or create entity graphics and sprites
        let entityGraphics = this.entityGraphics.get(entityId);
        let entitySprite = this.entitySprites.get(entityId);
        let entityHealthBar = this.entityHealthBars.get(entityId);
        let entityText = this.entityTexts.get(entityId);
        let radiusIndicator = this.entityRadiusIndicators.get(entityId);
        
        // Create sprite for heroes
        if (!entitySprite && combatantData.type === COMBATANT_TYPES.HERO && isHeroCombatant(combatantData)) {
            const abilityType = combatantData.ability?.type || 'default';
            entitySprite = this.entityFactory.createHeroSprite(abilityType, combatantData);
            // Set initial position immediately to avoid spawning at (0,0)
            entitySprite.setPosition(combatantData.x, combatantData.y);
            
            // Assign to main camera
            if (this.cameraManager) {
                this.cameraManager.assignToMainCamera(entitySprite);
            }
            
            this.entitySprites.set(entityId, entitySprite);
        } else if (entitySprite && combatantData.type === COMBATANT_TYPES.HERO && isHeroCombatant(combatantData)) {
            // Check if ability type has changed and update texture accordingly
            this.updateHeroSpriteTexture(entitySprite, combatantData);
            
            // Update hero colors based on current state
            this.updateHeroColors(entitySprite, combatantData);
        }
        
        // Create sprite for minions
        if (!entitySprite && combatantData.type === COMBATANT_TYPES.MINION && isMinionCombatant(combatantData)) {
            const minionType = combatantData.minionType || 'warrior';
            entitySprite = this.entityFactory.createMinionSprite(minionType, combatantData);
            // Set initial position immediately to avoid spawning at (0,0)
            entitySprite.setPosition(combatantData.x, combatantData.y);
            
            // Assign to main camera
            if (this.cameraManager) {
                this.cameraManager.assignToMainCamera(entitySprite);
            }
            
            this.entitySprites.set(entityId, entitySprite);
        } else if (entitySprite && combatantData.type === COMBATANT_TYPES.MINION && isMinionCombatant(combatantData)) {
            // Update minion colors based on team
            this.updateMinionColors(entitySprite, combatantData);
        }
        
        // Create sprite for structures
        if (!entitySprite && (combatantData.type === COMBATANT_TYPES.CRADLE || combatantData.type === COMBATANT_TYPES.TURRET)) {
            const structureType = combatantData.type === COMBATANT_TYPES.CRADLE ? 'cradle' : 'turret';
            entitySprite = this.entityFactory.createStructureSprite(structureType, combatantData);
            // Set initial position immediately to avoid spawning at (0,0)
            entitySprite.setPosition(combatantData.x, combatantData.y);
            
            // Assign to main camera
            if (this.cameraManager) {
                this.cameraManager.assignToMainCamera(entitySprite);
            }
            
            this.entitySprites.set(entityId, entitySprite);
        } else if (entitySprite && (combatantData.type === COMBATANT_TYPES.CRADLE || combatantData.type === COMBATANT_TYPES.TURRET)) {
            // Update structure colors based on team and health
            this.updateStructureColors(entitySprite, combatantData);
        }
        
        // Create health bar for heroes and structures
        if (!entityHealthBar && (combatantData.type === COMBATANT_TYPES.HERO || combatantData.type === COMBATANT_TYPES.CRADLE || combatantData.type === COMBATANT_TYPES.TURRET)) {
            entityHealthBar = this.entityFactory.createHealthBar();
            // Set initial position immediately to avoid spawning at (0,0)
            entityHealthBar.setPosition(combatantData.x, combatantData.y);
            
            // Assign to main camera
            if (this.cameraManager) {
                this.cameraManager.assignToMainCamera(entityHealthBar);
            }
            
            this.entityHealthBars.set(entityId, entityHealthBar);
        }
        
        // Create effect overlay for sprites (heroes and minions)
        let entityEffectOverlay = this.entityEffectOverlays.get(entityId);
        if (!entityEffectOverlay && entitySprite) {
            entityEffectOverlay = this.scene.add.graphics();
            entityEffectOverlay.setPosition(combatantData.x, combatantData.y);
            
            // Set depth based on entity type
            if (combatantData.type === COMBATANT_TYPES.HERO) {
                entityEffectOverlay.setDepth(CLIENT_CONFIG.RENDER_DEPTH.HEROES + 1); // Slightly above hero sprites
            } else if (combatantData.type === COMBATANT_TYPES.MINION) {
                entityEffectOverlay.setDepth(CLIENT_CONFIG.RENDER_DEPTH.MINIONS + 1); // Slightly above minion sprites
            } else {
                entityEffectOverlay.setDepth(CLIENT_CONFIG.RENDER_DEPTH.STRUCTURES + 1); // Slightly above structure sprites
            }
            
            // Assign to main camera
            if (this.cameraManager) {
                this.cameraManager.assignToMainCamera(entityEffectOverlay);
            }
            
            this.entityEffectOverlays.set(entityId, entityEffectOverlay);
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
        }
        
        // Create smooth movement animation
        const targets = [];
        if (entityGraphics) targets.push(entityGraphics);
        if (entitySprite) targets.push(entitySprite);
        if (entityHealthBar) targets.push(entityHealthBar);
        targets.push(entityText, radiusIndicator);
        if (respawnRing) targets.push(respawnRing);
        if (entityEffectOverlay) targets.push(entityEffectOverlay);
        
        this.animateEntityMovement(
            entityId,
            targets as (Phaser.GameObjects.Graphics | Phaser.GameObjects.Text)[],
            combatantData.x,
            combatantData.y
        );
        
        // Animate shadow sprite to follow entity with offset
        const shadowSprite = this.entityShadowSprites.get(entityId);
        if (shadowSprite) {
            this.scene.tweens.add({
                targets: shadowSprite,
                x: combatantData.x + CLIENT_CONFIG.DROP_SHADOW.OFFSET_X,
                y: combatantData.y + CLIENT_CONFIG.DROP_SHADOW.OFFSET_Y,
                duration: CLIENT_CONFIG.ENTITY_MOVEMENT_DURATION_MS,
                ease: 'Linear'
            });
        }
        
        // Animate rotation for sprites (if they exist)
        if (entitySprite) {
            this.animateEntityRotation(entityId, entitySprite, combatantData.direction);
        }
        
        // Update shadow sprite scale to match entity
        if (shadowSprite && entitySprite) {
            shadowSprite.setScale(entitySprite.scaleX, entitySprite.scaleY);
        }
        
        // Check if structure is targeting the player
        const isStructure = combatantData.type === COMBATANT_TYPES.CRADLE || combatantData.type === COMBATANT_TYPES.TURRET;
        let isTargetingPlayer = false;
        
        if (isStructure && combatantData.target && this.playerSessionId) {
            // Find the player's hero ID
            const playerHeroId = this.findPlayerHeroId(state);
            if (playerHeroId && combatantData.target === playerHeroId) {
                isTargetingPlayer = true;
            }
        }
        
        // Render the entity
        this.entityRenderer.renderEntity(
            combatantData,
            (entitySprite || entityGraphics)!,
            entityText,
            radiusIndicator,
            respawnRing,
            entityHealthBar,
            entityEffectOverlay,
            state,
            this.playerSessionId,
            this.isRecentAttacker(entityId),
            isTargetingPlayer
        );
        
        // Create shadow sprite immediately after entity is positioned and scaled
        if (entitySprite && !this.entityShadowSprites.has(entityId)) {
            const shadowSprite = this.entityFactory.createShadowSprite(entitySprite, combatantData.x, combatantData.y, combatantData.type);
            
            // Apply the same scale as the entity sprite
            shadowSprite.setScale(entitySprite.scaleX, entitySprite.scaleY);
            
            if (this.cameraManager) {
                this.cameraManager.assignToMainCamera(shadowSprite);
            }
            this.entityShadowSprites.set(entityId, shadowSprite);
        }
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
            // Trigger muzzle flash effect when new projectile is created (ability fired)
            if (this.animationManager) {
                this.animationManager.createMuzzleFlashEffect(
                    projectileData.x, 
                    projectileData.y
                );
            }
            
            projectileGraphics = this.entityFactory.createEntityGraphics();
            // Set initial position immediately to avoid spawning at (0,0)
            projectileGraphics.setPosition(projectileData.x, projectileData.y);
            
            // Set depth based on projectile ownership
            const isOwnerControlledByPlayer = state && this.playerSessionId && projectileData.ownerId && 
                (() => {
                    const owner = state.combatants.get(projectileData.ownerId);
                    return owner && owner.type === COMBATANT_TYPES.HERO && owner.controller === this.playerSessionId;
                })();
            
            if (isOwnerControlledByPlayer) {
                projectileGraphics.setDepth(CLIENT_CONFIG.RENDER_DEPTH.PLAYER_PROJECTILES);
            } else {
                projectileGraphics.setDepth(CLIENT_CONFIG.RENDER_DEPTH.PROJECTILES);
            }
            
            // Assign to main camera
            if (this.cameraManager) {
                this.cameraManager.assignToMainCamera(projectileGraphics);
            }
            
            this.projectileGraphics.set(entityId, projectileGraphics);
        }
        
        // Track projectile position for miss detection
        this.projectileLastPositions.set(entityId, {
            x: projectileData.x,
            y: projectileData.y,
            range: projectileData.range,
            startX: projectileData.startX,
            startY: projectileData.startY,
            team: projectileData.team
        });
        
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
     * Updates zone entities
     */
    private updateZoneEntities(state: SharedGameState): void {
        if (!state.zones) return;
        
        state.zones.forEach((zoneData: any) => {
            this.updateZoneEntity(zoneData, state);
        });
    }

    /**
     * Updates a single zone entity, creating it if it doesn't exist
     */
    private updateZoneEntity(zoneData: any, state: SharedGameState): void {
        const entityId = zoneData.id;
        
        // Get or create zone graphics
        let zoneGraphics = this.zoneGraphics.get(entityId);
        
        if (!zoneGraphics) {
            zoneGraphics = this.entityFactory.createEntityGraphics();
            zoneGraphics.setPosition(zoneData.x, zoneData.y);
            
            // Set depth below combatants
            zoneGraphics.setDepth(-1); // Below structures but above background
            
            // Assign to main camera
            if (this.cameraManager) {
                this.cameraManager.assignToMainCamera(zoneGraphics);
            }
            
            this.zoneGraphics.set(entityId, zoneGraphics);
        }
        
        // Render the zone
        this.renderZone(zoneData, zoneGraphics, state);
    }

    /**
     * Renders a zone (colored circle)
     */
    private renderZone(zoneData: any, zoneGraphics: Phaser.GameObjects.Graphics, state: SharedGameState): void {
        zoneGraphics.clear();
        
        // Determine color based on team
        let zoneColor = 0xff6b35; // Default orange
        if (zoneData.team === 'blue') {
            zoneColor = 0x1e90ff; // Bright blue for better contrast against beige
        } else if (zoneData.team === 'red') {
            zoneColor = 0xe24a4a; // Red
        }
        
        // Draw filled circle with border
        zoneGraphics.fillStyle(zoneColor, 0.5); // Low opacity fill
        zoneGraphics.lineStyle(2, zoneColor, 0.9); // More visible border
        zoneGraphics.fillCircle(0, 0, zoneData.radius);
        zoneGraphics.strokeCircle(0, 0, zoneData.radius);
    }

    /**
     * Updates all obstacle entities based on the current game state
     */
    private updateObstacleEntities(state: SharedGameState): void {
        state.obstacles.forEach((obstacleData: Obstacle) => {
            this.updateObstacleEntity(obstacleData, state);
        });
    }

    /**
     * Updates a single obstacle entity, creating it if it doesn't exist
     */
    private updateObstacleEntity(obstacleData: Obstacle, state: SharedGameState): void {
        const entityId = obstacleData.id;
        
        // Get or create obstacle graphics
        let obstacleGraphics = this.obstacleGraphics.get(entityId);
        
        if (!obstacleGraphics) {
            obstacleGraphics = this.entityFactory.createEntityGraphics();
            obstacleGraphics.setPosition(obstacleData.x, obstacleData.y);
            
            // Set depth above ground but below combatants
            obstacleGraphics.setDepth(0);
            
            // Assign to main camera
            if (this.cameraManager) {
                this.cameraManager.assignToMainCamera(obstacleGraphics);
            }
            
            this.obstacleGraphics.set(entityId, obstacleGraphics);
        }
        
        // Render the obstacle
        this.renderObstacle(obstacleData, obstacleGraphics, state);
    }

    /**
     * Renders an obstacle (rectangle or circle)
     */
    private renderObstacle(obstacleData: Obstacle, obstacleGraphics: Phaser.GameObjects.Graphics, state: SharedGameState): void {
        obstacleGraphics.clear();
        
        switch (obstacleData.hitboxType) {
            case 'rectangle':
                if (obstacleData.width && obstacleData.height) {
                    // Draw rectangle centered at origin
                    const halfWidth = obstacleData.width / 2;
                    const halfHeight = obstacleData.height / 2;
                    
                    if (obstacleData.rotation && obstacleData.rotation !== 0) {
                        // Apply rotation using transformation matrix
                        const cos = Math.cos(obstacleData.rotation);
                        const sin = Math.sin(obstacleData.rotation);
                        
                        // Draw rotated rectangle by transforming each corner
                        const corners = [
                            { x: -halfWidth, y: -halfHeight },
                            { x: halfWidth, y: -halfHeight },
                            { x: halfWidth, y: halfHeight },
                            { x: -halfWidth, y: halfHeight }
                        ];
                        
                        const rotatedCorners = corners.map(corner => ({
                            x: corner.x * cos - corner.y * sin,
                            y: corner.x * sin + corner.y * cos
                        }));
                        
                        // Draw border (outer rectangle)
                        obstacleGraphics.fillStyle(0x2f3930, 1); // #2f3930 border color
                        obstacleGraphics.fillPoints(rotatedCorners);
                        
                        // Draw interior (inner rectangle, 3px smaller on each side)
                        const innerCorners = [
                            { x: -halfWidth + 3, y: -halfHeight + 3 },
                            { x: halfWidth - 3, y: -halfHeight + 3 },
                            { x: halfWidth - 3, y: halfHeight - 3 },
                            { x: -halfWidth + 3, y: halfHeight - 3 }
                        ];
                        
                        const rotatedInnerCorners = innerCorners.map(corner => ({
                            x: corner.x * cos - corner.y * sin,
                            y: corner.x * sin + corner.y * cos
                        }));
                        
                        obstacleGraphics.fillStyle(0x716d53, 1); // #716d53 interior color
                        obstacleGraphics.fillPoints(rotatedInnerCorners);
                    } else {
                        // Draw border (outer rectangle)
                        obstacleGraphics.fillStyle(0x2f3930, 1); // #2f3930 border color
                        obstacleGraphics.fillRect(-halfWidth, -halfHeight, obstacleData.width, obstacleData.height);
                        
                        // Draw interior (inner rectangle, 3px smaller on each side)
                        obstacleGraphics.fillStyle(0x716d53, 1); // #716d53 interior color
                        obstacleGraphics.fillRect(-halfWidth + 3, -halfHeight + 3, obstacleData.width - 6, obstacleData.height - 6);
                    }
                }
                break;
                
            case 'circle':
                if (obstacleData.radius) {
                    // Draw border (outer circle)
                    obstacleGraphics.fillStyle(0x2f3930, 1); // #2f3930 border color
                    obstacleGraphics.fillCircle(0, 0, obstacleData.radius);
                    
                    // Draw interior (inner circle, 3px smaller radius)
                    obstacleGraphics.fillStyle(0x716d53, 1); // #716d53 interior color
                    obstacleGraphics.fillCircle(0, 0, obstacleData.radius - 3);
                }
                break;
        }
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
            text = `+${Math.round(xpEvent.amount)}XP Last Hit!`;
        } else if (xpEvent.type === 'heroKill') {
            color = CLIENT_CONFIG.XP_EVENTS.COLORS.LAST_HIT;
            text = `+${Math.round(xpEvent.amount)}XP Kill!`;
            fontSize = CLIENT_CONFIG.XP_EVENTS.FONTS.HERO_KILL_SIZE;
        }
        
        const xpText = this.scene.add.text(xpEvent.x, xpEvent.y, text, {
            fontSize: fontSize,
            color: color,
            fontFamily: CLIENT_CONFIG.UI.FONTS.PRIMARY,
            shadow: {
                offsetX: 1,
                offsetY: 1,
                color: '#000000',
                blur: 2,
                stroke: true,
                fill: true
            }
        }).setOrigin(0.5).setDepth(CLIENT_CONFIG.RENDER_DEPTH.OVERLAY); // High depth to appear above everything
        
        // Assign to main camera and apply inverse zoom to counteract camera zoom
        if (this.cameraManager) {
            this.cameraManager.assignToMainCamera(xpText);
            const currentZoom = this.cameraManager.camera.zoom;
            xpText.setScale(1 / currentZoom);
        }
        
        // Track for cleanup
        this.activeXPTexts.add(xpText);
        
        // Create secondary text for hero name if available
        let heroNameText: Phaser.GameObjects.Text | null = null;
        if (xpEvent.type === 'heroKill' && xpEvent.targetName) {
            const fontStyle = xpEvent.targetIsBot ? 'italic' : 'normal';
            heroNameText = this.scene.add.text(xpEvent.x, xpEvent.y + 18, xpEvent.targetName, {
                fontSize: '17px',
                color: color,
                fontFamily: CLIENT_CONFIG.UI.FONTS.PRIMARY,
                fontStyle: fontStyle,
                shadow: {
                    offsetX: 1,
                    offsetY: 1,
                    color: '#000000',
                    blur: 2,
                    stroke: true,
                    fill: true
                }
            }).setOrigin(0.5).setDepth(CLIENT_CONFIG.RENDER_DEPTH.OVERLAY);
            
            // Assign to main camera and apply inverse zoom to counteract camera zoom
            if (this.cameraManager) {
                this.cameraManager.assignToMainCamera(heroNameText);
                const currentZoom = this.cameraManager.camera.zoom;
                heroNameText.setScale(1 / currentZoom);
            }
            
            // Track for cleanup
            this.activeXPTexts.add(heroNameText);
        }
        
        // Animate the text floating up and fading out
        const animationTargets = heroNameText ? [xpText, heroNameText] : [xpText];
        this.scene.tweens.add({
            targets: animationTargets,
            y: `-=${CLIENT_CONFIG.XP_EVENTS.ANIMATION.FLOAT_DISTANCE}`,
            alpha: 0,
            duration: CLIENT_CONFIG.XP_EVENTS.ANIMATION.DURATION_MS,
            ease: 'Power2',
            onComplete: () => {
                this.activeXPTexts.delete(xpText);
                xpText.destroy();
                if (heroNameText) {
                    this.activeXPTexts.delete(heroNameText);
                    heroNameText.destroy();
                }
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
        
        // Track for cleanup
        this.activeExplosionGraphics.add(aoeGraphics);
        
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
            fontFamily: CLIENT_CONFIG.UI.FONTS.PRIMARY,
            shadow: {
                offsetX: 1,
                offsetY: 1,
                color: '#000000',
                blur: 2,
                stroke: true,
                fill: true
            }
        }).setOrigin(0.5).setDepth(CLIENT_CONFIG.RENDER_DEPTH.OVERLAY); // High depth to appear above everything
        
        // Assign to main camera and apply inverse zoom to counteract camera zoom
        if (this.cameraManager) {
            this.cameraManager.assignToMainCamera(levelUpText);
            const currentZoom = this.cameraManager.camera.zoom;
            levelUpText.setScale(1 / currentZoom);
        }
        
        // Track for cleanup
        this.activeLevelUpTexts.add(levelUpText);
        
        // Animate the text floating up and fading out
        this.scene.tweens.add({
            targets: levelUpText,
            y: levelUpText.y - CLIENT_CONFIG.LEVEL_UP_EVENTS.ANIMATION.FLOAT_DISTANCE,
            alpha: 0,
            duration: CLIENT_CONFIG.LEVEL_UP_EVENTS.ANIMATION.DURATION_MS,
            ease: 'Power2',
            onComplete: () => {
                this.activeLevelUpTexts.delete(levelUpText);
                levelUpText.destroy();
            }
        });
    }

    /**
     * Processes death effect events and creates visual effects
     */
    private processDeathEffectEvents(state: SharedGameState): void {
        state.deathEffectEvents.forEach(deathEffectEvent => {
            // Create unique identifier for this death effect event
            const eventId = `${deathEffectEvent.targetId}-${deathEffectEvent.timestamp}`;
            
            // Only process if we haven't seen this death effect event before
            if (!this.processedDeathEffectEvents.has(eventId)) {
                this.processedDeathEffectEvents.add(eventId);
                this.createDeathEffect(deathEffectEvent);
            }
        });
    }

    /**
     * Creates a visual death effect at the specified position
     */
    private createDeathEffect(deathEffectEvent: DeathEffectEvent): void {
        // Create a graphics object for the death effect
        const deathGraphics = this.scene.add.graphics();
        deathGraphics.setPosition(deathEffectEvent.x, deathEffectEvent.y);
        deathGraphics.setDepth(CLIENT_CONFIG.RENDER_DEPTH.EFFECTS); // High depth to appear above everything
        
        // Assign to main camera
        if (this.cameraManager) {
            this.cameraManager.assignToMainCamera(deathGraphics);
        }
        
        // Determine color based on the dead combatant's team
        let deathColor = 0xff6b35; // Default orange
        if (deathEffectEvent.team === 'blue') {
            deathColor = CLIENT_CONFIG.PROJECTILE.BLUE_COLOR;
        } else if (deathEffectEvent.team === 'red') {
            deathColor = CLIENT_CONFIG.PROJECTILE.RED_COLOR;
        }
        
        // Scale effect based on combatant type
        let explosionRadius: number;
        let numRings: number;
        let ringDuration: number;
        let numParticles: number;
        let particleSize: number;
        let particleDistance: number;
        
        switch (deathEffectEvent.targetType) {
            case 'minion':
                explosionRadius = 10; // 5 * 2
                numRings = 1; // Minimal rings
                ringDuration = 400; // Shorter duration
                numParticles = 6; // More particles
                particleSize = 4; // 2 * 2
                particleDistance = 30; // 15 * 2
                break;
            case 'turret':
            case 'cradle':
                explosionRadius = 40; // 20 * 2
                numRings = 2; // Fewer rings
                ringDuration = 400; // Shorter duration
                numParticles = 20; // Many more particles
                particleSize = 6; // 3 * 2
                particleDistance = 80; // 40 * 2
                break;
            case 'hero':
            default:
                explosionRadius = 14; // 7 * 2
                numRings = 2; // Fewer rings
                ringDuration = 400; // Shorter duration
                numParticles = 12; // More particles
                particleSize = 4; // 2 * 2
                particleDistance = 50; // 25 * 2
                break;
        }
        
        for (let i = 0; i < numRings; i++) {
            const ringGraphics = this.scene.add.graphics();
            ringGraphics.setPosition(deathEffectEvent.x, deathEffectEvent.y);
            ringGraphics.setDepth(CLIENT_CONFIG.RENDER_DEPTH.EFFECTS);
            
            // Track for cleanup
            this.activeExplosionGraphics.add(ringGraphics);
            
            if (this.cameraManager) {
                this.cameraManager.assignToMainCamera(ringGraphics);
            }
            
            // Draw explosion ring
            ringGraphics.lineStyle(4 - i, deathColor, 0.8 - (i * 0.2));
            ringGraphics.strokeCircle(0, 0, explosionRadius);
            
            // Animate the explosion ring
            const delay = i * 100; // Stagger the rings
            const duration = ringDuration - (i * 50); // Each ring lasts less time
            const scale = 1.5 + (i * 0.3); // Each ring scales more
            
            this.scene.tweens.add({
                targets: ringGraphics,
                scaleX: scale,
                scaleY: scale,
                alpha: 0,
                duration: duration,
                delay: delay,
                ease: 'Power2',
                onComplete: () => {
                    ringGraphics.destroy();
                }
            });
        }
        
        // Create particle effect (small dots scattering outward)
        for (let i = 0; i < numParticles; i++) {
            const particleGraphics = this.scene.add.graphics();
            particleGraphics.setPosition(deathEffectEvent.x, deathEffectEvent.y);
            particleGraphics.setDepth(CLIENT_CONFIG.RENDER_DEPTH.EFFECTS);
            
            // Track for cleanup
            this.activeExplosionGraphics.add(particleGraphics);
            
            if (this.cameraManager) {
                this.cameraManager.assignToMainCamera(particleGraphics);
            }
            
            // Draw particle with scaled size
            particleGraphics.fillStyle(deathColor, 0.8);
            particleGraphics.fillCircle(0, 0, particleSize);
            
            // Calculate random direction
            const angle = (i / numParticles) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
            const distance = particleDistance + Math.random() * 20;
            const targetX = Math.cos(angle) * distance;
            const targetY = Math.sin(angle) * distance;
            
            // Animate particle scattering with scaled duration
            const particleDuration = deathEffectEvent.targetType === 'minion' 
                ? 300 + Math.random() * 100  // Even shorter for minions
                : deathEffectEvent.targetType === 'turret' || deathEffectEvent.targetType === 'cradle'
                ? 800 + Math.random() * 300  // Longer for turrets/cradles
                : 500 + Math.random() * 150; // Shorter duration for heroes
            
            this.scene.tweens.add({
                targets: particleGraphics,
                x: particleGraphics.x + targetX,
                y: particleGraphics.y + targetY,
                alpha: 0,
                duration: particleDuration,
                ease: 'Power2',
                onComplete: () => {
                    particleGraphics.destroy();
                }
            });
        }
        
        // Clean up the main death graphics after a short delay
        this.scene.time.delayedCall(100, () => {
            deathGraphics.destroy();
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
        
        // Clean up position tracking
        this.projectileLastPositions.delete(entityId);
    }

    /**
     * Removes zones that no longer exist in the game state
     */
    private cleanupRemovedZones(state: SharedGameState): void {
        if (!state.zones) return;
        
        this.zoneGraphics.forEach((zoneGraphics, entityId) => {
            if (!state.zones.has(entityId)) {
                this.destroyZoneEntity(entityId);
            }
        });
    }

    /**
     * Destroys a zone entity
     */
    private destroyZoneEntity(entityId: string): void {
        const zoneGraphics = this.zoneGraphics.get(entityId);
        if (zoneGraphics) {
            zoneGraphics.destroy();
            this.zoneGraphics.delete(entityId);
        }
    }

    /**
     * Removes combatants that no longer exist in the game state
     */
    private cleanupRemovedCombatants(state: SharedGameState): void {
        // Check graphics entities
        this.entityGraphics.forEach((entityGraphics, entityId) => {
            if (!state.combatants.has(entityId)) {
                this.destroyCombatantEntity(entityId);
            }
        });
        
        // Check sprite entities
        this.entitySprites.forEach((entitySprite, entityId) => {
            if (!state.combatants.has(entityId)) {
                this.destroyCombatantEntity(entityId);
            }
        });
        
        // Check shadow sprites specifically
        this.entityShadowSprites.forEach((shadowSprite, entityId) => {
            if (!state.combatants.has(entityId)) {
                this.destroyCombatantEntity(entityId);
            }
        });
        
        // Check health bar entities
        this.entityHealthBars.forEach((entityHealthBar, entityId) => {
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
        
        // Destroy sprite
        const entitySprite = this.entitySprites.get(entityId);
        if (entitySprite) {
            entitySprite.destroy();
            this.entitySprites.delete(entityId);
        }
        
        // Destroy shadow sprite
        const shadowSprite = this.entityShadowSprites.get(entityId);
        if (shadowSprite) {
            shadowSprite.destroy();
            this.entityShadowSprites.delete(entityId);
        }
        
        // Destroy health bar
        const entityHealthBar = this.entityHealthBars.get(entityId);
        if (entityHealthBar) {
            entityHealthBar.destroy();
            this.entityHealthBars.delete(entityId);
        }
        
        // Destroy effect overlay
        const entityEffectOverlay = this.entityEffectOverlays.get(entityId);
        if (entityEffectOverlay) {
            entityEffectOverlay.destroy();
            this.entityEffectOverlays.delete(entityId);
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
        
    }

    /**
     * Gets an entity's graphics for external use (e.g., animations)
     * Returns sprite for heroes, graphics for other entities
     */
    getEntityGraphics(entityId: CombatantId): Phaser.GameObjects.Graphics | Phaser.GameObjects.Sprite | undefined {
        // Return sprite for heroes if it exists
        const sprite = this.entitySprites.get(entityId);
        if (sprite) {
            return sprite;
        }
        
        // Fallback to graphics for non-hero entities
        return this.entityGraphics.get(entityId);
    }

    /**
     * Updates hero sprite texture based on ability type
     */
    private updateHeroSpriteTexture(sprite: Phaser.GameObjects.Sprite, combatant: HeroCombatant): void {
        const currentAbilityType = combatant.ability?.type || 'default';
        const expectedTextureKey = this.getHeroTextureKey(currentAbilityType);
        
        // Only update if the texture has changed
        if (sprite.texture.key !== expectedTextureKey) {
            sprite.setTexture(expectedTextureKey);
            
            // Also update the shadow sprite texture to match
            const entityId = combatant.id;
            const shadowSprite = this.entityShadowSprites.get(entityId);
            if (shadowSprite) {
                shadowSprite.setTexture(expectedTextureKey);
            }
        }
    }

    /**
     * Updates hero colors based on current state
     */
    private updateHeroColors(sprite: Phaser.GameObjects.Sprite, combatant: HeroCombatant): void {
        const colorManager = this.entityFactory.getColorManager();
        colorManager.updateHeroColors(sprite, combatant);
    }

    /**
     * Updates minion sprite colors based on team
     */
    private updateMinionColors(sprite: Phaser.GameObjects.Sprite, combatant: MinionCombatant): void {
        const colorManager = this.entityFactory.getColorManager();
        colorManager.updateMinionColors(sprite, combatant);
    }

    /**
     * Updates structure sprite colors based on team and health
     */
    private updateStructureColors(sprite: Phaser.GameObjects.Sprite, combatant: Combatant): void {
        const colorManager = this.entityFactory.getColorManager();
        colorManager.updateStructureColors(sprite, combatant);
    }

    /**
     * Gets the appropriate texture key based on hero ability type
     */
    private getHeroTextureKey(abilityType: string): string {
        switch (abilityType) {
            case 'hookshot':
                return 'hero-hookshot';
            case 'mercenary':
                return 'hero-mercenary';
            case 'pyromancer':
                return 'hero-pyromancer';
            case 'sniper':
                return 'hero-sniper';
            case 'thorndive':
                return 'hero-thorndive';
            case 'default':
            default:
                return 'hero-base';
        }
    }

    /**
     * Gets an entity's radius indicator for external use (e.g., attack animations)
     */
    getEntityRadiusIndicator(entityId: CombatantId): Phaser.GameObjects.Graphics | undefined {
        return this.entityRadiusIndicators.get(entityId);
    }

    /**
     * Tracks a hero that attacked the player
     */
    trackRecentAttacker(attackerId: CombatantId, timestamp: number): void {
        this.recentAttackers.set(attackerId, timestamp);
    }

    /**
     * Cleans up old recent attackers (older than 1 second)
     */
    private cleanupOldRecentAttackers(currentTime: number): void {
        const oneSecondAgo = currentTime - 1000;
        for (const [attackerId, timestamp] of this.recentAttackers.entries()) {
            if (timestamp < oneSecondAgo) {
                this.recentAttackers.delete(attackerId);
            }
        }
    }

    /**
     * Cleans up old processed events to prevent memory leaks
     */
    private cleanupOldProcessedEvents(currentTime: number): void {
        // Keep processed events for 10 seconds, then clean them up
        const tenSecondsAgo = currentTime - 10000;
        
        // Clean up processed death effect events
        for (const eventId of this.processedDeathEffectEvents) {
            const timestamp = parseInt(eventId.split('-').pop() || '0');
            if (timestamp < tenSecondsAgo) {
                this.processedDeathEffectEvents.delete(eventId);
            }
        }
        
        // Clean up processed AOE damage events
        for (const eventKey of this.processedAOEDamageEvents) {
            const timestamp = parseInt(eventKey.split('-').pop() || '0');
            if (timestamp < tenSecondsAgo) {
                this.processedAOEDamageEvents.delete(eventKey);
            }
        }
    }

    /**
     * Checks if a combatant is a recent attacker
     */
    isRecentAttacker(combatantId: CombatantId): boolean {
        return this.recentAttackers.has(combatantId);
    }

    /**
     * Finds the ID of the player's hero
     */
    private findPlayerHeroId(state?: SharedGameState): CombatantId | null {
        if (!state || !this.playerSessionId) {
            return null;
        }
        
        for (const [id, combatant] of state.combatants) {
            if (combatant.type === COMBATANT_TYPES.HERO && 
                isHeroCombatant(combatant) && 
                combatant.controller === this.playerSessionId) {
                return id;
            }
        }
        
        return null;
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
     * Animates rotation for a sprite entity
     */
    private animateEntityRotation(
        entityId: CombatantId,
        sprite: Phaser.GameObjects.Sprite,
        targetDirection: number
    ): void {
        // Convert direction from degrees to radians for Phaser
        const targetRotation = (targetDirection * Math.PI) / 180;
        
        // Calculate shortest rotation path
        const currentRotation = sprite.rotation;
        let rotationDiff = targetRotation - currentRotation;
        
        // Normalize rotation difference to [-PI, PI]
        while (rotationDiff > Math.PI) rotationDiff -= 2 * Math.PI;
        while (rotationDiff < -Math.PI) rotationDiff += 2 * Math.PI;
        
        const finalRotation = currentRotation + rotationDiff;
        
        // Create smooth tween to new rotation
        this.scene.tweens.add({
            targets: sprite,
            rotation: finalRotation,
            duration: CLIENT_CONFIG.ENTITY_ROTATION_DURATION_MS,
            ease: 'Linear',
            onUpdate: () => {
                // Update shadow rotation to match entity rotation during animation
                const shadowSprite = this.entityShadowSprites.get(entityId);
                if (shadowSprite) {
                    shadowSprite.setRotation(sprite.rotation);
                }
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
        this.entitySprites.forEach(sprite => sprite.destroy());
        this.entityShadowSprites.forEach(sprite => sprite.destroy());
        this.entityHealthBars.forEach(healthBar => healthBar.destroy());
        this.entityEffectOverlays.forEach(overlay => overlay.destroy());
        this.entityTexts.forEach(text => text.destroy());
        this.entityRadiusIndicators.forEach(indicator => indicator.destroy());
        this.entityRespawnRings.forEach(ring => ring.destroy());
        this.projectileGraphics.forEach(graphics => graphics.destroy());
        this.zoneGraphics.forEach(graphics => graphics.destroy());
        
        // Clear active transient effects
        this.cleanupActiveExplosions();
        this.cleanupActiveXPTexts();
        this.cleanupActiveLevelUpTexts();
        
        if (this.targetingLinesGraphics) {
            this.targetingLinesGraphics.destroy();
            this.targetingLinesGraphics = null;
        }
        
        // Clear flashing targeting lines
        this.entityRenderer.clearFlashingTargetingLines();
        this.entityRenderer.destroy();
        
        this.entityGraphics.clear();
        this.entitySprites.clear();
        this.entityShadowSprites.clear();
        this.entityHealthBars.clear();
        this.entityEffectOverlays.clear();
        this.entityTexts.clear();
        this.entityRadiusIndicators.clear();
        this.entityRespawnRings.clear();
        this.projectileGraphics.clear();
        this.zoneGraphics.clear();
        this.processedXPEvents.clear();
        this.processedLevelUpEvents.clear();
        this.processedDeathEffectEvents.clear();
        this.recentAttackers.clear();
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
        
        // Update targeting reticles
        this.updateTargetingReticles(state);
    }

    /**
     * Updates targeting reticles for the player's current target
     */
    private updateTargetingReticles(state: SharedGameState): void {
        if (!this.playerSessionId) return;
        
        // Find the player's hero and current target
        let playerHero: Combatant | null = null;
        let currentTargetId: CombatantId | null = null;
        
        state.combatants.forEach((combatant) => {
            if (combatant.type === COMBATANT_TYPES.HERO && 
                isHeroCombatant(combatant) && 
                combatant.controller === this.playerSessionId &&
                combatant.health > 0 &&
                combatant.state !== 'respawning') {
                playerHero = combatant;
                currentTargetId = combatant.target || null;
            }
        });
        
        // Clean up reticles for targets that are no longer being targeted
        const targetsToRemove: CombatantId[] = [];
        this.targetingReticleGraphics.forEach((graphics, targetId) => {
            if (targetId !== currentTargetId) {
                graphics.destroy();
                targetsToRemove.push(targetId);
            }
        });
        targetsToRemove.forEach(id => this.targetingReticleGraphics.delete(id));
        
        // Create/update reticle for current target
        if (currentTargetId) {
            const target = state.combatants.get(currentTargetId);
            if (target && target.health > 0) {
                let reticleGraphics = this.targetingReticleGraphics.get(currentTargetId);
                
                if (!reticleGraphics) {
                    // Create new reticle graphics
                    reticleGraphics = this.scene.add.graphics();
                    reticleGraphics.setDepth(CLIENT_CONFIG.RENDER_DEPTH.ABILITY_INDICATORS);
                    
                    // Graphics object stays at origin, we draw with absolute world coordinates
                    reticleGraphics.setPosition(0, 0);
                    
                    if (this.cameraManager) {
                        this.cameraManager.assignToMainCamera(reticleGraphics);
                    }
                    
                    this.targetingReticleGraphics.set(currentTargetId, reticleGraphics);
                }
                
                // Draw the reticle at the target's position
                this.entityRenderer.renderTargetingReticle(target, reticleGraphics);
            }
        }
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
        this.entitySprites.forEach(sprite => sprite.destroy());
        this.entityShadowSprites.forEach(sprite => sprite.destroy());
        this.entityHealthBars.forEach(healthBar => healthBar.destroy());
        this.entityEffectOverlays.forEach(overlay => overlay.destroy());
        this.entityTexts.forEach(text => text.destroy());
        this.entityRadiusIndicators.forEach(indicator => indicator.destroy());
        this.entityRespawnRings.forEach(ring => ring.destroy());
        this.projectileGraphics.forEach(graphics => graphics.destroy());
        this.zoneGraphics.forEach(graphics => graphics.destroy());
        this.targetingReticleGraphics.forEach(graphics => graphics.destroy());
        
        // Clear active transient effects
        this.cleanupActiveExplosions();
        this.cleanupActiveXPTexts();
        this.cleanupActiveLevelUpTexts();
        
        // Clear targeting lines graphics
        if (this.targetingLinesGraphics) {
            this.targetingLinesGraphics.destroy();
            this.targetingLinesGraphics = null;
        }
        
        // Clear targeting reticle graphics
        this.targetingReticleGraphics.forEach(graphics => graphics.destroy());
        this.targetingReticleGraphics.clear();
        
        // Clear flashing targeting lines
        this.entityRenderer.clearFlashingTargetingLines();
        
        // Clear all collections
        this.entityGraphics.clear();
        this.entitySprites.clear();
        this.entityShadowSprites.clear();
        this.entityHealthBars.clear();
        this.entityEffectOverlays.clear();
        this.entityTexts.clear();
        this.entityRadiusIndicators.clear();
        this.entityRespawnRings.clear();
        this.projectileGraphics.clear();
        this.zoneGraphics.clear();
        this.targetingReticleGraphics.clear();
        this.processedXPEvents.clear();
        this.processedLevelUpEvents.clear();
        this.processedDeathEffectEvents.clear();
        this.recentAttackers.clear();
        this.lastProcessedTime = 0;
        
        // Force clear any remaining graphics by recreating the targeting lines graphics
        // This ensures a completely fresh state
        this.targetingLinesGraphics = this.scene.add.graphics();
        this.targetingLinesGraphics.setDepth(CLIENT_CONFIG.RENDER_DEPTH.TARGETING_LINES);
        
        // Assign to main camera
        if (this.cameraManager) {
            this.cameraManager.assignToMainCamera(this.targetingLinesGraphics);
        }
        
        // Targeting reticle graphics are managed dynamically and recreated as needed
        
        // Ensure all tweens are stopped for this scene
        this.scene.tweens.killAll();
    }
} 
