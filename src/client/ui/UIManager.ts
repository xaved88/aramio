import Phaser from 'phaser';
import { COMBATANT_TYPES, isHeroCombatant, ControllerId } from '../../shared/types/CombatantTypes';
import { SharedGameState } from '../../shared/types/GameStateTypes';
import { HUDRenderer } from './HUDRenderer';
import { VictoryScreen } from './VictoryScreen';
import { StatsOverlay } from './StatsOverlay';
import { RespawnOverlay } from './RespawnOverlay';

/**
 * UIManager handles all UI elements including HUD, menus, and interface components.
 * This separates UI concerns from game world entities and scene logic.
 */
export class UIManager {
    private scene: Phaser.Scene;
    private hudRenderer: HUDRenderer;
    private victoryScreen: VictoryScreen;
    private statsOverlay: StatsOverlay;
    private respawnOverlay: RespawnOverlay;

    // HUD elements
    private hudElements: {
        healthBar: Phaser.GameObjects.Graphics | null;
        healthBarBackground: Phaser.GameObjects.Graphics | null;
        healthText: Phaser.GameObjects.Text | null;
        experienceBar: Phaser.GameObjects.Graphics | null;
        experienceBarBackground: Phaser.GameObjects.Graphics | null;
        experienceText: Phaser.GameObjects.Text | null;
        levelText: Phaser.GameObjects.Text | null;
        abilityBar: Phaser.GameObjects.Graphics | null;
        abilityBarBackground: Phaser.GameObjects.Graphics | null;
        heroKillIcon: Phaser.GameObjects.Graphics | null;
        heroKillText: Phaser.GameObjects.Text | null;
        minionKillIcon: Phaser.GameObjects.Graphics | null;
        minionKillText: Phaser.GameObjects.Text | null;
        rewardsIcon: Phaser.GameObjects.Graphics | null;
        rewardsText: Phaser.GameObjects.Text | null;
    } = {
        healthBar: null,
        healthBarBackground: null,
        healthText: null,
        experienceBar: null,
        experienceBarBackground: null,
        experienceText: null,
        levelText: null,
        abilityBar: null,
        abilityBarBackground: null,
        heroKillIcon: null,
        heroKillText: null,
        minionKillIcon: null,
        minionKillText: null,
        rewardsIcon: null,
        rewardsText: null
    };

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.hudRenderer = new HUDRenderer(scene);
        this.victoryScreen = new VictoryScreen(scene);
        this.statsOverlay = new StatsOverlay(scene);
        this.respawnOverlay = new RespawnOverlay(scene);
        this.victoryScreen.setRestartCallback(() => {
            console.log('Victory screen restart callback - restart handled by server');
        });
    }

    createHUD(): void {
        this.clearHUD();
        const newHudElements = this.hudRenderer.createHUDElements();
        Object.assign(this.hudElements, newHudElements);
    }

    clearHUD(): void {
        Object.values(this.hudElements).forEach(el => el?.destroy());
        Object.keys(this.hudElements).forEach(key => {
            this.hudElements[key as keyof typeof this.hudElements] = null;
        });
    }

    hideVictoryScreen(): void {
        this.victoryScreen.destroy();
    }

    setPlayerSessionId(sessionId: ControllerId | null): void {
        this.statsOverlay.setPlayerSessionId(sessionId);
    }

    showStatsOverlay(state: SharedGameState): void {
        this.statsOverlay.show(state);
    }

    hideStatsOverlay(): void {
        this.statsOverlay.hide();
    }

    updateStatsOverlay(state: SharedGameState): void {
        this.statsOverlay.update(state);
    }

    updateHUD(state: SharedGameState, playerTeam: string | null = null, playerSessionId: ControllerId | null = null): void {
        if (Object.values(this.hudElements).some(el => !el)) return;
        
        const currentPlayer = this.findCurrentPlayer(state, playerSessionId);
        if (!currentPlayer || !isHeroCombatant(currentPlayer)) return;
        
        // At this point, we know all HUD elements are non-null due to the guard clause above
        const nonNullHudElements = {
            healthBar: this.hudElements.healthBar!,
            healthBarBackground: this.hudElements.healthBarBackground!,
            healthText: this.hudElements.healthText!,
            experienceBar: this.hudElements.experienceBar!,
            experienceBarBackground: this.hudElements.experienceBarBackground!,
            experienceText: this.hudElements.experienceText!,
            levelText: this.hudElements.levelText!,
            abilityBar: this.hudElements.abilityBar!,
            abilityBarBackground: this.hudElements.abilityBarBackground!,
            heroKillIcon: this.hudElements.heroKillIcon!,
            heroKillText: this.hudElements.heroKillText!,
            minionKillIcon: this.hudElements.minionKillIcon!,
            minionKillText: this.hudElements.minionKillText!,
            rewardsIcon: this.hudElements.rewardsIcon!,
            rewardsText: this.hudElements.rewardsText!
        };
        
        this.hudRenderer.updateHUD(currentPlayer, nonNullHudElements, state.gameTime);
        this.updateStatsOverlay(state);
        this.updateRespawnOverlay(currentPlayer, state);
        
        if (state.gamePhase === 'finished' && state.winningTeam && !this.victoryScreen.isShowing()) {
            const team = playerTeam || currentPlayer.team;
            this.victoryScreen.showVictory(state.winningTeam, team);
        }
    }

    private findCurrentPlayer(state: SharedGameState, playerSessionId: ControllerId | null) {
        if (playerSessionId) {
            return Array.from(state.combatants.values()).find(c => 
                c.type === COMBATANT_TYPES.HERO && c.controller === playerSessionId
            );
        }
        return Array.from(state.combatants.values()).find(c => c.type === COMBATANT_TYPES.HERO);
    }

    private updateRespawnOverlay(currentPlayer: any, state: SharedGameState): void {
        if (!currentPlayer || !isHeroCombatant(currentPlayer)) {
            this.respawnOverlay.hide();
            return;
        }

        if (currentPlayer.state === 'respawning') {
            const remainingTime = currentPlayer.respawnTime - state.gameTime;
            const hasUnspentRewards = currentPlayer.levelRewards && currentPlayer.levelRewards.length > 0;
            this.respawnOverlay.showWithTimer(remainingTime > 0 ? remainingTime : 0, hasUnspentRewards);
        } else {
            this.respawnOverlay.hide();
        }
    }

    destroy(): void {
        Object.values(this.hudElements).forEach(el => el?.destroy());
        this.respawnOverlay.destroy();
        this.victoryScreen.destroy();
        this.statsOverlay.destroy();
    }
} 
