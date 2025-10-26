import Phaser from 'phaser';
import { Combatant, COMBATANT_TYPES, isHeroCombatant, HeroCombatant, MINION_TYPES, isMinionCombatant, CombatantId, ControllerId } from '../../shared/types/CombatantTypes';
import { SharedGameState } from '../../shared/types/GameStateTypes';
import { CLIENT_CONFIG } from '../../ClientConfig';
import { RendererFactory } from './RendererFactory';
import { CombatantRenderer } from './CombatantRenderer';
import { getSpriteScale } from '../utils/SpriteScaleUtils';

/**
 * EntityRenderer handles all rendering logic for different entity types
 */
export class EntityRenderer {
    private scene: Phaser.Scene;
    private playerSessionId: ControllerId | null = null;
    private flashingTargetingLines: Set<string> = new Set(); // Track which targeting lines are flashing
    private combatantRenderer: CombatantRenderer;
    private respawnIndicatorSprites: Map<CombatantId, Phaser.GameObjects.Sprite> = new Map();

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.combatantRenderer = RendererFactory.createRenderer(scene, CLIENT_CONFIG.RENDERER.TYPE);
    }

    setPlayerSessionId(sessionId: ControllerId | null): void {
        this.playerSessionId = sessionId;
    }

    /**
     * Triggers a flash animation on a targeting line when an attack fires
     */
    triggerTargetingLineFlash(sourceId: CombatantId, targetId: CombatantId): void {
        const targetingLineKey = `${sourceId}-${targetId}`;
        this.flashingTargetingLines.add(targetingLineKey);
        
        // Remove the flash after the duration
        setTimeout(() => {
            this.flashingTargetingLines.delete(targetingLineKey);
        }, CLIENT_CONFIG.TARGETING_LINES.FLASH_DURATION_MS);
    }

    /**
     * Clears all flashing targeting lines (called when scene is destroyed)
     */
    clearFlashingTargetingLines(): void {
        this.flashingTargetingLines.clear();
    }

    /**
     * Cleans up respawn indicator sprites (called when scene is destroyed)
     */
    destroy(): void {
        this.respawnIndicatorSprites.forEach(sprite => sprite.destroy());
        this.respawnIndicatorSprites.clear();
    }

    /**
     * Renders an entity based on its type and state
     */
    renderEntity(
        combatant: Combatant,
        graphics: Phaser.GameObjects.Graphics | Phaser.GameObjects.Sprite,
        text: Phaser.GameObjects.Text,
        radiusIndicator: Phaser.GameObjects.Graphics,
        respawnRing: Phaser.GameObjects.Graphics | undefined,
        healthBar: Phaser.GameObjects.Graphics | undefined,
        effectOverlay?: Phaser.GameObjects.Graphics,
        state?: SharedGameState,
        playerSessionId?: ControllerId | null,
        isRecentAttacker?: boolean,
        isTargetingPlayer?: boolean
    ): void {
        // Render the main entity graphics or sprite
        this.renderEntityGraphics(combatant, graphics);
        
        // Apply effects to the entity (graphics directly, sprites via overlay)
        if (graphics instanceof Phaser.GameObjects.Graphics) {
            this.applyEffectsToEntity(combatant, graphics, false);
        } else if (graphics instanceof Phaser.GameObjects.Sprite && effectOverlay) {
            this.applyEffectsToEntity(combatant, effectOverlay, true);
        }
        
        // Render respawn ring for heroes
        if (respawnRing && combatant.type === COMBATANT_TYPES.HERO && isHeroCombatant(combatant)) {
            this.renderRespawnRing(combatant, respawnRing, state);
        }
        
        
        // Render health bar for heroes and structures (but not for respawning heroes)
        if (healthBar && (combatant.type === COMBATANT_TYPES.HERO || combatant.type === COMBATANT_TYPES.CRADLE || combatant.type === COMBATANT_TYPES.TURRET)) {
            // Don't show health bars for respawning heroes
            if (combatant.type === COMBATANT_TYPES.HERO && isHeroCombatant(combatant) && combatant.state === 'respawning') {
                healthBar.clear();
            } else {
                this.renderHealthBar(combatant, healthBar);
            }
        }
        
        // Render radius indicator
        this.renderRadiusIndicator(combatant, radiusIndicator, isRecentAttacker, isTargetingPlayer);
        
        // Update text display (level for heroes, nothing for others)
        this.updateTextDisplay(combatant, text);
        
        
        // Handle turret visibility
        if (combatant.type === COMBATANT_TYPES.TURRET) {
            this.handleTurretVisibility(combatant, text, radiusIndicator);
        }
        
        // Handle respawn indicator for heroes
        this.renderRespawnIndicator(combatant, state);
    }

    /**
     * Applies visual effects to an entity based on its active effects
     */
    private applyEffectsToEntity(combatant: Combatant, graphics: Phaser.GameObjects.Graphics, isOverlay: boolean = false): void {
        // Only clear if this is an overlay (for hero sprites), not the main entity graphics
        if (isOverlay) {
            graphics.clear();
        }

        // Check for nocollision effect
        const hasNoCollision = combatant.effects.some(effect => effect.type === 'nocollision');
        if (hasNoCollision) {
            graphics.setAlpha(0.5);
        } else {
            graphics.setAlpha(1);
        }

        // Check for stun effect - add pulsing yellowish border and stun icon
        const isStunned = combatant.effects.some(effect => effect.type === 'stun');
        if (isStunned) {
            // Add pulsing yellowish grey border for stun effect
            const pulseIntensity = Math.sin(Date.now() * 0.01) * 0.5 + 0.5; // Pulsing between 0.5 and 1.0
            const borderThickness = 3 + (pulseIntensity * 3); // Pulsing between 4px and 10px
            graphics.lineStyle(borderThickness, 0xCCCC66); // Slightly brighter yellowish border
            graphics.strokeCircle(0, 0, combatant.size + 4); // Slightly larger than entity
            
            // Add stun icon above the hero
            graphics.setAlpha(1); // Semi-opaque but visible
            graphics.lineStyle(6, 0xCCCC66); // Slightly brighter yellowish lines for icon

            
            // Draw a simple lightning bolt shape for stun icon
            const iconSize = 16;
            const iconY = -combatant.size - 30; // Position above the hero
            graphics.moveTo(0, iconY - iconSize);
            graphics.lineTo(-iconSize/2, iconY);
            graphics.lineTo(0, iconY);
            graphics.lineTo(-iconSize/2, iconY + iconSize);
            
            graphics.strokePath();
        }

        // Check for reflect effect - add pulsing spiky border effect
        const hasReflect = combatant.effects.some(effect => effect.type === 'reflect');
        if (hasReflect) {
            graphics.lineStyle(6, 0xFFD700); // Gold/yellow for reflect, thicker line
            
            // Draw spiky border right on the entity's edge
            const numSpikes = 12;
            const entityRadius = combatant.size + 1;
            
            for (let i = 0; i < numSpikes; i++) {
                const angle = (i / numSpikes) * Math.PI * 2;
                const spikeAngle = angle + (Math.PI / numSpikes); // Offset to center spikes between points
                
                // Draw each spike as a small line segment on the entity's edge
                const startAngle = spikeAngle - 0.15;
                const endAngle = spikeAngle + 0.15;
                
                graphics.beginPath();
                graphics.arc(0, 0, entityRadius, startAngle, endAngle);
                graphics.strokePath();
            }
        }

        // Check for taunt effect - add taunt icon above the entity
        const isTaunted = combatant.effects.some(effect => effect.type === 'taunt');
        if (isTaunted) {
            // Add taunt icon above the entity
            graphics.lineStyle(2, 0xFFD700); // Gold/yellow lines for icon with reduced thickness
            
            // Draw a simple target/eye shape for taunt icon
            const iconSize = 16; // Slightly smaller icon
            const iconY = -combatant.size - 30; // Position above the entity
            
            // Draw outer circle
            graphics.strokeCircle(0, iconY, iconSize);
            
            // Draw inner target dot
            graphics.fillStyle(0xFFD700, 0.8);
            graphics.fillCircle(0, iconY, iconSize * 0.5);
            graphics.fillStyle(0xFFFFFF, 1);
            graphics.fillCircle(0, iconY, iconSize * 0.3);
            
            // Reset fill style
            graphics.fillStyle(0x000000, 0);
        }

        // Check for passive healing effect - add pulsing green border and healing icon
        const hasPassiveHealing = combatant.effects.some(effect => effect.type === 'passive_healing');
        if (hasPassiveHealing) {
            const spriteScale = getSpriteScale(combatant);
            
            // Add pulsing green border for passive healing effect (matching stun style)
            const pulseIntensity = Math.sin(Date.now() * 0.006) * 0.3 + 0.7; // Pulsing between 0.4 and 1.0 (slower, ~1 per second)
            const borderThickness = 4 + (pulseIntensity * 3);
            
            // Draw border matching stun style
            graphics.lineStyle(borderThickness, 0x228B22, 0.4); // Darker green border with transparency
            graphics.strokeCircle(0, 0, (combatant.size + 4) * spriteScale); // Scale with sprite
            
            // Add healing icon above the entity (matching stun icon style)
            graphics.lineStyle(6, 0x228B22); // Darker green lines for icon
            
            // Draw a simple cross/plus shape for healing icon
            const iconSize = 12 * spriteScale; // Scale icon
            const iconY = -(combatant.size + 30) * spriteScale; // Scale position
            
            // Draw horizontal line
            graphics.moveTo(-iconSize, iconY);
            graphics.lineTo(iconSize, iconY);
            
            // Draw vertical line
            graphics.moveTo(0, iconY - iconSize);
            graphics.lineTo(0, iconY + iconSize);
            
            graphics.strokePath();
        }

        // Check for rage mode effect - add pulsing red border and rage icon
        const isInRageMode = combatant.effects.some(effect => effect.type === 'hunter');
        if (isInRageMode) {
            const spriteScale = getSpriteScale(combatant);
            
            // Add pulsing red border for rage mode effect (matching stun style)
            const pulseIntensity = Math.sin(Date.now() * 0.008) * 0.4 + 0.6; // Pulsing between 0.2 and 1.0 (faster than stun)
            const borderThickness = 6 + (pulseIntensity * 4); // Pulsing between 6px and 14px
            
            // Draw border matching stun style but with red color
            graphics.lineStyle(borderThickness, 0xFF4444, 0.6); // Bright red border with more opacity
            graphics.strokeCircle(0, 0, (combatant.size + 4) * spriteScale); // Scale with sprite
            
            // Add rage icon above the entity (matching stun icon style)
            graphics.lineStyle(8, 0xFF4444); // Bright red lines for icon, thicker than other icons
            
            // Draw a simple flame/anger symbol for rage icon
            const iconSize = 16 * spriteScale; // Scale icon
            const iconY = -(combatant.size + 32) * spriteScale; // Scale position
            
            // Draw flame-like shape (zigzag pattern)
            graphics.moveTo(-iconSize, iconY + iconSize/2);
            graphics.lineTo(-iconSize/2, iconY);
            graphics.lineTo(0, iconY + iconSize/3);
            graphics.lineTo(iconSize/2, iconY);
            graphics.lineTo(iconSize, iconY + iconSize/2);
            
            graphics.strokePath();
        }

        // Check for burning effect - add pulsing orange border and flame icon
        const isBurning = combatant.effects.some(effect => effect.type === 'burning');
        if (isBurning) {
            const spriteScale = getSpriteScale(combatant);
            
            // Add pulsing orange border for burning effect
            const pulseIntensity = Math.sin(Date.now() * 0.012) * 0.4 + 0.6; // Pulsing between 0.2 and 1.0 (fast flickering)
            const borderThickness = 3 + (pulseIntensity * 1.5); // Pulsing between 3px and 6px
            
            // Draw border with orange-red flame color
            graphics.lineStyle(borderThickness, 0xFF6600, 0.5); // Orange-red border with more transparency
            graphics.strokeCircle(0, 0, (combatant.size + 4) * spriteScale); // Scale with sprite
            
            // Add flame icon above the entity
            graphics.lineStyle(3, 0xFF6600); // Orange-red lines for icon (thinner)
            
            // Draw a flame shape for burning icon
            const iconSize = 8 * spriteScale; // Scale icon (smaller)
            const iconY = -(combatant.size + 30) * spriteScale; // Scale position
            
            // Draw flame outline (zigzag upward pattern)
            graphics.beginPath();
            graphics.moveTo(0, iconY + iconSize); // Bottom center
            graphics.lineTo(-iconSize * 0.5, iconY + iconSize * 0.3); // Left middle
            graphics.lineTo(-iconSize * 0.3, iconY - iconSize * 0.3); // Left upper
            graphics.lineTo(0, iconY - iconSize); // Top point
            graphics.lineTo(iconSize * 0.3, iconY - iconSize * 0.3); // Right upper
            graphics.lineTo(iconSize * 0.5, iconY + iconSize * 0.3); // Right middle
            graphics.closePath();
            
            // Fill the flame to remove gap
            graphics.fillStyle(0xFF6600, 0.6); // Orange fill with some transparency
            graphics.fillPath();
            graphics.strokePath();
        }


    }

    /**
     * Renders respawn indicator for respawning heroes
     */
    private renderRespawnIndicator(combatant: Combatant, state?: SharedGameState): void {
        if (combatant.type === COMBATANT_TYPES.HERO && isHeroCombatant(combatant) && combatant.state === 'respawning' && state) {
            let respawnIndicatorSprite = this.respawnIndicatorSprites.get(combatant.id);
            
            // Create respawn indicator sprite if it doesn't exist
            if (!respawnIndicatorSprite) {
                respawnIndicatorSprite = this.scene.add.sprite(combatant.x, combatant.y, 'respawn-indicator');
                respawnIndicatorSprite.setDepth(CLIENT_CONFIG.RENDER_DEPTH.HEROES + 2); // Above hero sprites
                respawnIndicatorSprite.setOrigin(0.5, 0.5);
                respawnIndicatorSprite.setAlpha(0); // Start invisible for fade-in
                
                this.respawnIndicatorSprites.set(combatant.id, respawnIndicatorSprite);
                
                // Start fade-in animation
                this.scene.tweens.add({
                    targets: respawnIndicatorSprite,
                    alpha: 1,
                    duration: 2000, // 2 second fade-in
                    ease: 'Power2'
                });
            }
            
            // Update respawn indicator sprite position to follow the hero
            respawnIndicatorSprite.setPosition(combatant.x, combatant.y);
            respawnIndicatorSprite.setVisible(true);
            
            // Scale the respawn indicator to be appropriately sized relative to the hero
            const texture = respawnIndicatorSprite.texture;
            const textureWidth = texture.source[0].width;
            const textureHeight = texture.source[0].height;
            const maxDimension = Math.max(textureWidth, textureHeight);
            const baseScale = (combatant.size * 2) / maxDimension; // size is radius, so *2 for diameter
            
            // Apply additional sprite scale using utility function
            const additionalScale = getSpriteScale(combatant);
            respawnIndicatorSprite.setScale(baseScale * additionalScale);
        } else {
            // Hide respawn indicator sprite when not respawning
            const respawnIndicatorSprite = this.respawnIndicatorSprites.get(combatant.id);
            if (respawnIndicatorSprite) {
                respawnIndicatorSprite.setVisible(false);
            }
        }
    }

    /**
     * Renders targeting lines between combatants and their targets
     */
    renderTargetingLines(
        combatants: Map<CombatantId, Combatant>,
        graphics: Phaser.GameObjects.Graphics,
        gameTime?: number
    ): void {
        graphics.clear();
        
        combatants.forEach((combatant, id) => {
            if (combatant.health <= 0) return;
            if (combatant.type === COMBATANT_TYPES.HERO && isHeroCombatant(combatant) && combatant.state === 'respawning') return;
            
            if (combatant.target) {
                const target = combatants.get(combatant.target);
                if (target && target.health > 0) {
                    // Check if this is a turret or cradle
                    const isTurretOrCradle = combatant.type === COMBATANT_TYPES.TURRET || combatant.type === COMBATANT_TYPES.CRADLE;
                    
                    // Check if player's hero is the one attacking (not being attacked)
                    const isPlayerAttacking = this.playerSessionId && 
                        combatant.type === COMBATANT_TYPES.HERO && 
                        isHeroCombatant(combatant) && 
                        combatant.controller === this.playerSessionId;
                    
                    // Check if player's hero is involved in this targeting line (either attacking or being attacked)
                    const isPlayerInvolved = this.playerSessionId && (
                        isPlayerAttacking ||
                        (target.type === COMBATANT_TYPES.HERO && isHeroCombatant(target) && target.controller === this.playerSessionId)
                    );
                    
                    // Check if this targeting line should flash
                    const targetingLineKey = `${combatant.id}-${target.id}`;
                    const isFlashing = this.flashingTargetingLines.has(targetingLineKey);
                    
                    // Determine line color - white flash only for player attacks, team colors for others
                    let lineColor: number;
                    if (isFlashing && isPlayerAttacking) {
                        lineColor = 0xffffff; // White flash only for player attacks
                    } else if (isPlayerAttacking) {
                        lineColor = CLIENT_CONFIG.TARGETING_LINES.PLAYER; // Purple when player attacking (not flashing)
                    } else {
                        lineColor = combatant.team === 'blue' ? CLIENT_CONFIG.TARGETING_LINES.BLUE : CLIENT_CONFIG.TARGETING_LINES.RED; // Team colors (including when flashing)
                    }
                    
                    // Calculate alpha - turrets/cradles have higher alpha for better visibility
                    let alpha: number;
                    if (isTurretOrCradle) {
                        alpha = isPlayerInvolved ? CLIENT_CONFIG.TARGETING_LINES.PLAYER_BASE_ALPHA + 0.15 : CLIENT_CONFIG.TARGETING_LINES.BASE_ALPHA + 0.2;
                    } else {
                        alpha = isPlayerInvolved ? CLIENT_CONFIG.TARGETING_LINES.PLAYER_BASE_ALPHA : CLIENT_CONFIG.TARGETING_LINES.BASE_ALPHA;
                    }
                    
                    if (isFlashing) {
                        alpha = CLIENT_CONFIG.TARGETING_LINES.FLASH_ALPHA;
                    }
                    
                    // Calculate offset for line endpoints to prevent overlap
                    const offset = CLIENT_CONFIG.TARGETING_LINES.OFFSET_PIXELS;
                    let sourceX = combatant.x;
                    let sourceY = combatant.y;
                    let targetX = target.x;
                    let targetY = target.y;
                    
                    if (combatant.team === 'blue') {
                        sourceX += offset;
                        targetX += offset;
                    } else {
                        sourceX -= offset;
                        targetX -= offset;
                    }
                    
                    // Turrets use dashed lines for better distinction
                    if (isTurretOrCradle) {
                        // Draw as a dashed line for turrets/cradles
                        let dashLength = 10;
                        let gapLength = 5;
                        
                        // Make flash more distinct with longer dashes and shorter gaps
                        if (isFlashing) {
                            dashLength = 15;
                            gapLength = 3;
                        }
                        
                        const dx = targetX - sourceX;
                        const dy = targetY - sourceY;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        const dashCount = Math.floor(distance / (dashLength + gapLength));
                        
                        const baseLineThickness = isFlashing ? CLIENT_CONFIG.TARGETING_LINES.FLASH_LINE_THICKNESS : CLIENT_CONFIG.TARGETING_LINES.LINE_THICKNESS;
                        
                        // Draw a thicker, more prominent line for turrets
                        // Flash lines are EXTRA thick to make them very distinct
                        const turretLineThickness = baseLineThickness + (isFlashing ? 4 : 2);
                        graphics.lineStyle(turretLineThickness, lineColor, alpha);
                        
                        for (let i = 0; i < dashCount; i++) {
                            const startPercent = i * (dashLength + gapLength) / distance;
                            const endPercent = (i * (dashLength + gapLength) + dashLength) / distance;
                            
                            const startX = sourceX + dx * startPercent;
                            const startY = sourceY + dy * startPercent;
                            const endX = sourceX + dx * Math.min(endPercent, 1);
                            const endY = sourceY + dy * Math.min(endPercent, 1);
                            
                            graphics.beginPath();
                            graphics.moveTo(startX, startY);
                            graphics.lineTo(endX, endY);
                            graphics.strokePath();
                        }
                    } else {
                        // Regular solid line for heroes and minions
                        const lineThickness = isFlashing ? CLIENT_CONFIG.TARGETING_LINES.FLASH_LINE_THICKNESS : CLIENT_CONFIG.TARGETING_LINES.LINE_THICKNESS;
                        graphics.lineStyle(lineThickness, lineColor, alpha);
                        graphics.beginPath();
                        graphics.moveTo(sourceX, sourceY);
                        graphics.lineTo(targetX, targetY);
                        graphics.strokePath();
                    }
                }
            }
        });
    }

    /**
     * Renders a targeting reticle using relative coordinates (graphics object is at the entity position)
     */
    renderTargetingReticleRelative(entitySize: number, graphics: Phaser.GameObjects.Graphics): void {
        graphics.clear();
        
        // Draw a white targeting reticle centered at (0,0) since graphics is positioned at entity
        const reticleSize = entitySize + CLIENT_CONFIG.TARGETING_RETICLE.SIZE_OFFSET;
        const config = CLIENT_CONFIG.TARGETING_RETICLE;
        const halfSize = reticleSize / 2;
        
        graphics.lineStyle(config.THICKNESS, config.COLOR, config.ALPHA);
        graphics.beginPath();
        
        // Top-left corner
        graphics.moveTo(-halfSize, -halfSize);
        graphics.lineTo(-halfSize + config.CORNER_LENGTH, -halfSize);
        graphics.moveTo(-halfSize, -halfSize);
        graphics.lineTo(-halfSize, -halfSize + config.CORNER_LENGTH);
        
        // Top-right corner
        graphics.moveTo(halfSize, -halfSize);
        graphics.lineTo(halfSize - config.CORNER_LENGTH, -halfSize);
        graphics.moveTo(halfSize, -halfSize);
        graphics.lineTo(halfSize, -halfSize + config.CORNER_LENGTH);
        
        // Bottom-left corner
        graphics.moveTo(-halfSize, halfSize);
        graphics.lineTo(-halfSize + config.CORNER_LENGTH, halfSize);
        graphics.moveTo(-halfSize, halfSize);
        graphics.lineTo(-halfSize, halfSize - config.CORNER_LENGTH);
        
        // Bottom-right corner
        graphics.moveTo(halfSize, halfSize);
        graphics.lineTo(halfSize - config.CORNER_LENGTH, halfSize);
        graphics.moveTo(halfSize, halfSize);
        graphics.lineTo(halfSize, halfSize - config.CORNER_LENGTH);
        
        graphics.strokePath();
    }

    /**
     * Renders the main graphics for an entity based on its type
     */
    private renderEntityGraphics(combatant: Combatant, graphics: Phaser.GameObjects.Graphics | Phaser.GameObjects.Sprite): void {
        // For sprites, scale them to the appropriate size
        if (graphics instanceof Phaser.GameObjects.Sprite) {
            this.scaleSprite(graphics, combatant);
            return;
        }
        
        graphics.clear();
        
        // Calculate health percentage
        const healthPercentage = combatant.health / combatant.maxHealth;
        
        // Determine colors based on team, state, and player control
        let primaryColor, respawnColor;
        
        // Check if this hero is controlled by the current player
        const isControlledByPlayer = combatant.type === COMBATANT_TYPES.HERO && 
                                   isHeroCombatant(combatant) && 
                                   this.playerSessionId && 
                                   combatant.controller === this.playerSessionId;
        
        if (isControlledByPlayer) {
            // Use purple palette for player-controlled heroes
            if (combatant.state === 'respawning') {
                primaryColor = CLIENT_CONFIG.SELF_COLORS.RESPAWNING;
                respawnColor = primaryColor;
            } else {
                primaryColor = CLIENT_CONFIG.SELF_COLORS.PRIMARY;
                respawnColor = CLIENT_CONFIG.SELF_COLORS.RESPAWNING;
            }
        } else {
            // Use team colors for other heroes/entities
            if (combatant.type === COMBATANT_TYPES.HERO && isHeroCombatant(combatant) && combatant.state === 'respawning') {
                primaryColor = combatant.team === 'blue' ? CLIENT_CONFIG.TEAM_COLORS.BLUE_RESPAWNING : CLIENT_CONFIG.TEAM_COLORS.RED_RESPAWNING;
                respawnColor = primaryColor; // Use same color when respawning
            } else {
                primaryColor = combatant.team === 'blue' ? CLIENT_CONFIG.TEAM_COLORS.BLUE : CLIENT_CONFIG.TEAM_COLORS.RED;
                respawnColor = combatant.team === 'blue' ? CLIENT_CONFIG.TEAM_COLORS.BLUE_RESPAWNING : CLIENT_CONFIG.TEAM_COLORS.RED_RESPAWNING;
            }
        }
        
        // Use the configured combatant renderer
        this.combatantRenderer.renderCombatant(combatant, graphics, primaryColor, respawnColor, healthPercentage, combatant.size);
    }

    /**
     * Scales a sprite to the appropriate size
     */
    private scaleSprite(sprite: Phaser.GameObjects.Sprite, combatant: Combatant): void {
        // Get the texture dimensions
        const texture = sprite.texture;
        const textureWidth = texture.source[0].width;
        const textureHeight = texture.source[0].height;
        
        // Calculate base scale to fit the target size (diameter)
        const maxDimension = Math.max(textureWidth, textureHeight);
        const baseScale = (combatant.size * 2) / maxDimension; // size is radius, so *2 for diameter
        
        // Apply additional sprite scale using utility function
        const additionalScale = getSpriteScale(combatant);
        
        sprite.setScale(baseScale * additionalScale);
    }

    /**
     * Renders health bar for heroes
     */
    private renderHealthBar(combatant: Combatant, healthBar: Phaser.GameObjects.Graphics): void {
        healthBar.clear();
        
        // Calculate health percentage
        const healthPercentage = combatant.health / combatant.maxHealth;
        
        // Determine colors based on team, state, and player control
        let primaryColor, respawnColor;
        
        // Check if this hero is controlled by the current player
        const isControlledByPlayer = combatant.type === COMBATANT_TYPES.HERO && 
                                   isHeroCombatant(combatant) && 
                                   this.playerSessionId && 
                                   combatant.controller === this.playerSessionId;
        
        if (isControlledByPlayer) {
            // Use purple palette for player-controlled heroes
            if (combatant.state === 'respawning') {
                primaryColor = CLIENT_CONFIG.SELF_COLORS.RESPAWNING;
                respawnColor = primaryColor;
            } else {
                primaryColor = CLIENT_CONFIG.SELF_COLORS.PRIMARY;
                respawnColor = CLIENT_CONFIG.SELF_COLORS.RESPAWNING;
            }
        } else {
            // Use team colors for other heroes
            if (combatant.type === COMBATANT_TYPES.HERO && isHeroCombatant(combatant) && combatant.state === 'respawning') {
                primaryColor = combatant.team === 'blue' ? CLIENT_CONFIG.TEAM_COLORS.BLUE_RESPAWNING : CLIENT_CONFIG.TEAM_COLORS.RED_RESPAWNING;
                respawnColor = primaryColor;
            } else {
                primaryColor = combatant.team === 'blue' ? CLIENT_CONFIG.TEAM_COLORS.BLUE : CLIENT_CONFIG.TEAM_COLORS.RED;
                respawnColor = combatant.team === 'blue' ? CLIENT_CONFIG.TEAM_COLORS.BLUE_RESPAWNING : CLIENT_CONFIG.TEAM_COLORS.RED_RESPAWNING;
            }
        }
        
        // Health bar dimensions
        const heroSize = combatant.size;
        const barWidth = heroSize * 1.5; // Slightly wider than the hero
        const barHeight = 8; // Thin bar
        const barY = heroSize + 16; // Position below the hero
        
        // Draw background bar (total health) - use darker contrasting color
        const backgroundColor = combatant.team === 'blue' ? 0x1a4a6b : respawnColor; // Dark blue for blue team, respawn color for red
        const backgroundAlpha = combatant.team === 'blue' ? 0.8 : 0.6;
        healthBar.fillStyle(backgroundColor, backgroundAlpha);
        healthBar.fillRect(-barWidth / 2, barY, barWidth, barHeight);
        
        // Draw current health bar - darker color
        const currentHealthWidth = barWidth * healthPercentage;
        healthBar.fillStyle(primaryColor, 1);
        healthBar.fillRect(-barWidth / 2, barY, currentHealthWidth, barHeight);
        
        // Add border to health bar
        healthBar.lineStyle(1, 0x000000, 0.8);
        healthBar.strokeRect(-barWidth / 2, barY, barWidth, barHeight);
    }

    /**
     * Renders projectile graphics
     */
    renderProjectile(projectile: any, graphics: Phaser.GameObjects.Graphics, state?: any): void {
        graphics.clear();
        
        // Check if projectile is owned by current player's controlled hero
        let isOwnerControlledByPlayer = false;
        if (state && this.playerSessionId && projectile.ownerId) {
            const owner = state.combatants.get(projectile.ownerId);
            if (owner && owner.type === COMBATANT_TYPES.HERO && owner.controller === this.playerSessionId) {
                isOwnerControlledByPlayer = true;
            }
        }
        
        // Use purple for player-controlled hero projectiles, otherwise team colors
        const projectileColor = isOwnerControlledByPlayer
            ? CLIENT_CONFIG.SELF_COLORS.PROJECTILE
            : (projectile.team === 'blue' 
                ? CLIENT_CONFIG.PROJECTILE.BLUE_COLOR 
                : CLIENT_CONFIG.PROJECTILE.RED_COLOR);
        
        const radius = CLIENT_CONFIG.PROJECTILE.RADIUS;
        
        // Use the configured combatant renderer for projectiles
        this.combatantRenderer.renderProjectile(projectile, graphics, projectileColor, radius, state);
    }

    /**
     * Renders the respawn ring for heroes only
     */
    private renderRespawnRing(hero: HeroCombatant, respawnRing: Phaser.GameObjects.Graphics, state?: SharedGameState): void {
        respawnRing.clear();
        if (hero.state === 'respawning' && state) {
            const respawnDuration = hero.respawnDuration;
            const timeElapsed = respawnDuration - (hero.respawnTime - state.gameTime);
            const respawnProgress = Math.max(0, Math.min(1, timeElapsed / respawnDuration));
            
            // Check if this hero is controlled by the current player
            const isControlledByPlayer = this.playerSessionId && hero.controller === this.playerSessionId;
            const ringColor = isControlledByPlayer 
                ? CLIENT_CONFIG.SELF_COLORS.PRIMARY
                : (hero.team === 'blue' ? CLIENT_CONFIG.TEAM_COLORS.BLUE : CLIENT_CONFIG.TEAM_COLORS.RED);
            
            // Scale radius based on sprite scale
            const spriteScale = getSpriteScale(hero);
            const scaledRadius = CLIENT_CONFIG.RESPAWN_RING.RADIUS * spriteScale;
            
            respawnRing.lineStyle(CLIENT_CONFIG.RESPAWN_RING.THICKNESS, ringColor, CLIENT_CONFIG.RESPAWN_RING.ALPHA);
            respawnRing.beginPath();
            respawnRing.arc(0, 0, scaledRadius, -Math.PI/2, -Math.PI/2 + (2 * Math.PI * respawnProgress));
            respawnRing.strokePath();
        }
    }


    /**
     * Renders the radius indicator for attack ranges
     */
    private renderRadiusIndicator(combatant: Combatant, radiusIndicator: Phaser.GameObjects.Graphics, isRecentAttacker?: boolean, isTargetingPlayer?: boolean): void {
        radiusIndicator.clear();
        
        const isStructure = combatant.type === COMBATANT_TYPES.CRADLE || combatant.type === COMBATANT_TYPES.TURRET;
        
        // Determine if we should show radius indicator
        let shouldShowRadius = false;
        
        if (combatant.health > 0) {
            if (isStructure) {
                // For structures: only show if they're recent attackers (red) OR targeting the player (yellow)
                shouldShowRadius = (isRecentAttacker ?? false) || (isTargetingPlayer ?? false);
            } else {
                // For non-structures: show if player's hero (if not respawning) OR recent attacker OR targeting player
                shouldShowRadius = (
                    (combatant.type === COMBATANT_TYPES.HERO && 
                     isHeroCombatant(combatant) && 
                     combatant.state !== 'respawning' &&
                     combatant.controller === this.playerSessionId) ||
                    (isRecentAttacker ?? false) ||
                    (isTargetingPlayer ?? false)
                );
            }
        }
        
        if (shouldShowRadius) {
            // Determine color and alpha
            let color: number;
            if (isRecentAttacker) {
                // Red color for recent attackers (structures or heroes)
                color = 0xff0000;
            } else if (isTargetingPlayer) {
                // Yellow color for enemies targeting the player
                color = 0xffff00;
            } else {
                // Default black color with lower alpha (for player's hero)
                color = CLIENT_CONFIG.RADIUS_INDICATOR.LINE_COLOR;
            }
            
            const alpha = isRecentAttacker ? 0.3 : (isTargetingPlayer ? 0.3 : 0.2);
            
            // All auto-attack ranges use dashed style
            // Structures get thicker lines, heroes/minions get standard thickness
            const lineThickness = isStructure ? CLIENT_CONFIG.RADIUS_INDICATOR.LINE_THICKNESS + 2 : CLIENT_CONFIG.RADIUS_INDICATOR.LINE_THICKNESS;
            this.drawDashedCircle(radiusIndicator, 0, 0, combatant.attackRadius, color, alpha, lineThickness);
        }
    }
    
    /**
     * Draws a dashed circle by drawing multiple arc segments
     */
    private drawDashedCircle(graphics: Phaser.GameObjects.Graphics, x: number, y: number, radius: number, color: number, alpha: number, thickness: number): void {
        const dashAngle = 0.15; // angle of each dash in radians
        const gapAngle = 0.1; // angle of each gap in radians
        const angleStep = dashAngle + gapAngle;
        
        graphics.lineStyle(thickness, color, alpha);
        
        let currentAngle = 0;
        while (currentAngle < Math.PI * 2) {
            const endAngle = Math.min(currentAngle + dashAngle, Math.PI * 2);
            graphics.beginPath();
            graphics.arc(x, y, radius, currentAngle, endAngle);
            graphics.strokePath();
            currentAngle += angleStep;
        }
    }

    /**
     * Updates the text display (level for heroes, nothing for others)
     */
    private updateTextDisplay(combatant: Combatant, text: Phaser.GameObjects.Text): void {
        if (combatant.type === COMBATANT_TYPES.HERO && isHeroCombatant(combatant)) {
            // Check if this hero is controlled by the current player
            const isControlledByPlayer = this.playerSessionId && combatant.controller === this.playerSessionId;
            
            // Don't show level for the currently controlled hero (it's shown in HUD)
            if (isControlledByPlayer) {
                text.setText(''); // Clear text for player-controlled hero
                return;
            }
            
            const level = combatant.level;
            const romanNumeral = this.toRomanNumeral(level);
            text.setText(romanNumeral);
            
            // Set color based on team
            const textColor = combatant.team === 'blue' ? 0x1a4a6b : 0x8b1a1a; // Team colors
            
            text.setStyle({ 
                fontSize: '24px', 
                fontWeight: '900',
                color: `#${textColor.toString(16).padStart(6, '0')}`,
                stroke: '#000000',
                strokeThickness: 1,
                shadow: {
                    offsetX: 1,
                    offsetY: 1,
                    color: '#000000',
                    blur: 2,
                    fill: true
                },
                align: 'center'
            });
            
            // Position the text for level display
            text.setOrigin(0.5, 0.1);
        } else {
            text.setText(''); // Clear text for non-heroes
        }
    }


    /**
     * Converts a number to Roman numeral
     */
    private toRomanNumeral(num: number): string {
        const romanNumerals = [
            { value: 50, numeral: 'L' },
            { value: 40, numeral: 'XL' },
            { value: 10, numeral: 'X' },
            { value: 9, numeral: 'IX' },
            { value: 5, numeral: 'V' },
            { value: 4, numeral: 'IV' },
            { value: 1, numeral: 'I' }
        ];
        
        let result = '';
        let remaining = num;
        
        for (const { value, numeral } of romanNumerals) {
            while (remaining >= value) {
                result += numeral;
                remaining -= value;
            }
        }
        
        return result;
    }

    /**
     * Handles visibility for turret text and radius indicator
     */
    private handleTurretVisibility(combatant: Combatant, text: Phaser.GameObjects.Text, radiusIndicator: Phaser.GameObjects.Graphics): void {
        text.setVisible(combatant.health > 0);
        radiusIndicator.setVisible(combatant.health > 0);
    }
}
