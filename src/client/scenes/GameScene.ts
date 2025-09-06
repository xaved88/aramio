import Phaser from 'phaser';
import { Client } from 'colyseus.js';
import { GameState } from '../../server/schema/GameState';
import { CLIENT_CONFIG, GAMEPLAY_CONFIG } from '../../Config';
import { type SharedGameState } from '../../shared/types/GameStateTypes';
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

export class GameScene extends Phaser.Scene {
    private client!: Client;
    private room: any;
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
    private spaceKeyPressed: boolean = false;
    private moveTarget: { x: number, y: number } | null = null;
    private isClickHeld: boolean = false;
    private clickDownPosition: { x: number, y: number } | null = null;
    private isRestarting: boolean = false;
    private rangeIndicator: Phaser.GameObjects.Graphics | null = null;
    private coordinateGrid: Phaser.GameObjects.Graphics | null = null;
    private coordinatesDebugPanel: Phaser.GameObjects.Text | null = null;
    private gridLabels: Phaser.GameObjects.Text[] = [];
    private screenGrid: Phaser.GameObjects.Graphics | null = null;
    private screenGridLabels: Phaser.GameObjects.Text[] = [];

    constructor() {
        super({ key: 'GameScene' });
    }

    preload() {
        // No assets needed for basic circles
    }

    async create() {
        // Load icons and pre-generate textures
        await IconManager.getInstance().loadIconsAndTextures(this);
        
        // In development, connect to the Colyseus server on port 2567
        // In production, connect to the same host (since server serves both)
        let serverUrl: string;
        if (window.location.hostname === 'localhost' && window.location.port === '3000') {
            // Development: Vite dev server on 3000, but Colyseus server on 2567
            serverUrl = 'ws://localhost:2567';
        } else {
            // Production: same host and port
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            serverUrl = `${protocol}//${window.location.host}`;
        }
        this.client = new Client(serverUrl);
        
        // Initialize managers
        this.entityManager = new EntityManager(this);
        this.animationManager = new AnimationManager(this);
        this.uiManager = new UIManager(this, (rewardId: string) => {
            this.handleRewardChosen(rewardId);
        });
        this.pathRenderer = new PathRenderer(this);
        this.cameraManager = new CameraManager(this);
        this.gameObjectFactory = new GameObjectFactory(this);
        
        // Set HUD camera for UI components
        this.uiManager.setHUDCamera(this.cameraManager.getHUDCamera());
        this.uiManager.setCameraManager(this.cameraManager);
        
        // Set camera manager for entity manager
        this.entityManager.setCameraManager(this.cameraManager);
        
        // Set entity manager for camera manager
        this.cameraManager.setEntityManager(this.entityManager);
        
        // Set camera manager for path renderer
        this.pathRenderer.setCameraManager(this.cameraManager);
        
        // Set camera manager for game object factory
        this.gameObjectFactory.setCameraManager(this.cameraManager);
        
        // Create range indicator
        this.rangeIndicator = this.gameObjectFactory.createGraphics(0, 0, CLIENT_CONFIG.RENDER_DEPTH.ABILITY_INDICATORS);
        this.rangeIndicator.setVisible(false);
        
        // Create world coordinate grid overlay
        this.coordinateGrid = this.gameObjectFactory.createGraphics(0, 0, CLIENT_CONFIG.RENDER_DEPTH.BACKGROUND);
        this.coordinateGrid.setVisible(CLIENT_CONFIG.DEBUG.WORLD_COORDINATE_GRID_ENABLED);
        
        // Create screen coordinate grid overlay (rendered at UI depth so it stays on screen)
        this.screenGrid = this.gameObjectFactory.createGraphics(0, 0, CLIENT_CONFIG.RENDER_DEPTH.GAME_UI);
        this.screenGrid.setVisible(CLIENT_CONFIG.DEBUG.SCREEN_COORDINATE_GRID_ENABLED);
        
        // Create coordinates debug panel (positioned halfway up screen)
        this.coordinatesDebugPanel = this.gameObjectFactory.createText(10, CLIENT_CONFIG.GAME_CANVAS_HEIGHT / 2, '', {
            fontSize: '16px',
            color: hexToColorString(0xffffff),
            fontFamily: CLIENT_CONFIG.UI.FONTS.DEFAULT_FAMILY
        }, CLIENT_CONFIG.RENDER_DEPTH.GAME_UI).setOrigin(0, 0);
        this.coordinatesDebugPanel.setVisible(CLIENT_CONFIG.DEBUG.WORLD_COORDINATE_GRID_ENABLED || CLIENT_CONFIG.DEBUG.SCREEN_COORDINATE_GRID_ENABLED);
        
        // Create the grids if enabled
        if (CLIENT_CONFIG.DEBUG.WORLD_COORDINATE_GRID_ENABLED) {
            this.createCoordinateGrid();
        }
        if (CLIENT_CONFIG.DEBUG.SCREEN_COORDINATE_GRID_ENABLED) {
            this.createScreenGrid();
        }
        
        // Create spawn indicators
        this.createSpawnIndicators();
        
        // Create path highlight from corner to corner
        this.pathRenderer.createPathHighlight();
        
        try {
            this.room = await this.client.joinOrCreate('game');
            console.log('Connected to server');
            
            // Store the session ID for this client
            this.playerSessionId = this.room.sessionId;
            console.log(`Client session ID: ${this.playerSessionId}`);
            
            // Set the player session ID in the entity manager
            this.entityManager.setPlayerSessionId(this.playerSessionId);
            
            // Set the player session ID in the camera manager
            this.cameraManager.setPlayerSessionId(this.playerSessionId);
            
            this.setupRoomHandlers();
            this.setupInputHandlers();
            this.setupVisibilityHandlers();
            
            this.uiManager.createHUD();
            
        } catch (error) {
            console.error('Failed to connect:', error);
            this.gameObjectFactory.createText(300, 300, 'Failed to connect to server', {
                fontSize: CLIENT_CONFIG.UI.FONTS.ERROR,
                color: hexToColorString(CLIENT_CONFIG.UI.COLORS.ERROR)
            }, CLIENT_CONFIG.RENDER_DEPTH.GAME_UI).setOrigin(0.5);
        }
    }

