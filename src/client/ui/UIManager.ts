import Phaser from 'phaser';
import { COMBATANT_TYPES, isHeroCombatant, ControllerId } from '../../shared/types/CombatantTypes';
import { SharedGameState } from '../../shared/types/GameStateTypes';
import { HUDRenderer } from './HUDRenderer';
import { VictoryScreen } from './VictoryScreen';
import { StatsOverlay } from './StatsOverlay';

/**
 * UIManager handles all UI elements including HUD, menus, and interface components.
 * This separates UI concerns from game world entities and scene logic.
 */
export class UIManager {
    private scene: Phaser.Scene;
    private hudRenderer: HUDRenderer;
    private victoryScreen: VictoryScreen;
    private statsOverlay: StatsOverlay;

    
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
    private hudHeroKillIcon: Phaser.GameObjects.Graphics | null = null;
    private hudHeroKillText: Phaser.GameObjects.Text | null = null;
    private hudMinionKillIcon: Phaser.GameObjects.Graphics | null = null;
    private hudMinionKillText: Phaser.GameObjects.Text | null = null;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.hudRenderer = new HUDRenderer(scene);
        this.victoryScreen = new VictoryScreen(scene);
        this.statsOverlay = new StatsOverlay(scene);
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
        this.hudHeroKillIcon = hudElements.heroKillIcon;
        this.hudHeroKillText = hudElements.heroKillText;
        this.hudMinionKillIcon = hudElements.minionKillIcon;
        this.hudMinionKillText = hudElements.minionKillText;
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
        if (this.hudHeroKillIcon) this.hudHeroKillIcon.destroy();
        if (this.hudHeroKillText) this.hudHeroKillText.destroy();
        if (this.hudMinionKillIcon) this.hudMinionKillIcon.destroy();
        if (this.hudMinionKillText) this.hudMinionKillText.destroy();
        
        this.hudHealthBar = null;
        this.hudHealthBarBackground = null;
        this.hudHealthText = null;
        this.hudExperienceBar = null;
        this.hudExperienceBarBackground = null;
        this.hudExperienceText = null;
        this.hudLevelText = null;
        this.hudAbilityBar = null;
        this.hudAbilityBarBackground = null;
        this.hudHeroKillIcon = null;
        this.hudHeroKillText = null;
        this.hudMinionKillIcon = null;
        this.hudMinionKillText = null;
    }

    /**
     * Hides the victory screen if it's showing
     */
    hideVictoryScreen(): void {
        this.victoryScreen.destroy();
    }

    /**
     * Sets the player session ID for stats overlay
     */
    setPlayerSessionId(sessionId: ControllerId | null): void {
        this.statsOverlay.setPlayerSessionId(sessionId);
    }

    /**
     * Shows the stats overlay
     */
    showStatsOverlay(state: SharedGameState): void {
        this.statsOverlay.show(state);
    }

    /**
     * Hides the stats overlay
     */
    hideStatsOverlay(): void {
        this.statsOverlay.hide();
    }

    /**
     * Updates the stats overlay
     */
    updateStatsOverlay(state: SharedGameState): void {
        this.statsOverlay.update(state);
    }

    /**
     * Updates the HUD based on the current game state
     */
    updateHUD(state: SharedGameState, playerTeam: string | null = null, playerSessionId: ControllerId | null = null): void {
        if (!this.hudHealthBar || !this.hudHealthBarBackground || !this.hudHealthText || 
            !this.hudExperienceBar || !this.hudExperienceBarBackground || !this.hudExperienceText || 
            !this.hudLevelText || !this.hudAbilityBar || !this.hudAbilityBarBackground ||
            !this.hudHeroKillIcon || !this.hudHeroKillText || !this.hudMinionKillIcon || !this.hudMinionKillText) return;
        
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
                abilityBarBackground: this.hudAbilityBarBackground,
                heroKillIcon: this.hudHeroKillIcon,
                heroKillText: this.hudHeroKillText,
                minionKillIcon: this.hudMinionKillIcon,
                minionKillText: this.hudMinionKillText
            },
            state.gameTime
        );
        
        // Update stats overlay if visible
        this.updateStatsOverlay(state);
        
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
        this.statsOverlay.destroy();
        
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
