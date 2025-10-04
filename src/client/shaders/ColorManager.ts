import Phaser from 'phaser';
import { CLIENT_CONFIG } from '../../ClientConfig';
import { isHeroCombatant } from '../../shared/types/CombatantTypes';
import { PaletteSwapPipeline } from './PaletteSwapPipeline';
import { SHADER_PLACEHOLDER_COLOR, hexToRgb } from './ShaderConstants';

export class ColorManager {
    private scene: Phaser.Scene;
    private pipelineRegistered: boolean = false;
    private playerSessionId: string | null = null;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }

    /**
     * Initialize the color manager and register the shader pipeline
     */
    initialize(): void {
        if (!this.pipelineRegistered && this.scene.renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer) {
            const pipeline = new PaletteSwapPipeline(this.scene.game);
            (this.scene.renderer.pipelines as any).add('PaletteSwap', pipeline);
            this.pipelineRegistered = true;
        }
    }

    /**
     * Create a unique pipeline instance for a sprite
     */
    private createUniquePipeline(sprite: Phaser.GameObjects.Sprite): string {
        const uniqueId = `PaletteSwap_${sprite.name || Math.random().toString(36).substr(2, 9)}`;
        
        if (this.scene.renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer) {
            if (!this.scene.renderer.pipelines.has(uniqueId)) {
                const pipeline = new PaletteSwapPipeline(this.scene.game);
                (this.scene.renderer.pipelines as any).add(uniqueId, pipeline);
            }
        }
        
        return uniqueId;
    }

    /**
     * Apply team colors to a hero sprite using shader-based color replacement
     */
    applyHeroColors(sprite: Phaser.GameObjects.Sprite, combatant: any): void {
        if (!isHeroCombatant(combatant)) {
            return;
        }

        // Create a unique pipeline instance for this sprite
        const uniquePipelineId = this.createUniquePipeline(sprite);
        sprite.setPipeline(uniquePipelineId);

        // Update hero colors based on team and health
        this.updateHeroColors(sprite, combatant);
    }

    /**
     * Update hero colors based on team, health, and other factors
     */
    updateHeroColors(sprite: Phaser.GameObjects.Sprite, combatant: any): void {
        if (!isHeroCombatant(combatant)) {
            return;
        }

        // Calculate health factor (0.0 = low health, 1.0 = full health)
        const healthPercentage = combatant.health / combatant.maxHealth;
        const healthFactor = Math.max(0.0, Math.min(1.0, healthPercentage));

        // Check if this hero is controlled by the current player
        const isControlledByPlayer = this.scene.data?.get('playerSessionId') && 
                                   combatant.controller === this.scene.data.get('playerSessionId');

        let tintColor: number;

        // Use the exact same color logic as the health bar
        let primaryColor, respawnColor;
        
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
            if (combatant.state === 'respawning') {
                primaryColor = combatant.team === 'blue' ? CLIENT_CONFIG.TEAM_COLORS.BLUE_RESPAWNING : CLIENT_CONFIG.TEAM_COLORS.RED_RESPAWNING;
                respawnColor = primaryColor;
            } else {
                primaryColor = combatant.team === 'blue' ? CLIENT_CONFIG.TEAM_COLORS.BLUE : CLIENT_CONFIG.TEAM_COLORS.RED;
                respawnColor = combatant.team === 'blue' ? CLIENT_CONFIG.TEAM_COLORS.BLUE_RESPAWNING : CLIENT_CONFIG.TEAM_COLORS.RED_RESPAWNING;
            }
        }
        
        // The health bar uses primaryColor for the filled portion and respawnColor for the background
        // So for the hero sprite, we want to interpolate between these colors based on health
        // High health = more primaryColor, low health = more respawnColor
        const primaryR = (primaryColor >> 16) & 0xFF;
        const primaryG = (primaryColor >> 8) & 0xFF;
        const primaryB = primaryColor & 0xFF;
        
        const respawnR = (respawnColor >> 16) & 0xFF;
        const respawnG = (respawnColor >> 8) & 0xFF;
        const respawnB = respawnColor & 0xFF;
        
        // Interpolate based on health factor (0 = respawn color, 1 = primary color)
        const finalR = Math.round(respawnR + (primaryR - respawnR) * healthFactor);
        const finalG = Math.round(respawnG + (primaryG - respawnG) * healthFactor);
        const finalB = Math.round(respawnB + (primaryB - respawnB) * healthFactor);
        
        const finalColor = (finalR << 16) | (finalG << 8) | finalB;

        // Use shader to replace only the placeholder color while preserving other colors
        this.applyShaderColors(sprite, finalColor);
    }

    /**
     * Apply shader colors to replace the placeholder color
     */
    private applyShaderColors(sprite: Phaser.GameObjects.Sprite, replacementColor: number): void {
        const pipeline = sprite.pipeline as PaletteSwapPipeline;
        
        if (pipeline && pipeline.setUniforms) {
            // Convert placeholder color to RGB (0-1 range)
            const keyColor = hexToRgb(SHADER_PLACEHOLDER_COLOR);
            
            // Convert replacement color to RGB (0-1 range)
            const replaceColor = hexToRgb(replacementColor);
            
            // Set shader uniforms using the pipeline's setUniforms method
            pipeline.setUniforms(keyColor, replaceColor, 0.1); // Small tolerance for exact color matching
        }
    }

    /**
     * Set the player session ID for determining player-controlled heroes
     */
    setPlayerSessionId(sessionId: string | null): void {
        this.playerSessionId = sessionId;
        this.scene.data.set('playerSessionId', sessionId);
    }
}
