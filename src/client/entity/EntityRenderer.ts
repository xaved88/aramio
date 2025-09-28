import Phaser from 'phaser';
import { Combatant, COMBATANT_TYPES, isHeroCombatant, HeroCombatant, MINION_TYPES, isMinionCombatant, CombatantId, ControllerId } from '../../shared/types/CombatantTypes';
import { SharedGameState } from '../../shared/types/GameStateTypes';
import { CLIENT_CONFIG } from '../../ClientConfig';
import { AbilityIconManager } from '../abilities/AbilityIconManager';

/**
 * EntityRenderer handles all rendering logic for different entity types
 */
export class EntityRenderer {
    private scene: Phaser.Scene;
    private playerSessionId: ControllerId | null = null;
    private flashingTargetingLines: Set<string> = new Set(); // Track which targeting lines are flashing

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
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
     * Renders an entity based on its type and state
     */
    renderEntity(
        combatant: Combatant,
        graphics: Phaser.GameObjects.Graphics,
        text: Phaser.GameObjects.Text,
        radiusIndicator: Phaser.GameObjects.Graphics,
        respawnRing: Phaser.GameObjects.Graphics | undefined,
        abilityReadyIndicator: Phaser.GameObjects.Graphics | undefined,
        abilityIconText: Phaser.GameObjects.Text | undefined,
        state?: SharedGameState,
        playerSessionId?: ControllerId | null,
        isRecentAttacker?: boolean
    ): void {
        // Render the main entity graphics
        this.renderEntityGraphics(combatant, graphics);
        
        // Apply effects to the entity
        this.applyEffectsToEntity(combatant, graphics);
        
        // Render respawn ring for heroes
        if (respawnRing && combatant.type === COMBATANT_TYPES.HERO && isHeroCombatant(combatant)) {
            this.renderRespawnRing(combatant, respawnRing, state);
        }
        
        // Render ability ready indicator only for the current player
        if (abilityReadyIndicator && combatant.type === COMBATANT_TYPES.HERO && isHeroCombatant(combatant)) {
            // Only show ability indicator for the current player
            if (playerSessionId && combatant.controller === playerSessionId) {
                this.renderAbilityReadyIndicator(combatant, abilityReadyIndicator, state);
            } else {
                // Clear the indicator if this hero is not controlled by the current player
                abilityReadyIndicator.clear();
            }
        }
        
        // Render radius indicator
        this.renderRadiusIndicator(combatant, radiusIndicator, isRecentAttacker);
        
        // Update text display (level for heroes, nothing for others)
        this.updateTextDisplay(combatant, text);
        
        // Update ability icon display for heroes
        if (abilityIconText && combatant.type === COMBATANT_TYPES.HERO && isHeroCombatant(combatant)) {
            this.updateAbilityIconDisplay(combatant, abilityIconText);
        }
        
        // Handle turret visibility
        if (combatant.type === COMBATANT_TYPES.TURRET) {
            this.handleTurretVisibility(combatant, text, radiusIndicator);
        }
    }

    /**
     * Applies visual effects to an entity based on its active effects
     */
    private applyEffectsToEntity(combatant: Combatant, graphics: Phaser.GameObjects.Graphics): void {

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
            const borderThickness = 2 + (pulseIntensity * 3); // Pulsing between 2px and 5px
            graphics.lineStyle(borderThickness, 0x999972); // Yellowish grey border
            graphics.strokeCircle(0, 0, combatant.size + 2); // Slightly larger than entity
            
            // Add stun icon above the hero
            graphics.lineStyle(3, 0x999972); // Yellowish lines for icon

            
            // Draw a simple lightning bolt shape for stun icon
            const iconSize = 8;
            const iconY = -combatant.size - 15; // Position above the hero
            graphics.moveTo(0, iconY - iconSize);
            graphics.lineTo(-iconSize/2, iconY);
            graphics.lineTo(0, iconY);
            graphics.lineTo(-iconSize/2, iconY + iconSize);
            
            graphics.strokePath();
        }

