import Phaser from 'phaser';
import { Combatant, COMBATANT_TYPES, isHeroCombatant, isMinionCombatant, HeroCombatant, MinionCombatant, CombatantId, ControllerId, ProjectileId } from '../../shared/types/CombatantTypes';
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
    private entityHealthBars: Map<CombatantId, Phaser.GameObjects.Graphics> = new Map();
    private entityTexts: Map<CombatantId, Phaser.GameObjects.Text> = new Map();
    private entityEffectOverlays: Map<CombatantId, Phaser.GameObjects.Graphics> = new Map();
    private entityAbilityIconTexts: Map<CombatantId, Phaser.GameObjects.Text> = new Map();
    private entityRadiusIndicators: Map<CombatantId, Phaser.GameObjects.Graphics> = new Map();
    private entityRespawnRings: Map<CombatantId, Phaser.GameObjects.Graphics> = new Map();
    private entityAbilityReadyIndicators: Map<CombatantId, Phaser.GameObjects.Graphics> = new Map();
    private projectileGraphics: Map<ProjectileId, Phaser.GameObjects.Graphics> = new Map();
    private projectileLastPositions: Map<ProjectileId, { x: number, y: number, range?: number, startX?: number, startY?: number, team?: string }> = new Map();
    private zoneGraphics: Map<string, Phaser.GameObjects.Graphics> = new Map();
    private processedDeathEffectEvents: Set<string> = new Set(); // Track processed death effect events
    private targetingLinesGraphics: Phaser.GameObjects.Graphics | null = null;
    private processedXPEvents: Set<string> = new Set();
    private processedLevelUpEvents: Set<string> = new Set();
    private processedAOEDamageEvents: Set<string> = new Set();
    private lastProcessedTime: number = 0;
    
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
        
        // Update zones
        this.updateZoneEntities(state);
        
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
        let entityAbilityIconText = this.entityAbilityIconTexts.get(entityId);
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
        const targets = [];
        if (entityGraphics) targets.push(entityGraphics);
        if (entitySprite) targets.push(entitySprite);
        if (entityHealthBar) targets.push(entityHealthBar);
        targets.push(entityText, radiusIndicator);
        if (entityAbilityIconText) targets.push(entityAbilityIconText);
        if (respawnRing) targets.push(respawnRing);
        if (abilityReadyIndicator) targets.push(abilityReadyIndicator);
        if (entityEffectOverlay) targets.push(entityEffectOverlay);
        
        this.animateEntityMovement(
            entityId,
            targets as (Phaser.GameObjects.Graphics | Phaser.GameObjects.Text)[],
            combatantData.x,
            combatantData.y
        );
        
        // Render the entity
        this.entityRenderer.renderEntity(
            combatantData,
            (entitySprite || entityGraphics)!,
            entityText,
            radiusIndicator,
            respawnRing,
            abilityReadyIndicator,
            entityAbilityIconText,
            entityHealthBar,
            entityEffectOverlay,
            state,
            this.playerSessionId,
            this.isRecentAttacker(entityId)
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
            zoneColor = 0x4a90e2; // Blue
        } else if (zoneData.team === 'red') {
            zoneColor = 0xe24a4a; // Red
        }
        
        // Draw filled circle with border
        zoneGraphics.fillStyle(zoneColor, 0.2); // Low opacity fill
        zoneGraphics.lineStyle(2, zoneColor, 0.6); // Border with medium opacity
        zoneGraphics.fillCircle(0, 0, zoneData.radius);
        zoneGraphics.strokeCircle(0, 0, zoneData.radius);
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
                explosionRadius = 5; // Smaller starting size
                numRings = 1; // Minimal rings
                ringDuration = 400; // Shorter duration
                numParticles = 6; // More particles
                particleSize = 2; // Particles
                particleDistance = 15; // Shorter distance
                break;
            case 'turret':
            case 'cradle':
                explosionRadius = 20; // Smaller starting size
                numRings = 2; // Fewer rings
                ringDuration = 400; // Shorter duration
                numParticles = 20; // Many more particles
                particleSize = 3; // Larger particles
                particleDistance = 40; // Shorter distance
                break;
            case 'hero':
            default:
                explosionRadius = 7; // Smaller starting size
                numRings = 2; // Fewer rings
                ringDuration = 400; // Shorter duration
                numParticles = 12; // More particles
                particleSize = 2; // Particles
                particleDistance = 25; // Shorter distance
                break;
        }
        
        for (let i = 0; i < numRings; i++) {
            const ringGraphics = this.scene.add.graphics();
            ringGraphics.setPosition(deathEffectEvent.x, deathEffectEvent.y);
            ringGraphics.setDepth(CLIENT_CONFIG.RENDER_DEPTH.EFFECTS);
            
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
        this.entitySprites.forEach(sprite => sprite.destroy());
        this.entityHealthBars.forEach(healthBar => healthBar.destroy());
        this.entityEffectOverlays.forEach(overlay => overlay.destroy());
        this.entityTexts.forEach(text => text.destroy());
        this.entityAbilityIconTexts.forEach(text => text.destroy());
        this.entityRadiusIndicators.forEach(indicator => indicator.destroy());
        this.entityRespawnRings.forEach(ring => ring.destroy());
        this.entityAbilityReadyIndicators.forEach(indicator => indicator.destroy());
        this.projectileGraphics.forEach(graphics => graphics.destroy());
        this.zoneGraphics.forEach(graphics => graphics.destroy());
        
        if (this.targetingLinesGraphics) {
            this.targetingLinesGraphics.destroy();
            this.targetingLinesGraphics = null;
        }
        
        // Clear flashing targeting lines
        this.entityRenderer.clearFlashingTargetingLines();
        
        this.entityGraphics.clear();
        this.entitySprites.clear();
        this.entityHealthBars.clear();
        this.entityEffectOverlays.clear();
        this.entityTexts.clear();
        this.entityAbilityIconTexts.clear();
        this.entityRadiusIndicators.clear();
        this.entityRespawnRings.clear();
        this.entityAbilityReadyIndicators.clear();
        this.projectileGraphics.clear();
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
        this.entityHealthBars.forEach(healthBar => healthBar.destroy());
        this.entityEffectOverlays.forEach(overlay => overlay.destroy());
        this.entityTexts.forEach(text => text.destroy());
        this.entityAbilityIconTexts.forEach(text => text.destroy());
        this.entityRadiusIndicators.forEach(indicator => indicator.destroy());
        this.entityRespawnRings.forEach(ring => ring.destroy());
        this.entityAbilityReadyIndicators.forEach(indicator => indicator.destroy());
        this.projectileGraphics.forEach(graphics => graphics.destroy());
        this.zoneGraphics.forEach(graphics => graphics.destroy());
        
        // Clear targeting lines graphics
        if (this.targetingLinesGraphics) {
            this.targetingLinesGraphics.destroy();
            this.targetingLinesGraphics = null;
        }
        
        // Clear flashing targeting lines
        this.entityRenderer.clearFlashingTargetingLines();
        
        // Clear all collections
        this.entityGraphics.clear();
        this.entitySprites.clear();
        this.entityHealthBars.clear();
        this.entityEffectOverlays.clear();
        this.entityTexts.clear();
        this.entityAbilityIconTexts.clear();
        this.entityRadiusIndicators.clear();
        this.entityRespawnRings.clear();
        this.entityAbilityReadyIndicators.clear();
        this.projectileGraphics.clear();
        this.zoneGraphics.clear();
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
        
        // Ensure all tweens are stopped for this scene
        this.scene.tweens.killAll();
    }
} 
