import Phaser from 'phaser';
import { Client } from 'colyseus.js';
import { GameState } from '../../server/schema/GameState';
import { CLIENT_CONFIG } from '../../ClientConfig';
import { TextStyleHelper } from '../utils/TextStyleHelper';
import { getCanvasWidth, getCanvasHeight } from '../utils/CanvasSize';
import { SharedGameState } from '../../shared/types/GameStateTypes';
import { convertToSharedGameState } from '../../shared/utils/StateConverter';
import { EntityManager } from '../entity/EntityManager';
import { AnimationManager } from '../animation/AnimationManager';
import { UIManager } from '../ui/UIManager';
import { MapDecorationRenderer } from '../map/MapDecorationRenderer';
import { CameraManager } from '../CameraManager';
import { GameObjectFactory } from '../GameObjectFactory';
import { IconManager } from '../utils/IconManager';
import { ControllerId, CombatantId, isHeroCombatant } from '../../shared/types/CombatantTypes';
import { GameplayConfig } from '../../server/config/ConfigProvider';
import { LoadingScreen } from '../ui/LoadingScreen';
import { ConnectionManager } from '../ConnectionManager';
import { CoordinateDebugOverlay } from '../ui/CoordinateDebugOverlay';
import { InputHandler } from '../InputHandler';
import { TutorialManager } from '../tutorial';
import { DestinationMarker } from '../ui/DestinationMarker';
import { AbilityRangeIndicator } from '../ui/AbilityRangeIndicator';

export class GameScene extends Phaser.Scene {
    private client!: Client;
    private room: any;
    private gameplayConfig: GameplayConfig | null; // Deserialized gameplay configuration
    private uiComponentsInitialized: boolean = false; // Track if UI components have been initialized
    private entityManager!: EntityManager;
    private animationManager!: AnimationManager;
    private uiManager!: UIManager;
    private mapDecorationRenderer!: MapDecorationRenderer;
    private cameraManager!: CameraManager;
    private gameObjectFactory!: GameObjectFactory;
    private processedAttackEvents: Set<string> = new Set();
    private processedDamageEvents: Set<string> = new Set();
    private processedProjectileMissEvents: Set<string> = new Set();
    private lastState: GameState|null = null
    private playerTeam: string | null = null;
    private playerSessionId: ControllerId | null = null;
    // Input-related properties removed - InputHandler is now the single source of truth for all input
    private isRestarting: boolean = false;
    private isReturningToLobby: boolean = false;
    private abilityRangeIndicator: AbilityRangeIndicator | null = null;
    
    // Destination marker for MOBA controls
    private destinationMarker: DestinationMarker | null = null;
    
    // New component-based architecture
    private loadingScreen!: LoadingScreen;
    private connectionManager!: ConnectionManager;
    private coordinateDebugOverlay!: CoordinateDebugOverlay;
    private inputHandler!: InputHandler;
    private tutorialManager!: TutorialManager;

    constructor() {
        super({ key: 'GameScene' });
        this.gameplayConfig = null; // Will be loaded from server
    }

