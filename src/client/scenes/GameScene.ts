import Phaser from 'phaser';
import { Client } from 'colyseus.js';
import { GameState } from '../../server/schema/GameState';
import { CLIENT_CONFIG } from '../../ClientConfig';
import { SharedGameState } from '../../shared/types/GameStateTypes';
import { convertToSharedGameState } from '../../shared/utils/StateConverter';
import { EntityManager } from '../entity/EntityManager';
import { AnimationManager } from '../animation/AnimationManager';
import { UIManager } from '../ui/UIManager';
import { PathRenderer } from '../PathRenderer';
import { CameraManager } from '../CameraManager';
import { GameObjectFactory } from '../GameObjectFactory';
import { hexToColorString } from '../utils/ColorUtils';
import { IconManager } from '../utils/IconManager';
import { ControllerId, CombatantId, isHeroCombatant } from '../../shared/types/CombatantTypes';
import { GameplayConfig } from '../../server/config/ConfigProvider';
import { LoadingScreen } from '../ui/LoadingScreen';
import { ConnectionManager } from '../ConnectionManager';
import { DebugOverlay } from '../ui/DebugOverlay';
import { InputHandler } from '../InputHandler';

export class GameScene extends Phaser.Scene {
    private client!: Client;
    private room: any;
    private gameplayConfig: GameplayConfig | null; // Deserialized gameplay configuration
    private uiComponentsInitialized: boolean = false; // Track if UI components have been initialized
    private entityManager!: EntityManager;
    private animationManager!: AnimationManager;
    private uiManager!: UIManager;
    private pathRenderer!: PathRenderer;
    private cameraManager!: CameraManager;
    private gameObjectFactory!: GameObjectFactory;
    private processedAttackEvents: Set<string> = new Set();
    private processedDamageEvents: Set<string> = new Set();
    private lastState: GameState|null = null
    private playerTeam: string | null = null;
    private playerSessionId: ControllerId | null = null;
    // Input-related properties removed - InputHandler is now the single source of truth for all input
    private isRestarting: boolean = false;
    private isReturningToLobby: boolean = false;
    private abilityRangeDisplay: Phaser.GameObjects.Graphics | null = null;
    private coordinateGrid: Phaser.GameObjects.Graphics | null = null;
    private coordinatesDebugPanel: Phaser.GameObjects.Text | null = null;
    private gridLabels: Phaser.GameObjects.Text[] = [];
    private screenGrid: Phaser.GameObjects.Graphics | null = null;
    private screenGridLabels: Phaser.GameObjects.Text[] = [];
    
    // New component-based architecture
    private loadingScreen!: LoadingScreen;
    private connectionManager!: ConnectionManager;
    private debugOverlay!: DebugOverlay;
    private inputHandler!: InputHandler;

    constructor() {
        super({ key: 'GameScene' });
        this.gameplayConfig = null; // Will be loaded from server
    }