        // Check for reflect effect - add pulsing spiky border effect
        const hasReflect = combatant.effects.some(effect => effect.type === 'reflect');
        if (hasReflect) {            
            graphics.lineStyle(3, 0xFFD700); // Orange-red for danger, thicker line
            
            // Draw spiky border right on the entity's edge
            const numSpikes = 12;
            const entityRadius = combatant.size + 1;
            
            for (let i = 0; i < numSpikes; i++) {
                const angle = (i / numSpikes) * Math.PI * 2;
                const spikeAngle = angle + (Math.PI / numSpikes); // Offset to center spikes between points
                
                // Draw each spike as a small line segment on the entity's edge
                const startAngle = spikeAngle - 0.07;
                const endAngle = spikeAngle + 0.07;
                
                graphics.beginPath();
                graphics.arc(0, 0, entityRadius, startAngle, endAngle);
                graphics.strokePath();
            }
        }

        // Check for taunt effect - add taunt icon above the entity
        const isTaunted = combatant.effects.some(effect => effect.type === 'taunt');
        if (isTaunted) {
            // Add taunt icon above the entity
            graphics.lineStyle(1, 0xFFFF00); // Yellow lines for icon with reduced thickness
            
            // Draw a simple target/eye shape for taunt icon
            const iconSize = 8; // Slightly smaller icon
            const iconY = -combatant.size - 15; // Position above the entity
            
            // Draw outer circle
            graphics.strokeCircle(0, iconY, iconSize);
            
            // Draw inner target dot
            graphics.fillStyle(0xFFFF00, 0.8);
            graphics.fillCircle(0, iconY, iconSize * 0.5);
            graphics.fillStyle(0xFFFFFF, 1);
            graphics.fillCircle(0, iconY, iconSize * 0.3);
            
            // Reset fill style
            graphics.fillStyle(0x000000, 0);
        }