    preload() {
        // Load hero assets
        this.load.image('hero-base', '/assets/heroes/hero_base.png');
        this.load.image('hero-hookshot', '/assets/heroes/hero_hookshot.png');
        this.load.image('hero-mercenary', '/assets/heroes/hero_mercenary.png');
        this.load.image('hero-pyromancer', '/assets/heroes/hero_pyromancer.png');
        this.load.image('hero-sniper', '/assets/heroes/hero_sniper.png');
        this.load.image('hero-thorndive', '/assets/heroes/hero_thorndive.png');
        
        // Load minion assets
        this.load.image('minion-warrior', '/assets/minions/minion_warrior.png');
        this.load.image('minion-archer', '/assets/minions/minion_archer.png');
        this.load.image('super-minion-warrior', '/assets/minions/super_minion_warrior.png');
        this.load.image('super-minion-archer', '/assets/minions/super_minion_archer.png');
        
        // Load structure assets
        this.load.image('structure-cradle', '/assets/structures/structure_cradle.png');
        this.load.image('structure-turret', '/assets/structures/structure_tower.png');
        
        
        // Load respawn indicator image for respawning heroes
        this.load.image('respawn-indicator', '/assets/icons/respawn-indicator.png');
        
        // Load PNG stat icons
        this.load.image('icon_stat:health', '/assets/icons/stats/max_health.png');
        this.load.image('icon_stat:damage', '/assets/icons/stats/damage.png');
        this.load.image('icon_stat:attack_speed', '/assets/icons/stats/attack_speed.png');
        this.load.image('icon_stat:attack_range', '/assets/icons/stats/attack_range.png');
        this.load.image('icon_stat:move_speed', '/assets/icons/stats/move_speed.png');
        this.load.image('icon_stat:bullet_armor', '/assets/icons/stats/auto_attack_armor.png');
        this.load.image('icon_stat:ability_armor', '/assets/icons/stats/ability_armor.png');
        
        // Load PNG ability stat icons
        this.load.image('icon_ability_stat:strength', '/assets/icons/stats/ability_power.png');
        this.load.image('icon_ability_stat:duration', '/assets/icons/stats/ability_duration.png');
        this.load.image('icon_ability_stat:cooldown', '/assets/icons/stats/ability_cooldown.png');
        this.load.image('icon_ability_stat:range', '/assets/icons/stats/attack_range.png');
        this.load.image('icon_ability_stat:speed', '/assets/icons/stats/ability_projectile_speed.png');
        this.load.image('icon_ability_stat:mercenary_rage_speed', '/assets/icons/stats/ability_rage_move_speed.png');
        this.load.image('icon_ability_stat:pyromancer_radius', '/assets/icons/stats/ability_pyromancer_radius.png');
        
        // Load ability icons (PNG)
        this.load.image('icon_ability:default', '/assets/icons/default.png');
        this.load.image('icon_ability:thorndive', '/assets/icons/thorndive.png');
        this.load.image('icon_ability:pyromancer', '/assets/icons/pyromancer.png');
        this.load.image('icon_ability:hookshot', '/assets/icons/hookshot.png');
        this.load.image('icon_ability:mercenary', '/assets/icons/mercenary.png');
        this.load.image('icon_ability:sniper', '/assets/icons/sniper.png');
    }

    async create() {
        // Hide the default cursor
        this.input.setDefaultCursor('none');
        
        // Reset all state for fresh scene
        this.resetSceneState();
        
        // Load icons and pre-generate textures
        await IconManager.getInstance().loadIconsAndTextures(this);
        
        // Initialize basic components
        this.gameObjectFactory = new GameObjectFactory(this);
        this.loadingScreen = new LoadingScreen(this);
        
        // Show loading screen
        this.loadingScreen.show();
        
        // Initialize connection manager and connect to server
        this.connectionManager = new ConnectionManager();
        
        try {
            // Check if we have lobby data from lobby
            const lobbyData = (this.scene.settings.data as any)?.lobbyData;
            const playerLobbyId = (this.scene.settings.data as any)?.playerLobbyId;
            
            if (lobbyData) {
                // Connect to game room with lobby data
                const { client, room, sessionId } = await this.connectionManager.connectToGame(lobbyData, playerLobbyId);
                this.client = client;
                this.room = room;
                this.playerSessionId = sessionId;
            } else {
                // Fallback: connect to lobby (shouldn't happen in normal flow)
                const { client, room, sessionId } = await this.connectionManager.connectToLobby();
                this.client = client;
                this.room = room;
                this.playerSessionId = sessionId;
            }
            
            // Set up room handlers
            this.setupRoomHandlers();
            
        } catch (error) {
            console.error('Failed to connect:', error);
            this.loadingScreen.hide();
            this.gameObjectFactory.createText(
                getCanvasWidth() / 2, 
                getCanvasHeight() / 2, 
                'Failed to connect to server', 
                TextStyleHelper.getStyle('ERROR'), 
                CLIENT_CONFIG.RENDER_DEPTH.GAME_UI
            ).setOrigin(0.5);
        }
    }