    update() {
        if (!this.room || !this.room.state) return;
        
        // Get current mouse position for coordinate display
        const pointer = this.input.activePointer;
        
        // Update range indicator position if visible
        if (this.rangeIndicator && this.rangeIndicator.visible) {
            this.updateRangeIndicatorPosition();
        }
        
        // Update coordinates debug panel
        this.updateCoordinatesDebugPanel(pointer);
        
        // Update screen grid visibility
        if (this.screenGrid) {
            this.screenGrid.setVisible(CLIENT_CONFIG.DEBUG.SCREEN_COORDINATE_GRID_ENABLED);
        }
        
        
        if (CLIENT_CONFIG.CONTROLS.SCHEME === 'A') {
            // Control scheme A: point to move (original behavior)
            const pointer = this.input.activePointer;
            const worldPos = this.screenToWorldCoordinates(pointer.x, pointer.y);
            this.room.send('move', { 
                targetX: worldPos.x, 
                targetY: worldPos.y 
            });
        } else if (CLIENT_CONFIG.CONTROLS.SCHEME === 'B') {
            // Control scheme B: send continuous movement to target if we have one
            if (this.moveTarget) {
                this.room.send('move', {
                    targetX: this.moveTarget.x,
                    targetY: this.moveTarget.y
                });
            }
        } else if (CLIENT_CONFIG.CONTROLS.SCHEME === 'C') {
            // Control scheme C: point to move when not clicking, hold position when clicking
            if (!this.isClickHeld) {
                const pointer = this.input.activePointer;
                const worldPos = this.screenToWorldCoordinates(pointer.x, pointer.y);
                this.room.send('move', { 
                    targetX: worldPos.x, 
                    targetY: worldPos.y 
                });
            } else if (this.moveTarget) {
                // When click is held, keep moving to the click-down position
                this.room.send('move', {
                    targetX: this.moveTarget.x,
                    targetY: this.moveTarget.y
                });
            }
        } else if (CLIENT_CONFIG.CONTROLS.SCHEME === 'D') {
            // Control scheme D: point to move when not clicking, stop moving when clicking
            if (!this.isClickHeld) {
                const pointer = this.input.activePointer;
                const worldPos = this.screenToWorldCoordinates(pointer.x, pointer.y);
                this.room.send('move', { 
                    targetX: worldPos.x, 
                    targetY: worldPos.y 
                });
            }
            // When click is held, don't send any move commands (stop moving)
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



    private setupRoomHandlers() {
        this.room.onStateChange((colyseusState: GameState) => {
            // Skip processing if we're in the middle of a restart
            if (this.isRestarting) {
                return;
            }
            
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
            this.moveTarget = null;
            this.clickDownPosition = null;
            this.isClickHeld = false;
            
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
        
        this.room.onLeave((code: number) => {
            console.log('Left room with code:', code);
            // When disconnected, restart the entire scene for a fresh game
            this.scene.restart();
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

    private setupInputHandlers(): void {
        if (CLIENT_CONFIG.CONTROLS.SCHEME === 'A') {
            // Scheme A: point to move, click to use ability
            this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
                if (this.room) {
                    const worldPos = this.screenToWorldCoordinates(pointer.x, pointer.y);
                    this.room.send('useAbility', {
                        x: worldPos.x,
                        y: worldPos.y
                    });
                }
            });
        } else if (CLIENT_CONFIG.CONTROLS.SCHEME === 'B') {
            // Scheme B: click to move, space+point to use ability
            this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
                if (this.room && !this.spaceKeyPressed) {
                    // Click without space: set move target
                    const worldPos = this.screenToWorldCoordinates(pointer.x, pointer.y);
                    this.moveTarget = { x: worldPos.x, y: worldPos.y };
                }
            });
        } else if (CLIENT_CONFIG.CONTROLS.SCHEME === 'C') {
            // Scheme C: click down to stop at position, click up to use ability
            this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
                if (this.room) {
                    this.isClickHeld = true;
                    const worldPos = this.screenToWorldCoordinates(pointer.x, pointer.y);
                    this.moveTarget = { x: worldPos.x, y: worldPos.y };
                    this.clickDownPosition = { x: worldPos.x, y: worldPos.y };
                    
                    // Show range indicator for hookshot ability
                    this.showRangeIndicator(worldPos.x, worldPos.y);
                }
            });

            this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
                if (this.room && this.isClickHeld) {
                    // Hide range indicator
                    this.hideRangeIndicator();
                    
                    // Use ability at release position (converted to world coordinates)
                    const worldPos = this.screenToWorldCoordinates(pointer.x, pointer.y);
                    this.room.send('useAbility', {
                        x: worldPos.x,
                        y: worldPos.y
                    });
                    this.isClickHeld = false;
                    this.moveTarget = null; // Clear move target to resume point-to-move
                    this.clickDownPosition = null; // Clear click-down position
                }
            });
        } else if (CLIENT_CONFIG.CONTROLS.SCHEME === 'D') {
            // Scheme D: click down to stop moving, click up to use ability
            this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
                if (this.room) {
                    this.isClickHeld = true;
                    // Don't set moveTarget - we want to stop moving, not move to this position
                }
            });

            this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
                if (this.room && this.isClickHeld) {
                    // Use ability at release position
                    const worldPos = this.screenToWorldCoordinates(pointer.x, pointer.y);
                    this.room.send('useAbility', {
                        x: worldPos.x,
                        y: worldPos.y
                    });
                    this.isClickHeld = false;
                }
            });
        }

        // Space key handlers for control scheme B
        this.input.keyboard?.on('keydown-SPACE', () => {
            this.spaceKeyPressed = true;
            // Fire ability at current pointer position when space is pressed
            if (CLIENT_CONFIG.CONTROLS.SCHEME === 'B' && this.room) {
                const pointer = this.input.activePointer;
                const worldPos = this.screenToWorldCoordinates(pointer.x, pointer.y);
                this.room.send('useAbility', {
                    x: worldPos.x,
                    y: worldPos.y
                });
            }
        });

        this.input.keyboard?.on('keyup-SPACE', () => {
            this.spaceKeyPressed = false;
        });

        // S key handler for hero cycling
        this.input.keyboard?.on('keydown-S', (event: KeyboardEvent) => {
            if (this.room) {
                this.room.send('toggleHero');
            }
        });


        // Tab key handlers for stats overlay (hold to show)
        this.input.keyboard?.on('keydown-TAB', (event: KeyboardEvent) => {
            event.preventDefault(); // Prevent default tab behavior
            if (this.lastState) {
                const sharedState = convertToSharedGameState(this.lastState);
                this.uiManager.showStatsOverlay(sharedState);
            }
        });

        this.input.keyboard?.on('keyup-TAB', () => {
            this.uiManager.hideStatsOverlay();
        });
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
     * Shows the range indicator for hookshot ability
     */
    private showRangeIndicator(x: number, y: number): void {
        if (!this.rangeIndicator || !this.lastState) return;
        
        // Find the current player's hero
        const sharedState = convertToSharedGameState(this.lastState);
        let currentHero: any = null;
        
        for (const combatant of sharedState.combatants.values()) {
            if (combatant.type === 'hero' && combatant.controller === this.playerSessionId) {
                currentHero = combatant;
                break;
            }
        }
        
        // Don't show range indicator if player is respawning or not a supported ability type
        if (!currentHero || 
            currentHero.state === 'respawning' ||
            (currentHero.ability.type !== 'hookshot' && currentHero.ability.type !== 'mercenary' && currentHero.ability.type !== 'pyromancer' && currentHero.ability.type !== 'thorndive')) {
            return;
        }
        
        // Calculate cast range based on ability type
        let castRange: number;
        if (currentHero.ability.type === 'hookshot') {
            castRange = this.calculateHookshotCastRange(currentHero);
        } else if (currentHero.ability.type === 'mercenary') {
            castRange = this.calculateMercenaryRageRange(currentHero);
        } else if (currentHero.ability.type === 'pyromancer') {
            castRange = this.calculatePyromancerCastRange(currentHero);
        } else if (currentHero.ability.type === 'thorndive') {
            castRange = this.calculateThorndiveCastRange(currentHero);
        } else {
            return;
        }
        
        // Determine color based on ability cooldown status
        const rangeColor = this.getRangeIndicatorColor(currentHero);
        
        // Clear and draw the range indicator
        this.rangeIndicator.clear();
        this.rangeIndicator.lineStyle(2, rangeColor, 0.6);
        this.rangeIndicator.strokeCircle(currentHero.x, currentHero.y, castRange);
        
        // Draw AOE circles for thorndive and pyromancer
        if (currentHero.ability.type === 'thorndive') {
            this.drawThorndiveAOECircle(currentHero, x, y, rangeColor);
        } else if (currentHero.ability.type === 'pyromancer') {
            this.drawPyromancerAOECircle(currentHero, x, y, rangeColor);
        }
        
        this.rangeIndicator.setVisible(true);
    }

    /**
     * Calculates the cast range for hookshot based on speed and duration
     */
    private calculateHookshotCastRange(hero: any): number {
        const config = GAMEPLAY_CONFIG.COMBAT.ABILITIES.hookshot;
        const heroLevel = hero.level || 1;
        
        // Calculate scaled speed (base speed + 10% per level)
        const speedMultiplier = 1 + (config.SPEED_BOOST_PERCENTAGE * (heroLevel - 1));
        const scaledSpeed = config.SPEED * speedMultiplier;
        
        // Calculate range: speed (pixels/second) * duration (seconds)
        const durationInSeconds = config.DURATION_MS / 1000;
        const castRange = scaledSpeed * durationInSeconds;
        
        return castRange;
    }

    /**
     * Calculates the rage attack range for mercenary ability (the reduced range during rage)
     */
    private calculateMercenaryRageRange(hero: any): number {
        const config = GAMEPLAY_CONFIG.COMBAT.ABILITIES.mercenary;
        // TODO - get this from the combatant ability not the config.
        
        // The mercenary ability reduces attack range to a fixed value during rage
        return config.RAGE_ATTACK_RADIUS;
    }

    /**
     * Calculates the cast range for pyromancer ability
     */
    private calculatePyromancerCastRange(hero: any): number {
        // Get the range directly from the hero's ability (which includes level scaling)
        return hero.ability.range;
    }

    /**
     * Calculates the cast range for thorndive ability
     */
    private calculateThorndiveCastRange(hero: any): number {
        // Get the range directly from the hero's ability (which includes level scaling)
        return hero.ability.range;
    }

    /**
     * Gets the appropriate color for the range indicator based on ability cooldown status
     */
    private getRangeIndicatorColor(hero: any): number {
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
     * Hides the range indicator
     */
    private hideRangeIndicator(): void {
        if (this.rangeIndicator) {
            this.rangeIndicator.setVisible(false);
        }
    }

    /**
     * Updates the position of the range indicator based on the current player's hero position
     */
    private updateRangeIndicatorPosition(): void {
        if (!this.rangeIndicator || !this.lastState) return;

        // Find the current player's hero
        const sharedState = convertToSharedGameState(this.lastState);
        let currentHero: any = null;
        
        for (const combatant of sharedState.combatants.values()) {
            if (combatant.type === 'hero' && combatant.controller === this.playerSessionId) {
                currentHero = combatant;
                break;
            }
        }
        
        // Hide range indicator if player is respawning or not a supported ability type
        if (!currentHero || 
            currentHero.state === 'respawning' ||
            (currentHero.ability.type !== 'hookshot' && currentHero.ability.type !== 'mercenary' && currentHero.ability.type !== 'pyromancer' && currentHero.ability.type !== 'thorndive')) {
            this.hideRangeIndicator();
            return;
        }

        // Calculate cast range based on ability type
        let castRange: number;
        if (currentHero.ability.type === 'hookshot') {
            castRange = this.calculateHookshotCastRange(currentHero);
        } else if (currentHero.ability.type === 'mercenary') {
            castRange = this.calculateMercenaryRageRange(currentHero);
        } else if (currentHero.ability.type === 'pyromancer') {
            castRange = this.calculatePyromancerCastRange(currentHero);
        } else if (currentHero.ability.type === 'thorndive') {
            castRange = this.calculateThorndiveCastRange(currentHero);
        } else {
            this.hideRangeIndicator();
            return;
        }
        
        // Determine color based on ability cooldown status
        const rangeColor = this.getRangeIndicatorColor(currentHero);
        
        // Clear and draw the range indicator centered on the hero
        this.rangeIndicator.clear();
        this.rangeIndicator.lineStyle(2, rangeColor, 0.6);
        this.rangeIndicator.strokeCircle(currentHero.x, currentHero.y, castRange);
        
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
        
        // Draw AOE circles for thorndive and pyromancer at target position
        if (currentHero.ability.type === 'thorndive') {
            this.drawThorndiveAOECircle(currentHero, targetX, targetY, rangeColor);
        } else if (currentHero.ability.type === 'pyromancer') {
            this.drawPyromancerAOECircle(currentHero, targetX, targetY, rangeColor);
        }
        
        this.rangeIndicator.setVisible(true);
    }

    /**
     * Draws the AOE circle for thorndive ability at the target location
     */
    private drawThorndiveAOECircle(hero: any, targetX: number, targetY: number, color: number): void {
        // Get AOE radius from the hero's ability (which includes level scaling)
        const aoeRadius = (hero.ability as any).landingRadius || 70; // fallback to default if not available
        
        // Draw AOE circle at target location
        this.rangeIndicator!.lineStyle(1, color, 0.3);
        this.rangeIndicator!.strokeCircle(targetX, targetY, aoeRadius);
        
        // Fill with very light color
        this.rangeIndicator!.fillStyle(color, 0.1);
        this.rangeIndicator!.fillCircle(targetX, targetY, aoeRadius);
    }

    /**
     * Draws the AOE circle for pyromancer ability at the target location
     */
    private drawPyromancerAOECircle(hero: any, targetX: number, targetY: number, color: number): void {
        // Get AOE radius from the hero's ability (which includes level scaling)
        const aoeRadius = (hero.ability as any).radius || 20; // fallback to default if not available
        
        // Draw AOE circle at target location
        this.rangeIndicator!.lineStyle(1, color, 0.3);
        this.rangeIndicator!.strokeCircle(targetX, targetY, aoeRadius);
        
        // Fill with very light color
        this.rangeIndicator!.fillStyle(color, 0.1);
        this.rangeIndicator!.fillCircle(targetX, targetY, aoeRadius);
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
        GAMEPLAY_CONFIG.HERO_SPAWN_POSITIONS.BLUE.forEach((position, index) => {
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
        GAMEPLAY_CONFIG.HERO_SPAWN_POSITIONS.RED.forEach((position, index) => {
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
        return this.cameraManager.getWorldPoint(screenX, screenY);

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
     * Clean up when scene is destroyed
     */
    destroy() {
        if (this.entityManager) {
            this.entityManager.destroy();
        }
        if (this.animationManager) {
            this.animationManager.destroy();
        }
        if (this.uiManager) {
            this.uiManager.destroy();
        }
        // Clean up grid labels
        this.gridLabels.forEach(label => label.destroy());
        this.gridLabels = [];
        this.screenGridLabels.forEach(label => label.destroy());
        this.screenGridLabels = [];
    }
} 
