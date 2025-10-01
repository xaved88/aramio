import Phaser from 'phaser';
import { COMBATANT_TYPES, isHeroCombatant, ControllerId } from '../../shared/types/CombatantTypes';
import { SharedGameState } from '../../shared/types/GameStateTypes';
import { convertToSharedGameState } from '../../shared/utils/StateConverter';
import { HUDRenderer } from './HUDRenderer';
import { VictoryScreen } from './VictoryScreen';
import { StatsOverlay } from './StatsOverlay';
import { RespawnOverlay } from './RespawnOverlay';
import { PermanentEffectsDisplay } from './PermanentEffectsDisplay';
import { DamageTakenOverlay } from './DamageTakenOverlay';
import { DamageDealtOverlay } from './DamageDealtOverlay';
import { CursorRenderer } from './CursorRenderer';
import { GameplayConfig } from '../../server/config/ConfigProvider';

/**
 * UIManager handles all UI elements including HUD, menus, and interface components.
 * This separates UI concerns from game world entities and scene logic.
 */
export class UIManager {
    private scene: Phaser.Scene;
    private gameplayConfig: GameplayConfig;
    private hudCamera: Phaser.Cameras.Scene2D.Camera | null = null;
    private cameraManager: any = null;
    private hudRenderer: HUDRenderer;
    private victoryScreen: VictoryScreen;
    private statsOverlay: StatsOverlay;
    private respawnOverlay: RespawnOverlay;
    private permanentEffectsDisplay: PermanentEffectsDisplay;
    private damageTakenOverlay: DamageTakenOverlay;
    private damageDealtOverlay: DamageDealtOverlay;
    private cursorRenderer: CursorRenderer;
    private lastRewardIds: string[] = []; // Track last reward IDs to avoid unnecessary updates
    private lastState: SharedGameState | null = null; // Store last state for cursor updates

    // HUD elements
    private hudElements: {
        healthBar: Phaser.GameObjects.Graphics | null;
        healthBarBackground: Phaser.GameObjects.Graphics | null;
        healthText: Phaser.GameObjects.Text | null;
        experienceBar: Phaser.GameObjects.Graphics | null;
        experienceBarBackground: Phaser.GameObjects.Graphics | null;
        experienceText: Phaser.GameObjects.Text | null;
        levelText: Phaser.GameObjects.Text | null;
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
        heroKillIcon: null,
        heroKillText: null,
        minionKillIcon: null,
        minionKillText: null,
        rewardsIcon: null,
        rewardsText: null
    };

    constructor(scene: Phaser.Scene, gameplayConfig: GameplayConfig, onRewardChosen?: (rewardId: string) => void) {
        this.scene = scene;
        this.gameplayConfig = gameplayConfig;
        this.hudRenderer = new HUDRenderer(scene, gameplayConfig);
        this.victoryScreen = new VictoryScreen(scene);
        this.statsOverlay = new StatsOverlay(scene);
        this.respawnOverlay = new RespawnOverlay(scene, onRewardChosen);
        this.permanentEffectsDisplay = new PermanentEffectsDisplay(scene);
        this.damageTakenOverlay = new DamageTakenOverlay(scene);
        this.damageDealtOverlay = new DamageDealtOverlay(scene);
        this.cursorRenderer = new CursorRenderer(scene);
        this.victoryScreen.setRestartCallback(() => {
            console.log('Victory screen restart callback - restart handled by server');
        });
        this.victoryScreen.setShowStatsCallback((state: any, winningTeam: string, playerTeam: string) => {
            this.showPostGameStats(state, winningTeam, playerTeam);
        });
    }

    setHUDCamera(hudCamera: Phaser.Cameras.Scene2D.Camera): void {
        this.hudCamera = hudCamera;
        this.hudRenderer.setHUDCamera(hudCamera);
        this.victoryScreen.setHUDCamera(hudCamera);
        this.statsOverlay.setHUDCamera(hudCamera);
        this.respawnOverlay.setHUDCamera(hudCamera);
        this.damageTakenOverlay.setHUDCamera(hudCamera);
        this.damageDealtOverlay.setHUDCamera(hudCamera);
        this.cursorRenderer.setCameraManager(this.cameraManager);
        this.permanentEffectsDisplay.setHUDContainer(this.hudRenderer.getHUDContainer());
    }

    setCameraManager(cameraManager: any): void {
        this.cameraManager = cameraManager;
        this.hudRenderer.setCameraManager(cameraManager);
        this.victoryScreen.setCameraManager(cameraManager);
        this.statsOverlay.setCameraManager(cameraManager);
        this.respawnOverlay.setCameraManager(cameraManager);
        this.damageTakenOverlay.setCameraManager(cameraManager);
        this.damageDealtOverlay.setCameraManager(cameraManager);
        this.cursorRenderer.setCameraManager(cameraManager);
        this.permanentEffectsDisplay.setCameraManager(cameraManager);
        this.permanentEffectsDisplay.setHUDContainer(this.hudRenderer.getHUDContainer());
    }