    private async initializeGame(): Promise<void> {
        // Hide loading screen
        this.loadingScreen.hide();
        
        // Initialize core managers
        this.entityManager = new EntityManager(this);
        this.animationManager = new AnimationManager(this);
        this.cameraManager = new CameraManager(this);
        
        // Set map size from gameplay config
        if (this.gameplayConfig && this.gameplayConfig.MAP_WIDTH && this.gameplayConfig.MAP_HEIGHT) {
            this.cameraManager.setMapSize(this.gameplayConfig.MAP_WIDTH, this.gameplayConfig.MAP_HEIGHT);
        }
        
        // Set up manager relationships
        this.entityManager.setCameraManager(this.cameraManager);
        this.entityManager.setAnimationManager(this.animationManager);
        this.cameraManager.setEntityManager(this.entityManager);
        this.gameObjectFactory.setCameraManager(this.cameraManager);
        this.animationManager.setCameraManager(this.cameraManager);
        
        // Create game map background - this covers only the playable area
        this.createGameMapBackground();
        
        // Set player session ID in managers
        this.entityManager.setPlayerSessionId(this.playerSessionId!);
        this.cameraManager.setPlayerSessionId(this.playerSessionId!);
        
        // Initialize coordinate debug overlay
        this.coordinateDebugOverlay = new CoordinateDebugOverlay(this, this.gameObjectFactory);
        this.coordinateDebugOverlay.setCameraManager(this.cameraManager);
        this.coordinateDebugOverlay.initialize();
        
        // Initialize tutorial manager
        this.tutorialManager = new TutorialManager(this, this.room, this.cameraManager);
        if (this.playerSessionId) {
            this.tutorialManager.setPlayerSessionId(this.playerSessionId);
        }
        
        // Initialize input handler - this is the single source of truth for all input
        this.inputHandler = new InputHandler(this, this.room);
        this.inputHandler.setupHandlers();
        
        const abilityGraphics = this.gameObjectFactory.createGraphics(
            0,
            0,
            CLIENT_CONFIG.RENDER_DEPTH.ABILITY_INDICATORS
        );
        abilityGraphics.setVisible(false);
        this.abilityRangeIndicator = new AbilityRangeIndicator(abilityGraphics);
        
        // Set up remaining handlers
        this.setupVisibilityHandlers();
        
        console.log('Game initialization complete');
    }

    update() {
        if (!this.room || !this.room.state) return;
        
        // Update tutorial manager
        if (this.tutorialManager && this.lastState) {
            const sharedState = convertToSharedGameState(this.lastState);
            this.tutorialManager.update(sharedState);
        }
        
        // Update coordinate debug overlay
        if (this.coordinateDebugOverlay) {
            const pointer = this.input.activePointer;
            this.coordinateDebugOverlay.update(pointer);
        }
        
        // Update ability range display position if visible
        if (this.abilityRangeIndicator?.isVisible() && this.lastState) {
            this.updateAbilityRangeDisplayWithMouse();
        }
        
        // Update input handling
        if (this.inputHandler) {
            this.inputHandler.update();
        }
        
        // Update cursor for smooth mouse tracking
        if (this.uiManager && this.lastState) {
            this.uiManager.updateCursorOnly(this.playerSessionId, this.lastState.gameTime);
        }

        this.syncAutoAttackRingDimForAbilityAiming();
    }

    private syncAutoAttackRingDimForAbilityAiming(): void {
        if (!this.entityManager) return;
        const dim = !!(this.abilityRangeIndicator?.isVisible());
        const changed = this.entityManager.setDimPlayerAutoAttackRingForAbilityAiming(dim);
        if (changed && this.lastState) {
            this.updateCombatantEntities(convertToSharedGameState(this.lastState));
        }
    }

