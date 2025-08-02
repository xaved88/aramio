import Phaser from 'phaser';
import { COMBATANT_TYPES, isPlayerCombatant } from '../../shared/types/CombatantTypes';
import { SharedGameState } from '../../shared/types/GameStateTypes';
import { HUDRenderer } from './HUDRenderer';

/**
 * UIManager handles all UI elements including HUD, menus, and interface components.
 * This separates UI concerns from game world entities and scene logic.
 */
export class UIManager {
    private scene: Phaser.Scene;
    private hudRenderer: HUDRenderer;
    
    // HUD elements
    private hudHealthBar: Phaser.GameObjects.Graphics | null = null;
    private hudHealthBarBackground: Phaser.GameObjects.Graphics | null = null;
    private hudHealthText: Phaser.GameObjects.Text | null = null;
    private hudExperienceBar: Phaser.GameObjects.Graphics | null = null;
    private hudExperienceBarBackground: Phaser.GameObjects.Graphics | null = null;
    private hudExperienceText: Phaser.GameObjects.Text | null = null;
    private hudLevelText: Phaser.GameObjects.Text | null = null;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.hudRenderer = new HUDRenderer(scene);
    }

    /**
     * Creates all HUD elements
     */
    createHUD(): void {
        const hudElements = this.hudRenderer.createHUDElements();
        
        this.hudHealthBar = hudElements.healthBar;
        this.hudHealthBarBackground = hudElements.healthBarBackground;
        this.hudHealthText = hudElements.healthText;
        this.hudExperienceBar = hudElements.experienceBar;
        this.hudExperienceBarBackground = hudElements.experienceBarBackground;
        this.hudExperienceText = hudElements.experienceText;
        this.hudLevelText = hudElements.levelText;
    }

    /**
     * Updates the HUD based on the current game state
     */
    updateHUD(state: SharedGameState): void {
        if (!this.hudHealthBar || !this.hudHealthBarBackground || !this.hudHealthText || 
            !this.hudExperienceBar || !this.hudExperienceBarBackground || !this.hudExperienceText || !this.hudLevelText) return;
        
        // Find the current player (assuming first player for now)
        // In a real implementation, you'd track the client's player ID
        const currentPlayer = Array.from(state.combatants.values()).find(c => c.type === COMBATANT_TYPES.PLAYER);
        if (!currentPlayer || !isPlayerCombatant(currentPlayer)) return;
        
        this.hudRenderer.updateHUD(
            currentPlayer,
            {
                healthBar: this.hudHealthBar,
                healthBarBackground: this.hudHealthBarBackground,
                healthText: this.hudHealthText,
                experienceBar: this.hudExperienceBar,
                experienceBarBackground: this.hudExperienceBarBackground,
                experienceText: this.hudExperienceText,
                levelText: this.hudLevelText
            }
        );
    }

    /**
     * Cleans up all UI elements (called when scene is destroyed)
     */
    destroy(): void {
        if (this.hudHealthBar) this.hudHealthBar.destroy();
        if (this.hudHealthBarBackground) this.hudHealthBarBackground.destroy();
        if (this.hudHealthText) this.hudHealthText.destroy();
        if (this.hudExperienceBar) this.hudExperienceBar.destroy();
        if (this.hudExperienceBarBackground) this.hudExperienceBarBackground.destroy();
        if (this.hudExperienceText) this.hudExperienceText.destroy();
        if (this.hudLevelText) this.hudLevelText.destroy();
        
        this.hudHealthBar = null;
        this.hudHealthBarBackground = null;
        this.hudHealthText = null;
        this.hudExperienceBar = null;
        this.hudExperienceBarBackground = null;
        this.hudExperienceText = null;
        this.hudLevelText = null;
    }
} 