        // Check for passive healing effect - add pulsing green border and healing icon
        const hasPassiveHealing = combatant.effects.some(effect => effect.type === 'passive_healing');
        if (hasPassiveHealing) {
            // Add pulsing green border for passive healing effect (matching stun style)
            const pulseIntensity = Math.sin(Date.now() * 0.006) * 0.3 + 0.7; // Pulsing between 0.4 and 1.0 (slower, ~1 per second)
            const borderThickness = 2 + (pulseIntensity * 3); // Pulsing between 2px and 5px (matching stun)
            
            // Draw border matching stun style
            graphics.lineStyle(borderThickness, 0x228B22, 0.4); // Darker green border with transparency
            graphics.strokeCircle(0, 0, combatant.size + 2); // Same positioning as stun
            
            // Add healing icon above the entity (matching stun icon style)
            graphics.lineStyle(3, 0x228B22); // Darker green lines for icon
            
            // Draw a simple cross/plus shape for healing icon
            const iconSize = 6; // Slightly smaller icon
            const iconY = -combatant.size - 15;
            
            // Draw horizontal line
            graphics.moveTo(-iconSize, iconY);
            graphics.lineTo(iconSize, iconY);
            
            // Draw vertical line
            graphics.moveTo(0, iconY - iconSize);
            graphics.lineTo(0, iconY + iconSize);
            
            graphics.strokePath();
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
                    // Determine line color based on team
                    const lineColor = combatant.team === 'blue' ? CLIENT_CONFIG.TARGETING_LINES.BLUE : CLIENT_CONFIG.TARGETING_LINES.RED;
                    
                    // Check if player's hero is involved in this targeting line
                    const isPlayerInvolved = this.playerSessionId && (
                        (combatant.type === COMBATANT_TYPES.HERO && isHeroCombatant(combatant) && combatant.controller === this.playerSessionId) ||
                        (target.type === COMBATANT_TYPES.HERO && isHeroCombatant(target) && target.controller === this.playerSessionId)
                    );
                    
                    // Calculate alpha - either flash or base alpha
                    let alpha: number = isPlayerInvolved ? CLIENT_CONFIG.TARGETING_LINES.PLAYER_BASE_ALPHA : CLIENT_CONFIG.TARGETING_LINES.BASE_ALPHA;
                    
                    // Check if this targeting line should flash
                    const targetingLineKey = `${combatant.id}-${target.id}`;
                    const isFlashing = this.flashingTargetingLines.has(targetingLineKey);
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
                    
                    // Draw targeting line with appropriate thickness
                    const lineThickness = isFlashing ? CLIENT_CONFIG.TARGETING_LINES.FLASH_LINE_THICKNESS : CLIENT_CONFIG.TARGETING_LINES.LINE_THICKNESS;
                    graphics.lineStyle(lineThickness, lineColor, alpha);
                    graphics.beginPath();
                    graphics.moveTo(sourceX, sourceY);
                    graphics.lineTo(targetX, targetY);
                    graphics.strokePath();
                }
            }
        });
    }

    /**
     * Renders the main graphics for an entity based on its type
     */
    private renderEntityGraphics(combatant: Combatant, graphics: Phaser.GameObjects.Graphics): void {
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
        
        // Render based on type
        switch (combatant.type) {
            case COMBATANT_TYPES.HERO:
                this.renderHeroGraphics(graphics, primaryColor, respawnColor, healthPercentage, combatant.size);
                break;
            case COMBATANT_TYPES.CRADLE:
                this.renderCradleGraphics(graphics, primaryColor, respawnColor, healthPercentage);
                break;
            case COMBATANT_TYPES.TURRET:
                this.renderTurretGraphics(graphics, primaryColor, respawnColor, healthPercentage, combatant);
                break;
            case COMBATANT_TYPES.MINION:
                this.renderMinionGraphics(graphics, primaryColor, respawnColor, healthPercentage, combatant);
                break;
        }
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
        
        // Render based on projectile type
        switch (projectile.type) {
            case 'hook':
                // Render hookshot projectile as a question mark
                this.renderHookProjectile(graphics, projectileColor, radius);
                break;
            case 'fireball':
                // Render fireball projectile as an ampersand (&)
                this.renderFireballProjectile(graphics, projectileColor, radius);
                break;
            case 'sniper':
                // Render sniper projectile as a star (same as default)
                this.renderSniperProjectile(graphics, projectileColor, radius);
                break;
            case 'default':
            default:
                // Render default projectile as a star
                this.renderDefaultProjectile(graphics, projectileColor, radius);
                break;
        }
    }
    
    /**
     * Renders a hookshot projectile as a question mark
     */
    private renderHookProjectile(graphics: Phaser.GameObjects.Graphics, color: number, radius: number): void {
        // Draw a circle with a question mark inside
        graphics.lineStyle(CLIENT_CONFIG.PROJECTILE.BORDER_WIDTH, CLIENT_CONFIG.PROJECTILE.BORDER_COLOR, 1);
        graphics.strokeCircle(0, 0, radius);
        
        graphics.fillStyle(color, 1);
        graphics.fillCircle(0, 0, radius);
        
        // Draw question mark in the center - make it more prominent
        graphics.lineStyle(4, CLIENT_CONFIG.PROJECTILE.BORDER_COLOR, 1);
        graphics.beginPath();
        
        // Question mark shape - larger and more visible
        const qRadius = radius * 0.5; // Increased size
        const centerY = -qRadius * 0.2; // Better positioning
        
        // Draw the curved part of the question mark (top curve)
        graphics.arc(0, centerY, qRadius, 0, Math.PI * 1.5);
        
        // Draw the stem (vertical line)
        graphics.moveTo(0, centerY + qRadius * 0.5);
        graphics.lineTo(0, centerY + qRadius * 1.1);
        
        // Draw the dot at the bottom
        graphics.moveTo(0, centerY + qRadius * 1.3);
        graphics.lineTo(0, centerY + qRadius * 1.5);
        
        graphics.strokePath();
    }
    
    /**
     * Renders a fireball projectile as an ampersand (&)
     */
    private renderFireballProjectile(graphics: Phaser.GameObjects.Graphics, color: number, radius: number): void {
        // Draw a circle with an ampersand inside
        graphics.lineStyle(CLIENT_CONFIG.PROJECTILE.BORDER_WIDTH, CLIENT_CONFIG.PROJECTILE.BORDER_COLOR, 1);
        graphics.strokeCircle(0, 0, radius);
        
        // Use the provided color (which is already team-specific)
        graphics.fillStyle(color, 1);
        graphics.fillCircle(0, 0, radius);
        
        // Draw ampersand (&) in the center
        graphics.lineStyle(3, CLIENT_CONFIG.PROJECTILE.BORDER_COLOR, 1);
        graphics.beginPath();
        
        const ampRadius = radius * 0.4;
        
        // Draw the ampersand shape - simplified version
        // Top circle part
        graphics.arc(-ampRadius * 0.3, -ampRadius * 0.5, ampRadius * 0.4, 0, Math.PI * 2);
        
        // Bottom circle part
        graphics.arc(-ampRadius * 0.1, ampRadius * 0.3, ampRadius * 0.3, 0, Math.PI * 2);
        
        // Diagonal line connecting them
        graphics.moveTo(ampRadius * 0.1, -ampRadius * 0.8);
        graphics.lineTo(ampRadius * 0.5, ampRadius * 0.8);
        
        graphics.strokePath();
    }
    
    /**
     * Renders a default projectile as a star
     */
    private renderDefaultProjectile(graphics: Phaser.GameObjects.Graphics, color: number, radius: number): void {
        const spikes = 8; // Number of spikes
        const innerRadius = radius * 0.4; // Inner radius for the star shape
        const outerRadius = radius; // Outer radius for the spikes
        
        // Draw border first
        graphics.lineStyle(CLIENT_CONFIG.PROJECTILE.BORDER_WIDTH, CLIENT_CONFIG.PROJECTILE.BORDER_COLOR, 1);
        this.drawStar(graphics, 0, 0, spikes, innerRadius, outerRadius);
        
        // Draw filled star
        graphics.fillStyle(color, 1);
        this.drawStar(graphics, 0, 0, spikes, innerRadius, outerRadius, true);
    }
    
    /**
     * Renders a sniper projectile as a star (identical to default)
     */
    private renderSniperProjectile(graphics: Phaser.GameObjects.Graphics, color: number, radius: number): void {
        const spikes = 8; // Number of spikes
        const innerRadius = radius * 0.4; // Inner radius for the star shape
        const outerRadius = radius; // Outer radius for the spikes
        
        // Draw border first
        graphics.lineStyle(CLIENT_CONFIG.PROJECTILE.BORDER_WIDTH, CLIENT_CONFIG.PROJECTILE.BORDER_COLOR, 1);
        this.drawStar(graphics, 0, 0, spikes, innerRadius, outerRadius);
        
        // Draw filled star
        graphics.fillStyle(color, 1);
        this.drawStar(graphics, 0, 0, spikes, innerRadius, outerRadius, true);
    }
    
    /**
     * Draws a star shape
     */
    private drawStar(graphics: Phaser.GameObjects.Graphics, x: number, y: number, spikes: number, innerRadius: number, outerRadius: number, fill: boolean = false): void {
        const step = Math.PI / spikes;
        
        graphics.beginPath();
        graphics.moveTo(x + outerRadius * Math.cos(0), y + outerRadius * Math.sin(0));
        
        for (let i = 0; i < spikes * 2; i++) {
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            const angle = i * step;
            graphics.lineTo(x + radius * Math.cos(angle), y + radius * Math.sin(angle));
        }
        
        graphics.closePath();
        
        if (fill) {
            graphics.fillPath();
        } else {
            graphics.strokePath();
        }
    }

    /**
     * Renders hero graphics (circle) with draining glass effect
     */
    private renderHeroGraphics(graphics: Phaser.GameObjects.Graphics, primaryColor: number, respawnColor: number, healthPercentage: number, size: number): void {
        const radius = size;
        
        if (healthPercentage < 1) {
            // Draw the larger, lighter circle representing missing health
            graphics.fillStyle(respawnColor, 1);
            graphics.fillCircle(0, 0, radius);
            
            // Draw the smaller, darker circle representing remaining health
            const remainingRadius = radius * Math.sqrt(healthPercentage);
            graphics.fillStyle(primaryColor, 1);
            graphics.fillCircle(0, 0, remainingRadius);
        } else {
            // At full health, just draw the main circle
            graphics.fillStyle(primaryColor, 1);
            graphics.fillCircle(0, 0, radius);
        }
    }

    /**
     * Renders cradle graphics (square) with draining glass effect
     */
    private renderCradleGraphics(graphics: Phaser.GameObjects.Graphics, primaryColor: number, respawnColor: number, healthPercentage: number): void {
        const size = CLIENT_CONFIG.CRADLE_SIZE;
        const halfSize = size / 2;
        
        if (healthPercentage < 1) {
            // Draw the larger, lighter square representing missing health
            graphics.fillStyle(respawnColor, 1);
            graphics.fillRect(-halfSize, -halfSize, size, size);
            
            // Draw the smaller, darker square representing remaining health
            const remainingSize = size * Math.sqrt(healthPercentage);
            const remainingHalfSize = remainingSize / 2;
            graphics.fillStyle(primaryColor, 1);
            graphics.fillRect(-remainingHalfSize, -remainingHalfSize, remainingSize, remainingSize);
        } else {
            // At full health, just draw the main square
            graphics.fillStyle(primaryColor, 1);
            graphics.fillRect(-halfSize, -halfSize, size, size);
        }
    }

    /**
     * Renders turret graphics (rectangle) with draining glass effect
     */
    private renderTurretGraphics(graphics: Phaser.GameObjects.Graphics, primaryColor: number, respawnColor: number, healthPercentage: number, combatant: Combatant): void {
        if (combatant.health > 0) {
            const width = CLIENT_CONFIG.TURRET_SIZE.width;
            const height = CLIENT_CONFIG.TURRET_SIZE.height;
            const halfWidth = width / 2;
            const halfHeight = height / 2;
            
            if (healthPercentage < 1) {
                // Draw the larger, lighter rectangle representing missing health
                graphics.fillStyle(respawnColor, 1);
                graphics.fillRect(-halfWidth, -halfHeight, width, height);
                
                // Draw the smaller, darker rectangle representing remaining health
                const remainingWidth = width * Math.sqrt(healthPercentage);
                const remainingHeight = height * Math.sqrt(healthPercentage);
                const remainingHalfWidth = remainingWidth / 2;
                const remainingHalfHeight = remainingHeight / 2;
                graphics.fillStyle(primaryColor, 1);
                graphics.fillRect(-remainingHalfWidth, -remainingHalfHeight, remainingWidth, remainingHeight);
            } else {
                // At full health, just draw the main rectangle
                graphics.fillStyle(primaryColor, 1);
                graphics.fillRect(-halfWidth, -halfHeight, width, height);
            }
            
            graphics.setVisible(true);
        } else {
            graphics.setVisible(false);
        }
    }

    /**
     * Renders minion graphics (diamond for warrior, triangle for archer) with draining glass effect
     */
    private renderMinionGraphics(graphics: Phaser.GameObjects.Graphics, primaryColor: number, respawnColor: number, healthPercentage: number, combatant: Combatant): void {
        if (!isMinionCombatant(combatant)) return;
        
        if (combatant.health > 0) {
            const size = CLIENT_CONFIG.MINION_SIZE;
            
            if (combatant.minionType === MINION_TYPES.WARRIOR) {
                // Diamond shape
                if (healthPercentage < 1) {
                    // Draw the larger, lighter diamond representing missing health
                    graphics.fillStyle(respawnColor, 1);
                    graphics.beginPath();
                    graphics.moveTo(0, -size);
                    graphics.lineTo(size, 0);
                    graphics.lineTo(0, size);
                    graphics.lineTo(-size, 0);
                    graphics.closePath();
                    graphics.fillPath();
                    
                    // Draw the smaller, darker diamond representing remaining health
                    const remainingSize = size * Math.sqrt(healthPercentage);
                    graphics.fillStyle(primaryColor, 1);
                    graphics.beginPath();
                    graphics.moveTo(0, -remainingSize);
                    graphics.lineTo(remainingSize, 0);
                    graphics.lineTo(0, remainingSize);
                    graphics.lineTo(-remainingSize, 0);
                    graphics.closePath();
                    graphics.fillPath();
                } else {
                    // At full health, just draw the main diamond
                    graphics.fillStyle(primaryColor, 1);
                    graphics.beginPath();
                    graphics.moveTo(0, -size);
                    graphics.lineTo(size, 0);
                    graphics.lineTo(0, size);
                    graphics.lineTo(-size, 0);
                    graphics.closePath();
                    graphics.fillPath();
                }
            } else if (combatant.minionType === MINION_TYPES.ARCHER) {
                // Triangle shape
                if (healthPercentage < 1) {
                    // Draw the larger, lighter triangle representing missing health
                    graphics.fillStyle(respawnColor, 1);
                    graphics.beginPath();
                    graphics.moveTo(0, -size);
                    graphics.lineTo(size, size);
                    graphics.lineTo(-size, size);
                    graphics.closePath();
                    graphics.fillPath();
                    
                    // Draw the smaller, darker triangle representing remaining health
                    const remainingSize = size * Math.sqrt(healthPercentage);
                    graphics.fillStyle(primaryColor, 1);
                    graphics.beginPath();
                    graphics.moveTo(0, -remainingSize);
                    graphics.lineTo(remainingSize, remainingSize);
                    graphics.lineTo(-remainingSize, remainingSize);
                    graphics.closePath();
                    graphics.fillPath();
                } else {
                    // At full health, just draw the main triangle
                    graphics.fillStyle(primaryColor, 1);
                    graphics.beginPath();
                    graphics.moveTo(0, -size);
                    graphics.lineTo(size, size);
                    graphics.lineTo(-size, size);
                    graphics.closePath();
                    graphics.fillPath();
                }
            }
            
            graphics.setVisible(true);
        } else {
            graphics.setVisible(false);
        }
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
            
            respawnRing.lineStyle(CLIENT_CONFIG.RESPAWN_RING.THICKNESS, ringColor, CLIENT_CONFIG.RESPAWN_RING.ALPHA);
            respawnRing.beginPath();
            respawnRing.arc(0, 0, CLIENT_CONFIG.RESPAWN_RING.RADIUS, -Math.PI/2, -Math.PI/2 + (2 * Math.PI * respawnProgress));
            respawnRing.strokePath();
        }
    }

    /**
     * Renders the ability ready indicator for heroes only
     */
    private renderAbilityReadyIndicator(hero: HeroCombatant, abilityReadyIndicator: Phaser.GameObjects.Graphics, state?: SharedGameState): void {
        abilityReadyIndicator.clear();
        
        // Check if ability is ready
        const currentTime = state?.gameTime || 0;
        
        // If lastUsedTime is 0, the ability hasn't been used yet, so it's ready immediately
        let isAbilityReady = false;
        if (hero.ability.lastUsedTime === 0) {
            isAbilityReady = true;
        } else {
            const timeSinceLastUse = currentTime - hero.ability.lastUsedTime;
            isAbilityReady = timeSinceLastUse >= hero.ability.cooldown;
        }
        
        if (isAbilityReady && hero.state === 'alive') {
            abilityReadyIndicator.lineStyle(
                CLIENT_CONFIG.ABILITY_READY_INDICATOR.THICKNESS, 
                CLIENT_CONFIG.ABILITY_READY_INDICATOR.COLOR, 
                CLIENT_CONFIG.ABILITY_READY_INDICATOR.ALPHA
            );
            abilityReadyIndicator.strokeCircle(0, 0, CLIENT_CONFIG.ABILITY_READY_INDICATOR.RADIUS);
        }
    }

    /**
     * Renders the radius indicator for attack ranges
     */
    private renderRadiusIndicator(combatant: Combatant, radiusIndicator: Phaser.GameObjects.Graphics, isRecentAttacker?: boolean): void {
        radiusIndicator.clear();
        
        // Only show radius indicator for structures (cradles, turrets), the player's hero, and recent attackers
        const shouldShowRadius = (
            combatant.health > 0 && 
            (
                // Structures always show radius (unless they're recent attackers, then they'll show red)
                (combatant.type === COMBATANT_TYPES.CRADLE || combatant.type === COMBATANT_TYPES.TURRET) ||
                // Player's hero shows radius (if not respawning)
                (combatant.type === COMBATANT_TYPES.HERO && 
                 isHeroCombatant(combatant) && 
                 combatant.state !== 'respawning' &&
                 combatant.controller === this.playerSessionId) ||
                // Recent attackers show radius (heroes, turrets, cradles)
                isRecentAttacker
            )
        );
        
        if (shouldShowRadius) {
            // Use different styling for recent attackers
            if (isRecentAttacker) {
                // Red color for recent attackers with moderate alpha
                radiusIndicator.lineStyle(CLIENT_CONFIG.RADIUS_INDICATOR.LINE_THICKNESS, 0xff0000, 0.3);
            } else {
                // Default black color with lower alpha
                radiusIndicator.lineStyle(CLIENT_CONFIG.RADIUS_INDICATOR.LINE_THICKNESS, CLIENT_CONFIG.RADIUS_INDICATOR.LINE_COLOR, 0.2);
            }
            radiusIndicator.strokeCircle(0, 0, combatant.attackRadius);
        }
    }

    /**
     * Updates the text display (level for heroes, nothing for others)
     */
    private updateTextDisplay(combatant: Combatant, text: Phaser.GameObjects.Text): void {
        if (combatant.type === COMBATANT_TYPES.HERO && isHeroCombatant(combatant)) {
            const level = combatant.level;
            const romanNumeral = this.toRomanNumeral(level);
            text.setText(romanNumeral);
            
            // Check if this hero is controlled by the current player
            const isControlledByPlayer = this.playerSessionId && combatant.controller === this.playerSessionId;
            
            // Set color based on control
            const textColor = isControlledByPlayer 
                ? CLIENT_CONFIG.SELF_COLORS.TEXT
                : (combatant.team === 'blue' ? 0x1a4a6b : 0x8b1a1a); // Team colors for others
            
            text.setStyle({ 
                fontSize: '16px', 
                fontStyle: 'bold',
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
     * Updates the ability icon display for heroes
     */
    private updateAbilityIconDisplay(combatant: HeroCombatant, abilityIconText: Phaser.GameObjects.Text): void {
        const abilityIcon = AbilityIconManager.getAbilityIcon(combatant.ability.type);
        abilityIconText.setText(abilityIcon);

        // Check if this hero is controlled by the current player
        const isControlledByPlayer = this.playerSessionId && combatant.controller === this.playerSessionId;
        
        // Set color based on control
        const textColor = isControlledByPlayer 
            ? CLIENT_CONFIG.SELF_COLORS.TEXT
            : (combatant.team === 'blue' ? 0x1a4a6b : 0x8b1a1a); // Team colors for others
        
        abilityIconText.setStyle({ 
            fontSize: '16px', 
            fontStyle: 'bold',
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

        // Position the ability icon above the level text by adjusting the origin
        abilityIconText.setOrigin(0.5, 0.9); // Position higher than the level text
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