    private updateCombatantEntities(state: SharedGameState) {
        // Delegate combatant entity updates to the EntityManager
        this.entityManager.updateCombatantEntities(state);
    }

    private processAttackEvents(state: SharedGameState) {
        state.attackEvents.forEach(event => {
            const eventKey = `${event.sourceId}-${event.targetId}-${event.timestamp}`;
            
            // Skip if we've already processed this event
            if (this.processedAttackEvents.has(eventKey)) return;
            
            this.processedAttackEvents.add(eventKey);
            
            // Prevent unbounded growth - clear if too large
            if (this.processedAttackEvents.size > 1000) {
                this.processedAttackEvents.clear();
            }
            
            // Trigger targeting line flash
            this.entityManager.triggerTargetingLineFlash(event.sourceId, event.targetId);
        });
    }

    private processDamageEvents(state: SharedGameState) {
        state.damageEvents.forEach(event => {
            const eventKey = `${event.sourceId}-${event.targetId}-${event.timestamp}`;
            
            // Skip if we've already processed this event
            if (this.processedDamageEvents.has(eventKey)) return;
            
            this.processedDamageEvents.add(eventKey);
            
            // Prevent unbounded growth - clear if too large
            if (this.processedDamageEvents.size > 1000) {
                this.processedDamageEvents.clear();
            }
            
            // Track recent attackers if the player was the target
            if (this.playerSessionId) {
                const targetEntity = state.combatants.get(event.targetId);
                const isPlayerTarget = !!(targetEntity && isHeroCombatant(targetEntity) && targetEntity.controller === this.playerSessionId);
                
                if (isPlayerTarget) {
                    // Track the attacker as a recent attacker
                    this.entityManager.trackRecentAttacker(event.sourceId, event.timestamp);
                    
                    // Trigger camera shake when player takes damage
                    this.cameraManager.triggerShake();
                    
                    // Trigger red flash effect when player takes damage
                    this.cameraManager.triggerRedFlash();
                }
            }
            
            // Animate damage target (color flash)
            this.animateDamageTarget(event.targetId, event.sourceId);
        });
    }

    private processProjectileMissEvents(state: SharedGameState) {
        state.projectileMissEvents.forEach(event => {
            const eventKey = `${event.projectileId}-${event.timestamp}`;
            
            // Skip if we've already processed this event
            if (this.processedProjectileMissEvents.has(eventKey)) return;
            
            this.processedProjectileMissEvents.add(eventKey);
            
            // Prevent unbounded growth - clear if too large
            if (this.processedProjectileMissEvents.size > 1000) {
                this.processedProjectileMissEvents.clear();
            }
            
            // Determine the correct color using the same logic as projectile rendering
            let teamColor: 'blue' | 'red' | 'player' = event.team as 'blue' | 'red';
            
            // Check if projectile owner is the current player (same logic as EntityRenderer.renderProjectile)
            if (this.playerSessionId && event.ownerId) {
                const owner = state.combatants.get(event.ownerId);
                if (owner && owner.type === 'hero' && owner.controller === this.playerSessionId) {
                    teamColor = 'player';
                }
            }
            
            // Trigger the miss effect
            this.animationManager.createProjectileMissEffect(
                event.x, 
                event.y, 
                teamColor
            );
        });
    }

