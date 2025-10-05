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
import { CheatMenu } from './CheatMenu';
import { NotificationOverlay } from './NotificationOverlay';
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
    private cheatMenu: CheatMenu;
    private notificationOverlay: NotificationOverlay;
    private lastRewardIds: string[] = []; // Track last reward IDs to avoid unnecessary updates
    private lastState: SharedGameState | null = null;
    private wasPlayerAlive: boolean = true; // Track previous alive state to detect death transitions
    private playerSessionId: ControllerId | null = null;
    private currentPlayerHeroId: string | null = null; // Track the currently controlled hero ID // Store last state for cursor updates
    private lastBlueSuperMinionsTriggered: boolean = false; // Track previous state to detect changes
    private lastRedSuperMinionsTriggered: boolean = false; // Track previous state to detect changes

    // HUD elements
    private hudElements: {
        healthBar: Phaser.GameObjects.Graphics | null;
        healthBarBackground: Phaser.GameObjects.Graphics | null;
        healthText: Phaser.GameObjects.Text | null;
        experienceBar: Phaser.GameObjects.Graphics | null;
        experienceBarBackground: Phaser.GameObjects.Graphics | null;
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
        this.hudRenderer = new HUDRenderer(scene);
        this.victoryScreen = new VictoryScreen(scene);
        this.statsOverlay = new StatsOverlay(scene);
        this.respawnOverlay = new RespawnOverlay(scene, onRewardChosen);
        this.permanentEffectsDisplay = new PermanentEffectsDisplay(scene);
        this.damageTakenOverlay = new DamageTakenOverlay(scene);
        this.damageDealtOverlay = new DamageDealtOverlay(scene);
        this.cursorRenderer = new CursorRenderer(scene);
        this.cheatMenu = new CheatMenu(scene, gameplayConfig);
        this.notificationOverlay = new NotificationOverlay(scene);
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
        this.cheatMenu.setHUDCamera(hudCamera);
        this.notificationOverlay.setHUDCamera(hudCamera);
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
        this.cheatMenu.setCameraManager(cameraManager);
        this.notificationOverlay.setCameraManager(cameraManager);
        this.permanentEffectsDisplay.setCameraManager(cameraManager);
        this.permanentEffectsDisplay.setHUDContainer(this.hudRenderer.getHUDContainer());
    }

    setRoom(room: any): void {
        this.statsOverlay.setRoom(room);
        this.cheatMenu.setRoom(room);
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
        this.playerSessionId = sessionId;
        this.currentPlayerHeroId = null; // Reset hero ID when session changes
        this.statsOverlay.setPlayerSessionId(sessionId);
        this.damageTakenOverlay.setPlayerSessionId(sessionId);
        this.damageDealtOverlay.setPlayerSessionId(sessionId);
    }

    showSuperMinionTriggerNotification(triggeredTeam: string): void {
        this.notificationOverlay.showSuperMinionTriggerNotification(triggeredTeam);
    }

    private checkSuperMinionTriggerNotifications(state: SharedGameState): void {
        // Check if blue super minions were just triggered
        if (state.blueSuperMinionsTriggered && !this.lastBlueSuperMinionsTriggered) {
            this.showSuperMinionTriggerNotification('blue');
        }
        
        // Check if red super minions were just triggered
        if (state.redSuperMinionsTriggered && !this.lastRedSuperMinionsTriggered) {
            this.showSuperMinionTriggerNotification('red');
        }
        
        // Update tracking variables
        this.lastBlueSuperMinionsTriggered = state.blueSuperMinionsTriggered;
        this.lastRedSuperMinionsTriggered = state.redSuperMinionsTriggered;
    }

    showStatsOverlay(state?: SharedGameState): void {
        if (state) {
            // Called with state parameter (from GameScene)
            this.statsOverlay.show(state);
        } else {
            // Called without state parameter (from InputHandler)
            if (this.lastState) {
                // this.lastState is already a SharedGameState when called from InputHandler
                this.statsOverlay.show(this.lastState);
            }
        }
    }

    hideStatsOverlay(): void {
        // Don't hide stats overlay if we're in post-game mode
        if (!this.isInPostGameMode()) {
            this.statsOverlay.hide();
        }
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
        const currentHeroId = this.getCurrentPlayerHeroId();
        this.damageTakenOverlay.processDamageEvents(state, currentHeroId);
        this.damageTakenOverlay.updateDamageEntries(state.gameTime, state);
    }

    hideDamageTakenOverlay(): void {
        this.damageTakenOverlay.hide();
    }

    updateDamageTakenTracking(state: SharedGameState): void {
        const currentHeroId = this.getCurrentPlayerHeroId();
        this.damageTakenOverlay.processDamageEvents(state, currentHeroId);
        
        if (this.damageTakenOverlay.isShowing()) {
            this.damageTakenOverlay.updateDamageEntries(state.gameTime, state);
        }
    }

    showDamageDealtOverlay(state: SharedGameState): void {
        this.damageDealtOverlay.show();
        // Process damage events and update the overlay immediately
        const currentHeroId = this.getCurrentPlayerHeroId();
        this.damageDealtOverlay.processDamageEvents(state, currentHeroId);
        this.damageDealtOverlay.updateDamageEntries(state.gameTime, state);
    }

    hideDamageDealtOverlay(): void {
        this.damageDealtOverlay.hide();
    }

    updateDamageDealtTracking(state: SharedGameState): void {
        const currentHeroId = this.getCurrentPlayerHeroId();
        this.damageDealtOverlay.processDamageEvents(state, currentHeroId);
        
        if (this.damageDealtOverlay.isShowing()) {
            this.damageDealtOverlay.updateDamageEntries(state.gameTime, state);
        }
    }

    updateHUD(state: SharedGameState, playerTeam: string | null = null, playerSessionId: ControllerId | null = null): void {
        // Store state for cursor updates
        this.lastState = state;
        
        // Process damage events BEFORE death detection to ensure final damage is captured
        this.updateDamageTakenTracking(state);
        this.updateDamageDealtTracking(state);
        
        // Check for death/respawn transitions
        this.checkDeathRespawnTransitions(state);
        
        // Check for super minion trigger notifications
        this.checkSuperMinionTriggerNotifications(state);
        
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

    // Cheat menu methods
    toggleCheatMenu(): void {
        this.cheatMenu.toggle();
    }

    showCheatMenu(): void {
        this.cheatMenu.show();
    }

    hideCheatMenu(): void {
        this.cheatMenu.hide();
    }

    isCheatMenuVisible(): boolean {
        return this.cheatMenu.isMenuVisible();
    }

    // Input handler methods (no state parameters)
    showDamageOverlays(): void {
        if (this.lastState) {
            const isPlayerDead = this.isPlayerDead(this.lastState);
            
            // Check if player is dead/respawning
            if (isPlayerDead) {
                this.showDeathSummary(this.lastState);
            } else {
                // Normal live damage overlays
                this.showDamageTakenOverlay(this.lastState);
                this.showDamageDealtOverlay(this.lastState);
            }
        }
    }

    hideDamageOverlays(): void {
        this.hideDamageTakenOverlay();
        this.hideDamageDealtOverlay();
    }

    /**
     * Shows death summary instead of live damage overlays
     */
    showDeathSummary(state: SharedGameState): void {
        this.damageTakenOverlay.show();
        this.damageDealtOverlay.show();
        // Update with death summary data
        this.damageTakenOverlay.updateDamageEntries(state.gameTime, state);
        this.damageDealtOverlay.updateDamageEntries(state.gameTime, state);
    }

    /**
     * Gets the current player hero ID for damage overlays
     */
    getCurrentPlayerHeroId(): string | null {
        return this.currentPlayerHeroId;
    }

    /**
     * Captures current damage history for death summary when player dies
     */
    captureDeathSummary(): void {
        if (this.lastState) {
            this.damageTakenOverlay.captureDeathSummary(this.lastState.gameTime);
            this.damageDealtOverlay.captureDeathSummary(this.lastState.gameTime);
        }
    }

    /**
     * Clears death summary when player respawns
     */
    clearDeathSummary(): void {
        this.damageTakenOverlay.clearDeathSummary();
        this.damageDealtOverlay.clearDeathSummary();
    }


    /**
     * Checks for death/respawn transitions and handles death summary capture
     */
    private checkDeathRespawnTransitions(state: SharedGameState): void {
        const isPlayerDead = this.isPlayerDead(state);
        
        // Check for death transition (alive -> dead)
        if (this.wasPlayerAlive && isPlayerDead) {
            // Player just died, capture death summary
            this.captureDeathSummary();
        }
        
        // Check for respawn transition (dead -> alive)
        if (!this.wasPlayerAlive && !isPlayerDead) {
            // Player just respawned, clear death summary
            this.clearDeathSummary();
        }
        
        // Update previous state
        this.wasPlayerAlive = !isPlayerDead;
    }

    /**
     * Gets the currently controlled hero for the player
     */
    private getCurrentPlayerHero(state: SharedGameState): any | null {
        if (!state || !this.playerSessionId) return null;
        
        // Always find the current hero (in case player switched heroes)
        for (const combatant of state.combatants.values()) {
            if (combatant.type === 'hero' && combatant.controller === this.playerSessionId) {
                // Update cached hero ID if it changed
                if (this.currentPlayerHeroId !== combatant.id) {
                    this.currentPlayerHeroId = combatant.id;
                    // Clear damage overlays when switching heroes to avoid confusion
                    this.hideDamageOverlays();
                    this.damageTakenOverlay.clear();
                    this.damageDealtOverlay.clear();
                }
                return combatant;
            }
        }
        
        // No hero found - player might be disconnected or dead
        this.currentPlayerHeroId = null;
        return null;
    }

    /**
     * Checks if the player is currently dead/respawning
     */
    private isPlayerDead(state: SharedGameState): boolean {
        const playerHero = this.getCurrentPlayerHero(state);
        if (!playerHero) return false;
        
        return playerHero.state === 'respawning' || playerHero.health <= 0;
    }

    private isInPostGameMode(): boolean {
        return this.lastState?.gamePhase === 'finished';
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
        this.cheatMenu.destroy();
    }
} 