    preload() {
        // No assets needed for basic circles
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
            this.gameObjectFactory.createText(300, 300, 'Failed to connect to server', {
                fontSize: CLIENT_CONFIG.UI.FONTS.ERROR,
                color: hexToColorString(CLIENT_CONFIG.UI.COLORS.ERROR)
            }, CLIENT_CONFIG.RENDER_DEPTH.GAME_UI).setOrigin(0.5);
        }
    }

    private async initializeGame(): Promise<void> {
        // Hide loading screen
        this.loadingScreen.hide();
        
        // Initialize core managers
        this.entityManager = new EntityManager(this);
        this.animationManager = new AnimationManager(this);
        this.cameraManager = new CameraManager(this);
        
        // Set up manager relationships
        this.entityManager.setCameraManager(this.cameraManager);
        this.cameraManager.setEntityManager(this.entityManager);
        this.gameObjectFactory.setCameraManager(this.cameraManager);
        
        // Set player session ID in managers
        this.entityManager.setPlayerSessionId(this.playerSessionId!);
        this.cameraManager.setPlayerSessionId(this.playerSessionId!);
        
        // Initialize debug overlay
        this.debugOverlay = new DebugOverlay(this, this.gameObjectFactory);
        this.debugOverlay.initialize();
        
        // Initialize input handler - this is the single source of truth for all input
        this.inputHandler = new InputHandler(this, this.room);
        this.inputHandler.setupHandlers();
        
        // Create ability range display
        this.abilityRangeDisplay = this.gameObjectFactory.createGraphics(0, 0, CLIENT_CONFIG.RENDER_DEPTH.ABILITY_INDICATORS);
        this.abilityRangeDisplay.setVisible(false);
        
        // Set up remaining handlers
        this.setupVisibilityHandlers();
        
        console.log('Game initialization complete');
    }

    update() {
        if (!this.room || !this.room.state) return;
        
        // Update debug overlay
        if (this.debugOverlay) {
            const pointer = this.input.activePointer;
            this.debugOverlay.update(pointer);
        }
        
        // Update ability range display position if visible
        if (this.abilityRangeDisplay && this.abilityRangeDisplay.visible) {
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
            
            // Track recent attackers if the player was the target
            if (this.playerSessionId) {
                const targetEntity = state.combatants.get(event.targetId);
                const isPlayerTarget = !!(targetEntity && isHeroCombatant(targetEntity) && targetEntity.controller === this.playerSessionId);
                
                if (isPlayerTarget) {
                    // Track the attacker as a recent attacker
                    this.entityManager.trackRecentAttacker(event.sourceId, event.timestamp);
                }
            }
            
            // Animate damage target (color flash)
            this.animateDamageTarget(event.targetId, event.sourceId);
        });
    }

    private animateDamageTarget(combatantId: CombatantId, sourceId?: CombatantId) {
        const combatantGraphics = this.entityManager.getEntityGraphics(combatantId);
        
        if (combatantGraphics) {
            // Check if player is involved in this attack (either as attacker or target)
            const isPlayerInvolved = this.isPlayerInvolvedInAttack(combatantId, sourceId);
            
            this.animationManager.animateDamageTarget(combatantId, combatantGraphics, isPlayerInvolved);
        }
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

    private updateHUD(state: SharedGameState) {
        // Delegate HUD updates to the UIManager
        this.uiManager.updateHUD(state, this.playerTeam, this.playerSessionId);
    }

    private initializeUIComponents() {
        // Initialize UI components now that we have the gameplay config
        this.uiManager = new UIManager(this, this.gameplayConfig, (rewardId: string) => {
            this.handleRewardChosen(rewardId);
        });
        this.pathRenderer = new PathRenderer(this, this.gameplayConfig);
        
        // Set HUD camera for UI components
        this.uiManager.setHUDCamera(this.cameraManager.getHUDCamera());
        this.uiManager.setCameraManager(this.cameraManager);
        this.uiManager.setRoom(this.room);
        
        // Set camera manager for path renderer
        this.pathRenderer.setCameraManager(this.cameraManager);
        
        // Create path highlight from corner to corner
        this.pathRenderer.createPathHighlight();
        
        // Create spawn indicators
        this.createSpawnIndicators();
        
        // Create HUD
        this.uiManager.createHUD();
        
        // Set up InputHandler dependencies now that UI is initialized
        this.inputHandler.setDependencies(this.gameplayConfig, this.uiManager);
    }

    private processStateChange(colyseusState: GameState) {
        this.lastState = colyseusState      
        
        const sharedState = convertToSharedGameState(colyseusState);
        
        // Track the player's team when they spawn
        this.updatePlayerTeam(sharedState);
        
        this.updateCombatantEntities(sharedState);
        this.processAttackEvents(sharedState);
        this.processDamageEvents(sharedState);
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
    }

    public onPointerUp(pointer: Phaser.Input.Pointer): void {
        // Hide ability range display
        this.hideAbilityRangeDisplay();
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


    /**
     * Calculates the cast range for abilities
     */
    private calculateCastRange(hero: any): number {
        // All abilities use their configured range (which includes level scaling)
        return hero.ability.range;
    }


    /**
     * Gets the appropriate color for the ability range display based on ability cooldown status
     */
    private getAbilityRangeDisplayColor(hero: any): number {
        if (!this.lastState) return CLIENT_CONFIG.HUD.ABILITY_BAR.COOLDOWN_COLOR;
        
        const currentTime = this.lastState.gameTime;
        const ability = hero.ability as any;
        
        // If lastUsedTime is 0, the ability hasn't been used yet, so it's ready immediately
        let isAbilityReady = false;
        if (ability.lastUsedTime === 0) {
            isAbilityReady = true;
        } else {
            const timeSinceLastUse = currentTime - ability.lastUsedTime;
            isAbilityReady = timeSinceLastUse >= ability.cooldown;
        }
        
        if (isAbilityReady) {
            return CLIENT_CONFIG.HUD.ABILITY_BAR.READY_COLOR; // Light purple when ready
        } else {
            return CLIENT_CONFIG.HUD.ABILITY_BAR.COOLDOWN_COLOR; // Darker purple when on cooldown
        }
    }

    /**
     * Hides the ability range display
     */
    private hideAbilityRangeDisplay(): void {
        if (this.abilityRangeDisplay) {
            this.abilityRangeDisplay.setVisible(false);
        }
    }

    /**
     * Updates the ability range display with targeting circle following mouse position (clamped to range)
     */
    private updateAbilityRangeDisplayWithMouse(): void {
        if (!this.abilityRangeDisplay || !this.lastState) return;

        // Find the current player's hero
        const sharedState = convertToSharedGameState(this.lastState);
        let currentHero: any = null;
        
        for (const combatant of sharedState.combatants.values()) {
            if (combatant.type === 'hero' && combatant.controller === this.playerSessionId) {
                currentHero = combatant;
                break;
            }
        }
        
        // Hide ability range display if player is respawning or not a supported ability type
        if (!currentHero || 
            currentHero.state === 'respawning' ||
            (currentHero.ability.type !== 'default' && currentHero.ability.type !== 'hookshot' && currentHero.ability.type !== 'mercenary' && currentHero.ability.type !== 'pyromancer' && currentHero.ability.type !== 'sniper' && currentHero.ability.type !== 'thorndive')) {
            this.hideAbilityRangeDisplay();
            return;
        }

        // Calculate cast range based on ability type
        let castRange: number;
        if (currentHero.ability.type === 'mercenary') {
            // Mercenary is a self-buff ability, show a very small range circle
            castRange = 15; // Very small circle to indicate self-buff
        } else {
            castRange = this.calculateCastRange(currentHero);
        }
        
        // Determine color based on ability cooldown status
        const rangeColor = this.getAbilityRangeDisplayColor(currentHero);
        
        // Clear and draw the ability range circle centered on the hero
        this.abilityRangeDisplay.clear();
        this.abilityRangeDisplay.lineStyle(2, rangeColor, 0.6);
        this.abilityRangeDisplay.strokeCircle(currentHero.x, currentHero.y, castRange);
        
        // Get mouse position and calculate target position (sticking to cast range if beyond)
        const mouseWorldPos = this.screenToWorldCoordinates(this.input.activePointer.x, this.input.activePointer.y);
        const dx = mouseWorldPos.x - currentHero.x;
        const dy = mouseWorldPos.y - currentHero.y;
        const mouseDistance = Math.sqrt(dx * dx + dy * dy);
        
        let targetX: number, targetY: number;
        if (mouseDistance <= castRange) {
            // Mouse is within range, use mouse position
            targetX = mouseWorldPos.x;
            targetY = mouseWorldPos.y;
        } else {
            // Mouse is beyond range, stick to cast range boundary
            const directionX = dx / mouseDistance;
            const directionY = dy / mouseDistance;
            targetX = currentHero.x + directionX * castRange;
            targetY = currentHero.y + directionY * castRange;
        }
        
        // Draw targeting visual for abilities considering target position and ability type
        this.drawTargetingVisual(currentHero, targetX, targetY, rangeColor);
        
        this.abilityRangeDisplay.setVisible(true);
    }

    /**
     * Draws the appropriate targeting visual for any ability at the target location
     */
    private drawTargetingVisual(hero: any, targetX: number, targetY: number, color: number): void {
        if (hero.ability.type === 'mercenary') {
            // Mercenary is a self-buff ability, don't show targeting visual
            return;
        } else if (hero.ability.type === 'thorndive') {
            // For thorndive, draw targeting circle with landing radius
            const targetingRadius = (hero.ability as any).landingRadius;
            this.drawTargetingCircle(targetX, targetY, targetingRadius, color);
        } else if (hero.ability.type === 'pyromancer') {
            // For pyromancer, draw targeting circle with fireball radius
            const targetingRadius = (hero.ability as any).fireballRadius;
            this.drawTargetingCircle(targetX, targetY, targetingRadius, color);
        } else {
            // For all other abilities, draw a targeting arrow
            this.drawTargetingArrow(hero, targetX, targetY, color);
        }
    }

    /**
     * Draws a targeting circle at the specified location
     */
    private drawTargetingCircle(targetX: number, targetY: number, radius: number, color: number): void {
        // Draw targeting circle at target location
        this.abilityRangeDisplay!.lineStyle(1, color, 0.3);
        this.abilityRangeDisplay!.strokeCircle(targetX, targetY, radius);
        this.abilityRangeDisplay!.fillStyle(color, 0.1);
        this.abilityRangeDisplay!.fillCircle(targetX, targetY, radius);
    }

    /**
     * Draws a targeting arrow showing the direction the ability will fire
     */
    private drawTargetingArrow(hero: any, targetX: number, targetY: number, color: number): void {
        
        // Calculate direction from hero to target
        const dx = targetX - hero.x;
        const dy = targetY - hero.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance === 0) return; // Avoid division by zero
        
        // Normalize direction
        const directionX = dx / distance;
        const directionY = dy / distance;
        
        // Calculate arrow positions
        const arrowLength = 25; // Length of the arrow
        const arrowHeadSize = 8; // Size of the arrow head
        const lineWidth = 3;
        
        // Start arrow slightly away from hero center
        const arrowStartX = hero.x + directionX * 20;
        const arrowStartY = hero.y + directionY * 20;
        
        // Calculate arrow end position
        const arrowEndX = arrowStartX + directionX * arrowLength;
        const arrowEndY = arrowStartY + directionY * arrowLength;
        
        // Draw the main arrow line
        this.abilityRangeDisplay!.lineStyle(lineWidth, color, 1.0);
        this.abilityRangeDisplay!.beginPath();
        this.abilityRangeDisplay!.moveTo(arrowStartX, arrowStartY);
        this.abilityRangeDisplay!.lineTo(arrowEndX, arrowEndY);
        this.abilityRangeDisplay!.strokePath();
        
        // Draw arrow head
        const headAngle = Math.PI / 4; // 45 degrees
        const head1X = arrowEndX - directionX * arrowHeadSize + directionY * arrowHeadSize * Math.tan(headAngle);
        const head1Y = arrowEndY - directionY * arrowHeadSize - directionX * arrowHeadSize * Math.tan(headAngle);
        const head2X = arrowEndX - directionX * arrowHeadSize - directionY * arrowHeadSize * Math.tan(headAngle);
        const head2Y = arrowEndY - directionY * arrowHeadSize + directionX * arrowHeadSize * Math.tan(headAngle);
        
        // Draw arrow head lines
        this.abilityRangeDisplay!.lineStyle(lineWidth, color, 1.0);
        this.abilityRangeDisplay!.beginPath();
        this.abilityRangeDisplay!.moveTo(arrowEndX, arrowEndY);
        this.abilityRangeDisplay!.lineTo(head1X, head1Y);
        this.abilityRangeDisplay!.strokePath();
        
        this.abilityRangeDisplay!.beginPath();
        this.abilityRangeDisplay!.moveTo(arrowEndX, arrowEndY);
        this.abilityRangeDisplay!.lineTo(head2X, head2Y);
        this.abilityRangeDisplay!.strokePath();
    }


    

    

    




    /**
     * Creates the coordinate grid overlay
     */
    private createCoordinateGrid(): void {
        if (!this.coordinateGrid) return;
        
        this.coordinateGrid.clear();
        this.coordinateGrid.lineStyle(1, 0xffffff, 0.3); // White lines with 30% opacity
        
        // Draw vertical lines every 100 units
        for (let x = 0; x <= CLIENT_CONFIG.MAP_WIDTH; x += 100) {
            this.coordinateGrid.beginPath();
            this.coordinateGrid.moveTo(x, 0);
            this.coordinateGrid.lineTo(x, CLIENT_CONFIG.MAP_HEIGHT);
            this.coordinateGrid.strokePath();
        }
        
        // Draw horizontal lines every 100 units
        for (let y = 0; y <= CLIENT_CONFIG.MAP_HEIGHT; y += 100) {
            this.coordinateGrid.beginPath();
            this.coordinateGrid.moveTo(0, y);
            this.coordinateGrid.lineTo(CLIENT_CONFIG.MAP_WIDTH, y);
            this.coordinateGrid.strokePath();
        }
        
        // Create grid labels
        this.createGridLabels();
    }

    /**
     * Creates labels for grid lines at the edges of the screen
     */
    private createGridLabels(): void {
        // Clear existing labels
        this.gridLabels.forEach(label => label.destroy());
        this.gridLabels = [];
        
        // Create labels for vertical lines (X coordinates) at the top and bottom
        for (let x = 0; x <= CLIENT_CONFIG.MAP_WIDTH; x += 100) {
            // Top label - positioned in world coordinates
            const topLabel = this.gameObjectFactory.createText(x, 5, x.toString(), {
                fontSize: '10px',
                color: hexToColorString(0xffffff),
                fontFamily: CLIENT_CONFIG.UI.FONTS.DEFAULT_FAMILY
            }, CLIENT_CONFIG.RENDER_DEPTH.BACKGROUND).setOrigin(0.5, 0);
            this.gridLabels.push(topLabel);
            
            // Bottom label - positioned in world coordinates
            const bottomLabel = this.gameObjectFactory.createText(x, CLIENT_CONFIG.MAP_HEIGHT - 5, x.toString(), {
                fontSize: '10px',
                color: hexToColorString(0xffffff),
                fontFamily: CLIENT_CONFIG.UI.FONTS.DEFAULT_FAMILY
            }, CLIENT_CONFIG.RENDER_DEPTH.BACKGROUND).setOrigin(0.5, 1);
            this.gridLabels.push(bottomLabel);
        }
        
        // Create labels for horizontal lines (Y coordinates) at the left and right
        for (let y = 0; y <= CLIENT_CONFIG.MAP_HEIGHT; y += 100) {
            // Left label - positioned in world coordinates
            const leftLabel = this.gameObjectFactory.createText(5, y, y.toString(), {
                fontSize: '10px',
                color: hexToColorString(0xffffff),
                fontFamily: CLIENT_CONFIG.UI.FONTS.DEFAULT_FAMILY
            }, CLIENT_CONFIG.RENDER_DEPTH.BACKGROUND).setOrigin(0, 0.5);
            this.gridLabels.push(leftLabel);
            
            // Right label - positioned in world coordinates
            const rightLabel = this.gameObjectFactory.createText(CLIENT_CONFIG.MAP_WIDTH - 5, y, y.toString(), {
                fontSize: '10px',
                color: hexToColorString(0xffffff),
                fontFamily: CLIENT_CONFIG.UI.FONTS.DEFAULT_FAMILY
            }, CLIENT_CONFIG.RENDER_DEPTH.BACKGROUND).setOrigin(1, 0.5);
            this.gridLabels.push(rightLabel);
        }
    }

    /**
     * Creates screen coordinate grid overlay
     */
    private createScreenGrid(): void {
        if (!this.screenGrid) return;
        
        this.screenGrid.clear();
        this.screenGrid.lineStyle(1, 0xff0000, 0.5); // Red lines with 50% opacity
        
        // Draw vertical lines every 100 screen pixels
        for (let x = 0; x <= CLIENT_CONFIG.GAME_CANVAS_WIDTH; x += 100) {
            this.screenGrid.beginPath();
            this.screenGrid.moveTo(x, 0);
            this.screenGrid.lineTo(x, CLIENT_CONFIG.GAME_CANVAS_HEIGHT);
            this.screenGrid.strokePath();
        }
        
        // Draw horizontal lines every 100 screen pixels
        for (let y = 0; y <= CLIENT_CONFIG.GAME_CANVAS_HEIGHT; y += 100) {
            this.screenGrid.beginPath();
            this.screenGrid.moveTo(0, y);
            this.screenGrid.lineTo(CLIENT_CONFIG.GAME_CANVAS_WIDTH, y);
            this.screenGrid.strokePath();
        }
        
        // Create screen grid labels
        this.createScreenGridLabels();
    }

    /**
     * Creates labels for screen grid lines
     */
    private createScreenGridLabels(): void {
        // Clear existing labels
        this.screenGridLabels.forEach(label => label.destroy());
        this.screenGridLabels = [];
        
        // Create labels for vertical lines (X coordinates) at the top and bottom
        for (let x = 0; x <= CLIENT_CONFIG.GAME_CANVAS_WIDTH; x += 100) {
            // Top label - positioned in screen coordinates
            const topLabel = this.gameObjectFactory.createText(x, 5, x.toString(), {
                fontSize: '10px',
                color: hexToColorString(0xff0000),
                fontFamily: CLIENT_CONFIG.UI.FONTS.DEFAULT_FAMILY
            }, CLIENT_CONFIG.RENDER_DEPTH.GAME_UI).setOrigin(0.5, 0);
            this.screenGridLabels.push(topLabel);
            
            // Bottom label - positioned in screen coordinates
            const bottomLabel = this.gameObjectFactory.createText(x, CLIENT_CONFIG.GAME_CANVAS_HEIGHT - 5, x.toString(), {
                fontSize: '10px',
                color: hexToColorString(0xff0000),
                fontFamily: CLIENT_CONFIG.UI.FONTS.DEFAULT_FAMILY
            }, CLIENT_CONFIG.RENDER_DEPTH.GAME_UI).setOrigin(0.5, 1);
            this.screenGridLabels.push(bottomLabel);
        }
        
        // Create labels for horizontal lines (Y coordinates) at the left and right
        for (let y = 0; y <= CLIENT_CONFIG.GAME_CANVAS_HEIGHT; y += 100) {
            // Left label - positioned in screen coordinates
            const leftLabel = this.gameObjectFactory.createText(5, y, y.toString(), {
                fontSize: '10px',
                color: hexToColorString(0xff0000),
                fontFamily: CLIENT_CONFIG.UI.FONTS.DEFAULT_FAMILY
            }, CLIENT_CONFIG.RENDER_DEPTH.GAME_UI).setOrigin(0, 0.5);
            this.screenGridLabels.push(leftLabel);
            
            // Right label - positioned in screen coordinates
            const rightLabel = this.gameObjectFactory.createText(CLIENT_CONFIG.GAME_CANVAS_WIDTH - 5, y, y.toString(), {
                fontSize: '10px',
                color: hexToColorString(0xff0000),
                fontFamily: CLIENT_CONFIG.UI.FONTS.DEFAULT_FAMILY
            }, CLIENT_CONFIG.RENDER_DEPTH.GAME_UI).setOrigin(1, 0.5);
            this.screenGridLabels.push(rightLabel);
        }
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
            const text = this.gameObjectFactory.createText(position.x, position.y, `${index + 1}`, {
                fontSize: '12px',
                color: hexToColorString(CLIENT_CONFIG.TEAM_COLORS.BLUE),
                fontFamily: CLIENT_CONFIG.UI.FONTS.DEFAULT_FAMILY
            }, CLIENT_CONFIG.RENDER_DEPTH.BACKGROUND).setOrigin(0.5);
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
            const text = this.gameObjectFactory.createText(position.x, position.y, `${index + 1}`, {
                fontSize: '12px',
                color: hexToColorString(CLIENT_CONFIG.TEAM_COLORS.RED),
                fontFamily: CLIENT_CONFIG.UI.FONTS.DEFAULT_FAMILY
            }, CLIENT_CONFIG.RENDER_DEPTH.BACKGROUND).setOrigin(0.5);
        });
    }

    /**
     * Converts screen coordinates to world coordinates
     */
    private screenToWorldCoordinates(screenX: number, screenY: number): { x: number, y: number } {
        // Use the CameraManager's camera for coordinate conversion
        return this.cameraManager.camera.getWorldPoint(screenX, screenY);
    }

    /**
     * Updates the coordinates debug panel with coordinate information
     */
    private updateCoordinatesDebugPanel(pointer: Phaser.Input.Pointer): void {
        if (!this.coordinatesDebugPanel) return;

        const { WORLD_COORDINATE_GRID_ENABLED: worldEnabled, SCREEN_COORDINATE_GRID_ENABLED: screenEnabled } = CLIENT_CONFIG.DEBUG;
        
        if (!worldEnabled && !screenEnabled) {
            this.coordinatesDebugPanel.setVisible(false);
            return;
        }

        const lines = ['Coordinates Debug:'];
        
        if (worldEnabled) {
            const worldPos = this.cameraManager.camera.getWorldPoint(pointer.x, pointer.y);
            lines.push(`Mouse (World): (${Math.round(worldPos.x)}, ${Math.round(worldPos.y)})`);
            this.gridLabels.forEach(label => label.setVisible(true));
        } else {
            this.gridLabels.forEach(label => label.setVisible(false));
        }
        
        if (screenEnabled) {
            lines.push(`Mouse (Screen): (${Math.round(pointer.x)}, ${Math.round(pointer.y)})`);
            this.screenGridLabels.forEach(label => label.setVisible(true));
        } else {
            this.screenGridLabels.forEach(label => label.setVisible(false));
        }
        
        if (worldEnabled || screenEnabled) {
            const cameraOffset = this.cameraManager.getCameraOffset();
            lines.push(`Camera: (${Math.round(cameraOffset.x)}, ${Math.round(cameraOffset.y)})`);
        }

        this.coordinatesDebugPanel.setText(lines.join('\n'));
        this.coordinatesDebugPanel.setVisible(true);
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
        
        // Reset UI elements
        this.abilityRangeDisplay = null;
        this.coordinateGrid = null;
        this.coordinatesDebugPanel = null;
        this.screenGrid = null;
        
        // Clear arrays
        this.gridLabels = [];
        this.screenGridLabels = [];
    }

    /**
     * Called when scene is shut down - Phaser handles most cleanup automatically
     */
    shutdown() {
        // Reset cursor visibility when leaving game scene
        this.input.setDefaultCursor('default');
        
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