    private animateDamageTarget(combatantId: CombatantId, sourceId?: CombatantId) {
        const combatantGraphics = this.entityManager.getEntityGraphics(combatantId);
        
        if (combatantGraphics) {
            // Check if player is involved in this attack (either as attacker or target)
            const isPlayerInvolved = this.isPlayerInvolvedInAttack(combatantId, sourceId);
            
            this.animationManager.animateDamageTarget(combatantId, combatantGraphics, isPlayerInvolved);
            
            // Add hit marker only if player is the attacker (dealing damage), not the target
            // combatantId is the target, sourceId is the attacker
            if (this.isPlayerAttacking(combatantId, sourceId) && this.lastState) {
                const sharedState = convertToSharedGameState(this.lastState);
                const target = sharedState.combatants.get(combatantId);
                
                if (target) {
                    // Determine damage type from the damage event
                    const damageType = this.getDamageTypeFromEvent(combatantId, sourceId);
                    
                    // Create hit marker at target location (where the hit occurred)
                    this.animationManager.createHitMarker(target.x, target.y, damageType);
                }
            }
        }
    }
    
    /**
     * Determines the damage type (auto-attack vs ability) from damage events
     */
    private getDamageTypeFromEvent(targetId: CombatantId, sourceId?: CombatantId): 'auto-attack' | 'ability' {
        if (!this.lastState || !sourceId) return 'auto-attack';
        
        const sharedState = convertToSharedGameState(this.lastState);
        
        // Look for recent damage events involving these combatants
        const recentEvents = sharedState.damageEvents.filter(event => 
            event.sourceId === sourceId && event.targetId === targetId &&
            event.timestamp >= sharedState.gameTime - 100 // Within last 100ms
        );
        
        if (recentEvents.length > 0) {
            const latestEvent = recentEvents[recentEvents.length - 1];
            return latestEvent.damageSource as 'auto-attack' | 'ability';
        }
        
        return 'auto-attack'; // Default fallback
    }
    
    /**
     * Helper method to check if the player is involved in an attack
     */
    private isPlayerInvolvedInAttack(targetId: CombatantId, sourceId?: CombatantId): boolean {
        if (!this.playerSessionId) return false;
        
        // Check if player is the target
        const targetEntity = this.lastState ? convertToSharedGameState(this.lastState).combatants.get(targetId) : null;
        const isPlayerTarget = !!(targetEntity && isHeroCombatant(targetEntity) && targetEntity.controller === this.playerSessionId);
        
        // Check if player is the source
        const sourceEntity = sourceId && this.lastState ? convertToSharedGameState(this.lastState).combatants.get(sourceId) : null;
        const isPlayerSource = !!(sourceEntity && isHeroCombatant(sourceEntity) && sourceEntity.controller === this.playerSessionId);
        
        return isPlayerTarget || isPlayerSource;
    }
    
    /**
     * Helper method to check if the player is the attacker (dealing damage)
     */
    private isPlayerAttacking(targetId: CombatantId, sourceId?: CombatantId): boolean {
        if (!this.playerSessionId || !sourceId) return false;
        
        // Check if player is the source (attacker)
        const sourceEntity = this.lastState ? convertToSharedGameState(this.lastState).combatants.get(sourceId) : null;
        return !!(sourceEntity && isHeroCombatant(sourceEntity) && sourceEntity.controller === this.playerSessionId);
    }

    private updateHUD(state: SharedGameState) {
        // Delegate HUD updates to the UIManager
        this.uiManager.updateHUD(state, this.playerTeam, this.playerSessionId);
    }

    private initializeUIComponents() {
        // Initialize UI components now that we have the gameplay config
        this.uiManager = new UIManager(this, this.gameplayConfig, (rewardId: string) => {
            this.handleRewardChosen(rewardId);
        });
        this.mapDecorationRenderer = new MapDecorationRenderer(this, this.gameplayConfig);
        
        // Set HUD camera for UI components
        this.uiManager.setHUDCamera(this.cameraManager.getHUDCamera());
        this.uiManager.setCameraManager(this.cameraManager);
        this.uiManager.setRoom(this.room);
        
        // Set camera manager for map decoration renderer
        this.mapDecorationRenderer.setCameraManager(this.cameraManager);
        
        // Create map decorations (paths, stones, etc.)
        this.mapDecorationRenderer.createPathHighlight();
        
        // Create spawn indicators
        this.createSpawnIndicators();
        
        // Create HUD
        this.uiManager.createHUD();
        
        // Set up InputHandler dependencies now that UI is initialized
        this.inputHandler.setDependencies(this.gameplayConfig, this.uiManager, this.cameraManager);
        this.inputHandler.setTutorialManager(this.tutorialManager);
        
        // Link UIManager to InputHandler for control mode updates
        this.uiManager.setInputHandler(this.inputHandler);
        
        // Link UIManager to TutorialManager for hiding objectives during respawn
        this.uiManager.setTutorialManager(this.tutorialManager);
        
        // Show tutorial if specified in config
        if (this.gameplayConfig?.tutorial) {
            this.tutorialManager.startTutorial(this.gameplayConfig.tutorial);
        }
    }