    setRoom(room: any): void {
        this.statsOverlay.setRoom(room);
    }

    createHUD(): void {
        this.clearHUD();
        const newHudElements = this.hudRenderer.createHUDElements();
        Object.assign(this.hudElements, newHudElements);
        
        // Initialize cursor renderer
        this.cursorRenderer.create();
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
        this.damageTakenOverlay.setPlayerSessionId(sessionId);
        this.damageDealtOverlay.setPlayerSessionId(sessionId);
    }

    showStatsOverlay(state: SharedGameState): void {
        this.statsOverlay.show(state);
    }

    hideStatsOverlay(): void {
        this.statsOverlay.hide();
    }

    showPostGameStats(state: SharedGameState, winningTeam: string, playerTeam: string): void {
        this.statsOverlay.showPostGame(state, winningTeam, playerTeam);
    }

    updateStatsOverlay(state: SharedGameState): void {
        this.statsOverlay.update(state);
    }

    showDamageTakenOverlay(state: SharedGameState): void {
        this.damageTakenOverlay.show();
        // Process damage events and update the overlay immediately
        this.damageTakenOverlay.processDamageEvents(state);
        this.damageTakenOverlay.updateDamageEntries(state.gameTime, state);
    }

    hideDamageTakenOverlay(): void {
        this.damageTakenOverlay.hide();
    }

    updateDamageTakenTracking(state: SharedGameState): void {
        this.damageTakenOverlay.processDamageEvents(state);
        
        if (this.damageTakenOverlay.isShowing()) {
            this.damageTakenOverlay.updateDamageEntries(state.gameTime, state);
        }
    }

    showDamageDealtOverlay(state: SharedGameState): void {
        this.damageDealtOverlay.show();
        // Process damage events and update the overlay immediately
        this.damageDealtOverlay.processDamageEvents(state);
        this.damageDealtOverlay.updateDamageEntries(state.gameTime, state);
    }

    hideDamageDealtOverlay(): void {
        this.damageDealtOverlay.hide();
    }

    updateDamageDealtTracking(state: SharedGameState): void {
        this.damageDealtOverlay.processDamageEvents(state);
        
        if (this.damageDealtOverlay.isShowing()) {
            this.damageDealtOverlay.updateDamageEntries(state.gameTime, state);
        }
    }

    updateHUD(state: SharedGameState, playerTeam: string | null = null, playerSessionId: ControllerId | null = null): void {
        // Store state for cursor updates
        this.lastState = state;
        
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
        this.permanentEffectsDisplay.updateDisplay(currentPlayer);
        this.updateDamageTakenTracking(state);
        this.updateDamageDealtTracking(state);
        this.updateCursor(currentPlayer, state);
        
        if (state.gamePhase === 'finished' && state.winningTeam && !this.victoryScreen.isShowing()) {
            const team = playerTeam || currentPlayer.team;
            this.victoryScreen.showVictory(state.winningTeam, team, state);
        }
    }

    private updateCursor(currentPlayer: any, state: SharedGameState): void {
        if (currentPlayer && isHeroCombatant(currentPlayer)) {
            this.cursorRenderer.update(currentPlayer, state.gameTime);
        }
    }

    /**
     * Updates the cursor independently of HUD updates for smooth mouse tracking
     */
    updateCursorOnly(playerSessionId: ControllerId | null, gameTime: number): void {
        if (!this.lastState || !playerSessionId) return;
        
        const currentPlayer = this.findCurrentPlayer(this.lastState, playerSessionId);
        
        if (currentPlayer && isHeroCombatant(currentPlayer)) {
            this.cursorRenderer.update(currentPlayer, gameTime);
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
            
            // Only update rewards if they have actually changed
            if (hasUnspentRewards) {
                const currentRewardIds = currentPlayer.rewardsForChoice || [];
                const rewardsChanged = currentRewardIds.length !== this.lastRewardIds.length ||
                    currentRewardIds.some((id, index) => id !== this.lastRewardIds[index]);
                
                if (rewardsChanged) {
                    this.respawnOverlay.updateRewards(currentPlayer);
                    this.lastRewardIds = [...currentRewardIds];
                }
            } else {
                // Clear rewards if no unspent rewards
                if (this.lastRewardIds.length > 0) {
                    this.respawnOverlay.updateRewards(currentPlayer);
                    this.lastRewardIds = [];
                }
            }
            
            this.respawnOverlay.showWithTimer(remainingTime > 0 ? remainingTime : 0, hasUnspentRewards);
        } else {
            this.respawnOverlay.hide();
            // Reset reward tracking when not respawning
            this.lastRewardIds = [];
        }
    }

    destroy(): void {
        Object.values(this.hudElements).forEach(el => el?.destroy());
        this.respawnOverlay.destroy();
        this.victoryScreen.destroy();
        this.statsOverlay.destroy();
        this.permanentEffectsDisplay.destroy();
        this.damageTakenOverlay.destroy();
        this.damageDealtOverlay.destroy();
        this.cursorRenderer.destroy();
    }
} 
