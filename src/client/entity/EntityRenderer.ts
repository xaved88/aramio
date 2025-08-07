import Phaser from 'phaser';
import { Combatant, COMBATANT_TYPES, isHeroCombatant, HeroCombatant, MINION_TYPES, isMinionCombatant, CombatantId, ControllerId } from '../../shared/types/CombatantTypes';
import { SharedGameState } from '../../shared/types/GameStateTypes';
import { CLIENT_CONFIG } from '../../Config';

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
        state?: SharedGameState,
        playerSessionId?: ControllerId | null
    ): void {
        // Render the main entity graphics
        this.renderEntityGraphics(combatant, graphics);
        
        // Render respawn ring for heroes
        if (respawnRing && combatant.type === COMBATANT_TYPES.HERO && isHeroCombatant(combatant)) {
            this.renderRespawnRing(combatant, respawnRing, state);
        }
        
        // Render ability ready indicator only for the current player
        if (abilityReadyIndicator && combatant.type === COMBATANT_TYPES.HERO && isHeroCombatant(combatant)) {
            // Only show ability indicator for the current player
            if (playerSessionId && combatant.controller === playerSessionId) {
                this.renderAbilityReadyIndicator(combatant, abilityReadyIndicator);
            } else {
                // Clear the indicator if this hero is not controlled by the current player
                abilityReadyIndicator.clear();
            }
        }
        
        // Render radius indicator
        this.renderRadiusIndicator(combatant, radiusIndicator);
        
        // Update text display (level for heroes, nothing for others)
        this.updateTextDisplay(combatant, text);
        
        // Handle turret visibility
        if (combatant.type === COMBATANT_TYPES.TURRET) {
            this.handleTurretVisibility(combatant, text, radiusIndicator);
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
        
        // Determine colors based on team and state
        let primaryColor, respawnColor;
        if (combatant.type === COMBATANT_TYPES.HERO && isHeroCombatant(combatant) && combatant.state === 'respawning') {
            primaryColor = combatant.team === 'blue' ? CLIENT_CONFIG.TEAM_COLORS.BLUE_RESPAWNING : CLIENT_CONFIG.TEAM_COLORS.RED_RESPAWNING;
            respawnColor = primaryColor; // Use same color when respawning
        } else {
            primaryColor = combatant.team === 'blue' ? CLIENT_CONFIG.TEAM_COLORS.BLUE : CLIENT_CONFIG.TEAM_COLORS.RED;
            respawnColor = combatant.team === 'blue' ? CLIENT_CONFIG.TEAM_COLORS.BLUE_RESPAWNING : CLIENT_CONFIG.TEAM_COLORS.RED_RESPAWNING;
        }
        
        // Render based on type
        switch (combatant.type) {
            case COMBATANT_TYPES.HERO:
                this.renderPlayerGraphics(graphics, primaryColor, respawnColor, healthPercentage);
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
    renderProjectile(projectile: any, graphics: Phaser.GameObjects.Graphics): void {
        graphics.clear();
        
        // Use team-specific color for projectiles
        const projectileColor = projectile.team === 'blue' 
            ? CLIENT_CONFIG.PROJECTILE.BLUE_COLOR 
            : CLIENT_CONFIG.PROJECTILE.RED_COLOR;
        
        const radius = CLIENT_CONFIG.PROJECTILE.RADIUS;
        const spikes = 8; // Number of spikes
        const innerRadius = radius * 0.4; // Inner radius for the star shape
        const outerRadius = radius; // Outer radius for the spikes
        
        // Draw border first
        graphics.lineStyle(CLIENT_CONFIG.PROJECTILE.BORDER_WIDTH, CLIENT_CONFIG.PROJECTILE.BORDER_COLOR, 1);
        this.drawStar(graphics, 0, 0, spikes, innerRadius, outerRadius);
        
        // Draw filled star
        graphics.fillStyle(projectileColor, 1);
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
     * Renders player graphics (circle) with draining glass effect
     */
    private renderPlayerGraphics(graphics: Phaser.GameObjects.Graphics, primaryColor: number, respawnColor: number, healthPercentage: number): void {
        const radius = CLIENT_CONFIG.PLAYER_CIRCLE_RADIUS;
        
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
            const ringColor = hero.team === 'blue' ? CLIENT_CONFIG.TEAM_COLORS.BLUE : CLIENT_CONFIG.TEAM_COLORS.RED;
            
            respawnRing.lineStyle(CLIENT_CONFIG.RESPAWN_RING.THICKNESS, ringColor, CLIENT_CONFIG.RESPAWN_RING.ALPHA);
            respawnRing.beginPath();
            respawnRing.arc(0, 0, CLIENT_CONFIG.RESPAWN_RING.RADIUS, -Math.PI/2, -Math.PI/2 + (2 * Math.PI * respawnProgress));
            respawnRing.strokePath();
        }
    }

    /**
     * Renders the ability ready indicator for heroes only
     */
    private renderAbilityReadyIndicator(hero: HeroCombatant, abilityReadyIndicator: Phaser.GameObjects.Graphics): void {
        abilityReadyIndicator.clear();
        
        // Check if ability is ready
        const currentTime = Date.now();
        const timeSinceLastUse = currentTime - hero.ability.lastUsedTime;
        const isAbilityReady = timeSinceLastUse >= hero.ability.cooldown;
        
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
    private renderRadiusIndicator(combatant: Combatant, radiusIndicator: Phaser.GameObjects.Graphics): void {
        radiusIndicator.clear();
        
        // Only show radius indicator for structures (cradles, turrets) and the player's hero
        const shouldShowRadius = (
            combatant.health > 0 && 
            (
                // Structures always show radius
                combatant.type === COMBATANT_TYPES.CRADLE || 
                combatant.type === COMBATANT_TYPES.TURRET ||
                // Player's hero shows radius (if not respawning)
                (combatant.type === COMBATANT_TYPES.HERO && 
                 isHeroCombatant(combatant) && 
                 combatant.state !== 'respawning' &&
                 combatant.controller === this.playerSessionId)
            )
        );
        
        if (shouldShowRadius) {
            radiusIndicator.lineStyle(CLIENT_CONFIG.RADIUS_INDICATOR.LINE_THICKNESS, CLIENT_CONFIG.RADIUS_INDICATOR.LINE_COLOR, 0.2); // Lighter alpha
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
            
            // Set bold text with much darker team color, matching victory text style
            const darkerColor = combatant.team === 'blue' ? 0x1a4a6b : 0x8b1a1a; // Much darker shades
            text.setStyle({ 
                fontSize: '16px', 
                fontStyle: 'bold',
                fontWeight: '900', // Extra bold
                color: `#${darkerColor.toString(16).padStart(6, '0')}`,
                stroke: '#000000',
                strokeThickness: 1,
                shadow: {
                    offsetX: 1,
                    offsetY: 1,
                    color: '#000000',
                    blur: 2,
                    fill: true
                }
            });
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