    private processStateChange(colyseusState: GameState) {
        this.lastState = colyseusState      
        
        const sharedState = convertToSharedGameState(colyseusState);
        
        // Track the player's team when they spawn
        this.updatePlayerTeam(sharedState);
        
        this.updateCombatantEntities(sharedState);
        this.processAttackEvents(sharedState);
        this.processDamageEvents(sharedState);
        this.processProjectileMissEvents(sharedState);
        this.updateHUD(sharedState);
        
        // Update camera to follow player
        this.cameraManager.updateCamera(sharedState);
    }

    private setupRoomHandlers() {
        this.room.onStateChange((colyseusState: GameState) => {
            // Skip processing if we're in the middle of a restart
            if (this.isRestarting) {
                return;
            }
            
            // Deserialize gameplay config from room state
            if (colyseusState.gameplayConfig && !this.gameplayConfig) {
                this.gameplayConfig = JSON.parse(colyseusState.gameplayConfig);
                console.log('Deserialized gameplay config from room state');
                console.log('Gameplay config structure:', Object.keys(this.gameplayConfig));
                
                // Initialize the game now that we have the config
                this.initializeGame().then(() => {
                    console.log('Game initialization completed');
                }).catch((error) => {
                    console.error('Game initialization failed:', error);
                });
            }
            
            // Initialize UI components if we have config but haven't initialized yet
            if (this.gameplayConfig && !this.uiComponentsInitialized) {
                console.log('Initializing UI components...');
                this.initializeUIComponents();
                this.uiComponentsInitialized = true;
                console.log('UI components initialized');
            }
            
            // Skip processing if UI components aren't ready yet
            if (!this.uiComponentsInitialized) {
                return;
            }
            
            this.processStateChange(colyseusState);
        });
        
        this.room.onMessage('gameRestarted', () => {
            console.log('Game restarted by server');
            
            // Set restarting flag to prevent state processing during cleanup
            this.isRestarting = true;
            
            // Reset client-side state for the new game
            this.playerTeam = null;
            this.lastState = null;
            this.processedAttackEvents.clear();
            this.processedDamageEvents.clear();
            this.processedProjectileMissEvents.clear();
            // Input state cleanup handled by InputHandler
            this.uiComponentsInitialized = false; // Reset UI initialization flag
            
            // Clear all entities and animations
            this.entityManager.clearAllEntities();
            this.animationManager.clearAllAnimations();
            
            // Stop all tweens to ensure no animations are left running
            this.tweens.killAll();
            
            // Clear UI
            this.uiManager.clearHUD();
            this.uiManager.createHUD();
            
            // Hide victory screen if it's showing
            this.uiManager.hideVictoryScreen();
            
            // Clear the restarting flag after a short delay to allow cleanup to complete
            setTimeout(() => {
                this.isRestarting = false;
            }, 100);
        });
        
        this.room.onMessage('returnToLobby', () => {
            console.log('Returning to lobby...');
            this.isReturningToLobby = true;
            // Start fresh lobby scene
            this.scene.start('LobbyScene');
        });

        this.room.onLeave((code: number) => {
            console.log('Left room with code:', code);
            // Don't restart if we're already transitioning to lobby
            if (!this.isReturningToLobby) {
                // When disconnected unexpectedly, restart the entire scene for a fresh game
                this.scene.restart();
            }
        });
    }

