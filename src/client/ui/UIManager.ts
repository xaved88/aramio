import Phaser from 'phaser';
import { COMBATANT_TYPES, isHeroCombatant } from '../../shared/types/CombatantTypes';
import { SharedGameState } from '../../shared/types/GameStateTypes';
import { HUDRenderer } from './HUDRenderer';
import { VictoryScreen } from './VictoryScreen';

/**
 * UIManager handles all UI elements including HUD, menus, and interface components.
 * This separates UI concerns from game world entities and scene logic.
 */
export class UIManager {
    private scene: Phaser.Scene;
    private hudRenderer: HUDRenderer;
    private victoryScreen: VictoryScreen;

    
    // HUD elements
    private hudHealthBar: Phaser.GameObjects.Graphics | null = null;
    private hudHealthBarBackground: Phaser.GameObjects.Graphics | null = null;
    private hudHealthText: Phaser.GameObjects.Text | null = null;
    private hudExperienceBar: Phaser.GameObjects.Graphics | null = null;
    private hudExperienceBarBackground: Phaser.GameObjects.Graphics | null = null;
    private hudExperienceText: Phaser.GameObjects.Text | null = null;
    private hudLevelText: Phaser.GameObjects.Text | null = null;
    private hudAbilityBar: Phaser.GameObjects.Graphics | null = null;
    private hudAbilityBarBackground: Phaser.GameObjects.Graphics | null = null;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.hudRenderer = new HUDRenderer(scene);
        this.victoryScreen = new VictoryScreen(scene);
        this.victoryScreen.setRestartCallback(() => {
            // Restart is now handled by the server, so we don't need to do anything here
            console.log('Victory screen restart callback - restart handled by server');
        });
    }



    /**
     * Creates all HUD elements
     */
    createHUD(): void {
        // Clear any existing HUD elements first
        this.clearHUD();
        
        const hudElements = this.hudRenderer.createHUDElements();
        
        this.hudHealthBar = hudElements.healthBar;
        this.hudHealthBarBackground = hudElements.healthBarBackground;
        this.hudHealthText = hudElements.healthText;
        this.hudExperienceBar = hudElements.experienceBar;
        this.hudExperienceBarBackground = hudElements.experienceBarBackground;
        this.hudExperienceText = hudElements.experienceText;
        this.hudLevelText = hudElements.levelText;
        this.hudAbilityBar = hudElements.abilityBar;
        this.hudAbilityBarBackground = hudElements.abilityBarBackground;
    }

    /**
     * Clears all HUD elements
     */
    clearHUD(): void {
        if (this.hudHealthBar) this.hudHealthBar.destroy();
        if (this.hudHealthBarBackground) this.hudHealthBarBackground.destroy();
        if (this.hudHealthText) this.hudHealthText.destroy();
        if (this.hudExperienceBar) this.hudExperienceBar.destroy();
        if (this.hudExperienceBarBackground) this.hudExperienceBarBackground.destroy();
        if (this.hudExperienceText) this.hudExperienceText.destroy();
        if (this.hudLevelText) this.hudLevelText.destroy();
        if (this.hudAbilityBar) this.hudAbilityBar.destroy();
        if (this.hudAbilityBarBackground) this.hudAbilityBarBackground.destroy();
        
        this.hudHealthBar = null;
        this.hudHealthBarBackground = null;
        this.hudHealthText = null;
        this.hudExperienceBar = null;
        this.hudExperienceBarBackground = null;
        this.hudExperienceText = null;
        this.hudLevelText = null;
        this.hudAbilityBar = null;
        this.hudAbilityBarBackground = null;
    }

    /**
     * Hides the victory screen if it's showing
     */
    hideVictoryScreen(): void {
        this.victoryScreen.destroy();
    }

    /**
     * Updates the HUD based on the current game state
     */
    updateHUD(state: SharedGameState, playerTeam: string | null = null, playerSessionId: string | null = null): void {
        if (!this.hudHealthBar || !this.hudHealthBarBackground || !this.hudHealthText || 
            !this.hudExperienceBar || !this.hudExperienceBarBackground || !this.hudExperienceText || 
            !this.hudLevelText || !this.hudAbilityBar || !this.hudAbilityBarBackground) return;
        
        // Find the current player by their session ID (controller)
        let currentPlayer = null;
        if (playerSessionId) {
            currentPlayer = Array.from(state.combatants.values()).find(c => 
                c.type === COMBATANT_TYPES.HERO && c.controller === playerSessionId
            );
        }
        
        // Fallback to first player if session ID not available
        if (!currentPlayer) {
            currentPlayer = Array.from(state.combatants.values()).find(c => c.type === COMBATANT_TYPES.HERO);
        }
        
        if (!currentPlayer || !isHeroCombatant(currentPlayer)) return;
        
        this.hudRenderer.updateHUD(
            currentPlayer,
            {
                healthBar: this.hudHealthBar,
                healthBarBackground: this.hudHealthBarBackground,
                healthText: this.hudHealthText,
                experienceBar: this.hudExperienceBar,
                experienceBarBackground: this.hudExperienceBarBackground,
                experienceText: this.hudExperienceText,
                levelText: this.hudLevelText,
                abilityBar: this.hudAbilityBar,
                abilityBarBackground: this.hudAbilityBarBackground
            }
        );
        
        // Check for game end and show victory screen
        if (state.gamePhase === 'finished' && state.winningTeam && !this.victoryScreen.isShowing()) {
            // Use the player's team if available, otherwise fall back to the current player's team
            const team = playerTeam || currentPlayer.team;
            this.victoryScreen.showVictory(state.winningTeam, team);
        }
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
        if (this.hudAbilityBar) this.hudAbilityBar.destroy();
        if (this.hudAbilityBarBackground) this.hudAbilityBarBackground.destroy();
        
        this.victoryScreen.destroy();
        
        this.hudHealthBar = null;
        this.hudHealthBarBackground = null;
        this.hudHealthText = null;
        this.hudExperienceBar = null;
        this.hudExperienceBarBackground = null;
        this.hudExperienceText = null;
        this.hudLevelText = null;
        this.hudAbilityBar = null;
        this.hudAbilityBarBackground = null;
    }
} 
