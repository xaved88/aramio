import Phaser from 'phaser';
import { Combatant, COMBATANT_TYPES, isPlayerCombatant, PlayerCombatant } from '../../shared/types/CombatantTypes';
import { SharedGameState } from '../../shared/types/GameStateTypes';
import { CLIENT_CONFIG } from '../../Config';

/**
 * EntityRenderer handles all rendering logic for different entity types
 */
export class EntityRenderer {
    private scene: Phaser.Scene;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
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
        state?: SharedGameState
    ): void {
        // Render the main entity graphics
        this.renderEntityGraphics(combatant, graphics);
        
        // Render respawn ring for players
        if (respawnRing && combatant.type === COMBATANT_TYPES.PLAYER && isPlayerCombatant(combatant)) {
            this.renderRespawnRing(combatant, respawnRing, state);
        }
        
        // Render radius indicator
        this.renderRadiusIndicator(combatant, radiusIndicator);
        
        // Update health text
        this.updateHealthText(combatant, text);
        
        // Handle turret visibility
        if (combatant.type === COMBATANT_TYPES.TURRET) {
            this.handleTurretVisibility(combatant, text, radiusIndicator);
        }
    }

    /**
     * Renders the main graphics for an entity based on its type
     */
    private renderEntityGraphics(combatant: Combatant, graphics: Phaser.GameObjects.Graphics): void {
        graphics.clear();
        
        // Determine color based on team and state
        let color;
        if (combatant.type === COMBATANT_TYPES.PLAYER && isPlayerCombatant(combatant) && combatant.state === 'respawning') {
            color = combatant.team === 'blue' ? CLIENT_CONFIG.TEAM_COLORS.BLUE_RESPAWNING : CLIENT_CONFIG.TEAM_COLORS.RED_RESPAWNING;
        } else {
            color = combatant.team === 'blue' ? CLIENT_CONFIG.TEAM_COLORS.BLUE : CLIENT_CONFIG.TEAM_COLORS.RED;
        }
        
        // Render based on type
        switch (combatant.type) {
            case COMBATANT_TYPES.PLAYER:
                this.renderPlayerGraphics(graphics, color);
                break;
            case COMBATANT_TYPES.CRADLE:
                this.renderCradleGraphics(graphics, color);
                break;
            case COMBATANT_TYPES.TURRET:
                this.renderTurretGraphics(graphics, color, combatant);
                break;
        }
    }

    /**
     * Renders player graphics (circle)
     */
    private renderPlayerGraphics(graphics: Phaser.GameObjects.Graphics, color: number): void {
        graphics.fillStyle(color, 1);
        graphics.fillCircle(0, 0, CLIENT_CONFIG.PLAYER_CIRCLE_RADIUS);
    }

    /**
     * Renders cradle graphics (square)
     */
    private renderCradleGraphics(graphics: Phaser.GameObjects.Graphics, color: number): void {
        graphics.fillStyle(color, 1);
        graphics.fillRect(
            -CLIENT_CONFIG.CRADLE_SIZE / 2,
            -CLIENT_CONFIG.CRADLE_SIZE / 2,
            CLIENT_CONFIG.CRADLE_SIZE,
            CLIENT_CONFIG.CRADLE_SIZE
        );
    }

    /**
     * Renders turret graphics (rectangle)
     */
    private renderTurretGraphics(graphics: Phaser.GameObjects.Graphics, color: number, combatant: Combatant): void {
        if (combatant.health > 0) {
            graphics.fillStyle(color, 1);
            graphics.fillRect(
                -CLIENT_CONFIG.TURRET_SIZE.width / 2,
                -CLIENT_CONFIG.TURRET_SIZE.height / 2,
                CLIENT_CONFIG.TURRET_SIZE.width,
                CLIENT_CONFIG.TURRET_SIZE.height
            );
            graphics.setVisible(true);
        } else {
            graphics.setVisible(false);
        }
    }

    /**
     * Renders the respawn ring for players only
     */
    private renderRespawnRing(player: PlayerCombatant, respawnRing: Phaser.GameObjects.Graphics, state?: SharedGameState): void {
        respawnRing.clear();
        if (player.state === 'respawning' && state) {
            const respawnDuration = player.respawnDuration;
            const timeElapsed = respawnDuration - (player.respawnTime - state.gameTime);
            const respawnProgress = Math.max(0, Math.min(1, timeElapsed / respawnDuration));
            const ringColor = player.team === 'blue' ? CLIENT_CONFIG.TEAM_COLORS.BLUE : CLIENT_CONFIG.TEAM_COLORS.RED;
            
            respawnRing.lineStyle(CLIENT_CONFIG.RESPAWN_RING.THICKNESS, ringColor, CLIENT_CONFIG.RESPAWN_RING.ALPHA);
            respawnRing.beginPath();
            respawnRing.arc(0, 0, CLIENT_CONFIG.RESPAWN_RING.RADIUS, -Math.PI/2, -Math.PI/2 + (2 * Math.PI * respawnProgress));
            respawnRing.strokePath();
        }
    }

    /**
     * Renders the radius indicator for attack ranges
     */
    private renderRadiusIndicator(combatant: Combatant, radiusIndicator: Phaser.GameObjects.Graphics): void {
        radiusIndicator.clear();
        if (combatant.health > 0 && (combatant.type !== COMBATANT_TYPES.PLAYER || !isPlayerCombatant(combatant) || combatant.state !== 'respawning')) {
            radiusIndicator.lineStyle(1, 0x000000, 0.3); // Thin black line with alpha
            radiusIndicator.strokeCircle(0, 0, combatant.attackRadius);
        }
    }

    /**
     * Updates the health text for an entity
     */
    private updateHealthText(combatant: Combatant, text: Phaser.GameObjects.Text): void {
        const healthPercent = Math.round((combatant.health / combatant.maxHealth) * 100);
        text.setText(`${healthPercent}%`);
    }

    /**
     * Handles visibility for turret text and radius indicator
     */
    private handleTurretVisibility(combatant: Combatant, text: Phaser.GameObjects.Text, radiusIndicator: Phaser.GameObjects.Graphics): void {
        text.setVisible(combatant.health > 0);
        radiusIndicator.setVisible(combatant.health > 0);
    }
} 