    private updatePlayerTeam(state: SharedGameState): void {
        // Find the hero that belongs to this client by controller (session ID)
        if (!this.playerSessionId || this.playerTeam) return;
        
        state.combatants.forEach((combatant) => {
            if (isHeroCombatant(combatant) && combatant.controller === this.playerSessionId) {
                this.playerTeam = combatant.team;
                console.log(`Player team determined: ${this.playerTeam} (session: ${this.playerSessionId})`);
            }
        });

        // Update UI manager with player session ID
        this.uiManager.setPlayerSessionId(this.playerSessionId);
    }


    /**
     * Callback methods for InputHandler
     * These are called by InputHandler to handle UI updates (ability range display, etc.)
     */
    public onPointerDown(pointer: Phaser.Input.Pointer): void {
        // Show ability range display for hookshot ability
        this.updateAbilityRangeDisplayWithMouse();
        this.syncAutoAttackRingDimForAbilityAiming();
    }

    public onPointerUp(pointer: Phaser.Input.Pointer): void {
        // Hide ability range display
        this.hideAbilityRangeDisplay();
        this.syncAutoAttackRingDimForAbilityAiming();
    }


    private setupVisibilityHandlers(): void {
        // Handle visibility change events
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                // Browser tab became visible again, force cleanup of texts
                this.entityManager.forceCleanupTexts();
            }
        });
    }


    private updateAbilityRangeDisplayWithMouse(): void {
        if (!this.abilityRangeIndicator || !this.lastState) return;
        this.abilityRangeIndicator.update({
            gameState: this.lastState,
            playerSessionId: this.playerSessionId,
            pointerScreenX: this.input.activePointer.x,
            pointerScreenY: this.input.activePointer.y,
            screenToWorld: (sx, sy) => this.screenToWorldCoordinates(sx, sy),
            getEntityGraphics: (id) => this.entityManager.getEntityGraphics(id),
        });
    }

    private hideAbilityRangeDisplay(): void {
        this.abilityRangeIndicator?.hide();
    }

    /**
     * Creates visual indicators at spawn locations
     */
    private createSpawnIndicators(): void {
        // Check if spawn indicators are enabled in config
        if (!CLIENT_CONFIG.DEBUG.SPAWN_LOCATION_INDICATORS_ENABLED) {
            return;
        }

        // Create spawn indicators for blue team using hardcoded positions
        this.gameplayConfig.HERO_SPAWN_POSITIONS.BLUE.forEach((position: any, index: number) => {
            const indicator = this.gameObjectFactory.createGraphics(position.x, position.y, CLIENT_CONFIG.RENDER_DEPTH.BACKGROUND);
            
            // Draw a small circle with team color
            indicator.lineStyle(2, CLIENT_CONFIG.TEAM_COLORS.BLUE, 0.6);
            indicator.fillStyle(CLIENT_CONFIG.TEAM_COLORS.BLUE, 0.2);
            indicator.fillCircle(0, 0, 8);
            indicator.strokeCircle(0, 0, 8);
            
            // Add spawn number text
            const text = this.gameObjectFactory.createText(position.x, position.y, `${index + 1}`, 
                TextStyleHelper.getStyleWithColor('BODY_TINY', CLIENT_CONFIG.TEAM_COLORS.BLUE), 
                CLIENT_CONFIG.RENDER_DEPTH.BACKGROUND).setOrigin(0.5);
        });
        
        // Create spawn indicators for red team using hardcoded positions
        this.gameplayConfig.HERO_SPAWN_POSITIONS.RED.forEach((position: any, index: number) => {
            const indicator = this.gameObjectFactory.createGraphics(position.x, position.y, CLIENT_CONFIG.RENDER_DEPTH.BACKGROUND);
            
            // Draw a small circle with team color
            indicator.lineStyle(2, CLIENT_CONFIG.TEAM_COLORS.RED, 0.6);
            indicator.fillStyle(CLIENT_CONFIG.TEAM_COLORS.RED, 0.2);
            indicator.fillCircle(0, 0, 8);
            indicator.strokeCircle(0, 0, 8);
            
            // Add spawn number text
            const text = this.gameObjectFactory.createText(position.x, position.y, `${index + 1}`, 
                TextStyleHelper.getStyleWithColor('BODY_TINY', CLIENT_CONFIG.TEAM_COLORS.RED), 
                CLIENT_CONFIG.RENDER_DEPTH.BACKGROUND).setOrigin(0.5);
        });
    }

    /**
     * Converts screen coordinates to world coordinates
     */
    private screenToWorldCoordinates(screenX: number, screenY: number): { x: number, y: number } {
        // Use the CameraManager's camera for coordinate conversion
        return this.cameraManager.camera.getWorldPoint(screenX, screenY);
    }



    private handleRewardChosen(rewardId: string): void {
        this.room.send('choose_reward', { rewardId });
    }

    /**
     * Reset all scene state for fresh initialization
     */
    private resetSceneState() {
        // Reset UI initialization flag
        this.uiComponentsInitialized = false;
        
        // Reset game state
        this.gameplayConfig = null;
        this.lastState = null;
        this.playerTeam = null;
        this.playerSessionId = null;
        
        // Reset flags
        this.isRestarting = false;
        this.isReturningToLobby = false;
        
        // Clear event tracking
        this.processedAttackEvents.clear();
        this.processedDamageEvents.clear();
        this.processedProjectileMissEvents.clear();
        
        // Reset UI elements
        this.abilityRangeIndicator = null;
    }

    /**
     * Creates a background for the game map area only (not the entire viewport)
     * This provides visual distinction between the playable area and viewport background
     */
    private createGameMapBackground(): void {
        // Create a graphics object for the game map background using GameObjectFactory
        const mapBackground = this.gameObjectFactory.createGraphics(0, 0, CLIENT_CONFIG.RENDER_DEPTH.SCENE_BACKGROUND);
        
        // Fill the entire game map area with the game map background color
        mapBackground.fillStyle(CLIENT_CONFIG.UI.BACKGROUND.GAME_MAP);
        const mapWidth = this.gameplayConfig?.MAP_WIDTH || CLIENT_CONFIG.MAP_WIDTH;
        const mapHeight = this.gameplayConfig?.MAP_HEIGHT || CLIENT_CONFIG.MAP_HEIGHT;
        mapBackground.fillRect(0, 0, mapWidth, mapHeight);
    }

    /**
     * Updates the destination marker for MOBA controls
     */
    updateDestinationMarker(x: number, y: number, color: number): void {
        // Create destination marker if it doesn't exist
        if (!this.destinationMarker) {
            this.destinationMarker = new DestinationMarker(this, this.cameraManager);
        }
        
        // Create new marker (automatically cleans up any existing animation)
        this.destinationMarker.createMarker(x, y, color);
    }

    /**
     * Clears the destination marker
     */
    clearDestinationMarker(): void {
        if (this.destinationMarker) {
            this.destinationMarker.destroy();
        }
    }

    /**
     * Called when scene is shut down - Phaser handles most cleanup automatically
     */
    shutdown() {
        // Reset cursor visibility when leaving game scene
        this.input.setDefaultCursor('default');
        
        // Clear destination marker
        this.clearDestinationMarker();
        
        // Only clean up custom resources that Phaser doesn't handle automatically
        if (this.entityManager) {
            this.entityManager.destroy();
        }
        if (this.animationManager) {
            this.animationManager.destroy();
        }
        if (this.uiManager) {
            this.uiManager.destroy();
        }
        // Other components don't have destroy methods or are handled by Phaser
    }
} 
