import Phaser from 'phaser';
import { CLIENT_CONFIG } from '../ClientConfig';
import { ControlMode, ControlModeStorage } from './utils/ControlModeStorage';

/**
 * SINGLE SOURCE OF TRUTH FOR ALL INPUT HANDLING
 * 
 * This class handles ALL input for the game. It is the only place where input events
 * are processed and converted to game commands. This centralized approach allows for:
 * - Easy addition of new input methods (touch, controller, etc.)
 * - Consistent input handling across the entire game
 * - Simple modification of control schemes
 * - Better testing and debugging of input logic
 * 
 * Control Schemes:
 * 1. Mouse-only: Point-to-move + Click-down-to-stop + Click-up-for-ability
 *    - Mouse not pressed: Move towards mouse pointer
 *    - Mouse pressed: Stop sending move events, show ability targeting
 *    - Mouse released: Fire ability at release position
 * 
 * 2. Keyboard + Mouse: WASD for movement + Click for ability
 *    - WASD: Directional movement (additive vectors)
 *    - Mouse click: Fire ability at click position
 * 
 * 3. MOBA: Right-click-to-move + Space/Left-click-to-target + Release-to-fire
 *    - Right-click: Set move target, hero continues until arrival
 *    - Space or Left-click: Enter targeting mode, show ability targeting
 *    - Release: Fire ability at current mouse position
 */
export class InputHandler {
    private scene: Phaser.Scene;
    private room: any;
    private isClickHeld: boolean = false;
    private clickDownPosition: { x: number; y: number } | null = null;
    
    // Dependencies for keyboard input handling
    private gameplayConfig: any = null;
    private uiManager: any = null;
    private cameraManager: any = null;

    // Control mode
    private controlMode: ControlMode = 'mouse';
    
    // Keyboard movement state
    private keyStates: {
        W: boolean;
        A: boolean;
        S: boolean;
        D: boolean;
    } = { W: false, A: false, S: false, D: false };
    
    private readonly KEYBOARD_MOVE_DISTANCE = 100;
    
    // MOBA mode state
    private moveTargetPosition: { x: number; y: number } | null = null;
    private isTargetingWithSpace: boolean = false;

    constructor(scene: Phaser.Scene, room: any) {
        this.scene = scene;
        this.room = room;
        this.controlMode = ControlModeStorage.getControlMode();
    }

    /**
     * Sets dependencies needed for keyboard input handling
     */
    setDependencies(gameplayConfig: any, uiManager: any, cameraManager?: any): void {
        this.gameplayConfig = gameplayConfig;
        this.uiManager = uiManager;
        this.cameraManager = cameraManager;
    }

    /**
     * Sets up all input event handlers
     * This is the ONLY place where input events should be registered
     */
    setupHandlers(): void {
        // Pointer down: Start ability targeting, stop movement (left click only)
        this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            // Only handle left mouse button (button 0)
            if (pointer.button === 0) {
                this.handlePointerDown(pointer);
            }
        });

        // Pointer up: Fire ability, resume movement (left click only)
        this.scene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
            // Only handle left mouse button (button 0)
            if (pointer.button === 0) {
                this.handlePointerUp(pointer);
            }
        });

        // Prevent right-click context menu
        this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            if (pointer.button === 2) { // Right mouse button
                pointer.event.preventDefault();
                // Handle right-click for MOBA mode
                if (this.controlMode === 'moba') {
                    this.handleRightClick(pointer);
                }
            }
        });

        // Keyboard input handlers
        this.setupKeyboardHandlers();
    }

    /**
     * Sets up all keyboard input handlers
     */
    private setupKeyboardHandlers(): void {
        // WASD for movement (keyboard mode only)
        this.setupWASDHandlers();
        
        // MOBA mode handlers
        this.setupMOBAHandlers();

        // H key handler for hero cycling (was S, moved due to WASD)
        this.scene.input.keyboard?.on('keydown-H', (event: KeyboardEvent) => {
            if (this.room) {
                this.room.send('toggleHero');
            }
        });

        // K key handler for debug kill (was D, moved due to WASD)
        this.scene.input.keyboard?.on('keydown-K', (event: KeyboardEvent) => {
            if (this.room && this.gameplayConfig?.DEBUG.CHEAT_KILL_PLAYER_ENABLED) {
                this.room.send('debugKill');
            }
        });

        // R key handler for instant respawn (was L, moved to more accessible key)
        this.scene.input.keyboard?.on('keydown-R', (event: KeyboardEvent) => {
            if (this.room && this.gameplayConfig?.DEBUG.CHEAT_INSTANT_RESPAWN_ENABLED) {
                this.room.send('instantRespawn');
            }
        });

        // U key handler for level up (keeping U)
        this.scene.input.keyboard?.on('keydown-U', (event: KeyboardEvent) => {
            if (this.room && this.gameplayConfig?.DEBUG.CHEAT_LEVEL_UP_ENABLED) {
                this.room.send('debugLevelUp');
            }
        });

        // Tab key handlers for stats overlay (hold to show)
        this.scene.input.keyboard?.on('keydown-TAB', (event: KeyboardEvent) => {
            event.preventDefault(); // Prevent default tab behavior
            if (this.uiManager) {
                this.uiManager.showStatsOverlay();
            }
        });

        this.scene.input.keyboard?.on('keyup-TAB', () => {
            if (this.uiManager) {
                this.uiManager.hideStatsOverlay();
            }
        });

        // Shift key handlers for damage overlay (hold to show)
        this.scene.input.keyboard?.on('keydown-SHIFT', (event: KeyboardEvent) => {
            event.preventDefault(); // Prevent default shift behavior
            if (this.uiManager) {
                this.uiManager.showDamageOverlays();
            }
        });

        this.scene.input.keyboard?.on('keyup-SHIFT', () => {
            if (this.uiManager) {
                this.uiManager.hideDamageOverlays();
            }
        });

        // Ctrl key handlers for cheat menu (hold to show)
        this.scene.input.keyboard?.on('keydown-CTRL', (event: KeyboardEvent) => {
            event.preventDefault(); // Prevent default behavior
            if (this.uiManager) {
                this.uiManager.showCheatMenu();
            }
        });

        this.scene.input.keyboard?.on('keyup-CTRL', (event: KeyboardEvent) => {
            event.preventDefault(); // Prevent default behavior
            if (this.uiManager) {
                this.uiManager.hideCheatMenu();
            }
        });

        // T key handler for tutorial toggle
        this.scene.input.keyboard?.on('keydown-T', (event: KeyboardEvent) => {
            if (this.uiManager) {
                this.uiManager.toggleTutorial();
            }
        });

        // ESC key handler for closing tutorial
        this.scene.input.keyboard?.on('keydown-ESC', (event: KeyboardEvent) => {
            if (this.uiManager && this.uiManager.isTutorialVisible()) {
                this.uiManager.hideTutorial();
            }
        });
    }

    /**
     * Sets up WASD key handlers for keyboard movement
     */
    private setupWASDHandlers(): void {
        // W key
        this.scene.input.keyboard?.on('keydown-W', () => {
            this.keyStates.W = true;
        });
        this.scene.input.keyboard?.on('keyup-W', () => {
            this.keyStates.W = false;
        });

        // A key
        this.scene.input.keyboard?.on('keydown-A', () => {
            this.keyStates.A = true;
        });
        this.scene.input.keyboard?.on('keyup-A', () => {
            this.keyStates.A = false;
        });

        // S key
        this.scene.input.keyboard?.on('keydown-S', () => {
            this.keyStates.S = true;
        });
        this.scene.input.keyboard?.on('keyup-S', () => {
            this.keyStates.S = false;
        });

        // D key
        this.scene.input.keyboard?.on('keydown-D', () => {
            this.keyStates.D = true;
        });
        this.scene.input.keyboard?.on('keyup-D', () => {
            this.keyStates.D = false;
        });
    }

    /**
     * Sets up MOBA control handlers
     */
    private setupMOBAHandlers(): void {
        // Space key for targeting mode
        this.scene.input.keyboard?.on('keydown-SPACE', () => {
            if (this.controlMode === 'moba') {
                this.handleSpaceDown();
            }
        });
        
        this.scene.input.keyboard?.on('keyup-SPACE', () => {
            if (this.controlMode === 'moba') {
                this.handleSpaceUp();
            }
        });
    }

    /**
     * Called every frame to handle continuous input (movement)
     * This is the ONLY place where movement commands should be sent
     */
    update(): void {
        // Don't send movement commands if tutorial is visible
        if (this.uiManager && this.uiManager.isTutorialVisible()) {
            return;
        }

        if (this.controlMode === 'mouse') {
            this.updateMouseMovement();
        } else if (this.controlMode === 'keyboard') {
            this.updateKeyboardMovement();
        } else if (this.controlMode === 'moba') {
            this.updateMOBAMovement();
        }
    }

    /**
     * Handles movement for mouse-only mode
     */
    private updateMouseMovement(): void {
        // Only send movement commands when not clicking (for ability targeting)
        if (!this.isClickHeld) {
            const pointer = this.scene.input.activePointer;
            const worldPos = this.screenToWorldCoordinates(pointer.x, pointer.y);
            this.room.send('move', {
                targetX: worldPos.x,
                targetY: worldPos.y
            });
        } else {
            // When clicking (isClickHeld = true), check if we should stop movement for sniper ability
            if (this.shouldStopMovementForSniper()) {
                // Send a stop command to prevent server from continuing movement
                this.sendStopCommand();
            }
        }
        // NOTE: The server (GameRoom.ts) has logic to replay the last move command for heroes that don't send
        // new move commands this frame. This enables the hero to continue moving toward the last target
        // position when the mouse is held down for ability targeting.
    }

    /**
     * Handles movement for keyboard mode
     */
    private updateKeyboardMovement(): void {
        // Calculate movement vector from WASD keys
        let moveX = 0;
        let moveY = 0;

        if (this.keyStates.W) moveY -= this.KEYBOARD_MOVE_DISTANCE;
        if (this.keyStates.S) moveY += this.KEYBOARD_MOVE_DISTANCE;
        if (this.keyStates.A) moveX -= this.KEYBOARD_MOVE_DISTANCE;
        if (this.keyStates.D) moveX += this.KEYBOARD_MOVE_DISTANCE;

        // Get current hero position
        const gameScene = this.scene as any;
        if (!gameScene.lastState) return;

        let heroX = 0;
        let heroY = 0;
        
        for (const combatant of gameScene.lastState.combatants.values()) {
            if (combatant.type === 'hero' && combatant.controller === gameScene.playerSessionId) {
                heroX = combatant.x;
                heroY = combatant.y;
                break;
            }
        }

        // Send move command relative to current position
        this.room.send('move', {
            targetX: heroX + moveX,
            targetY: heroY + moveY
        });
    }

    /**
     * Handles movement for MOBA mode
     */
    private updateMOBAMovement(): void {
        // Only send movement commands when there's a move target set
        if (this.moveTargetPosition) {
            // Check if we're close to the target
            const gameScene = this.scene as any;
            if (!gameScene.lastState) {
                return;
            }

            let heroX = 0;
            let heroY = 0;
            
            for (const combatant of gameScene.lastState.combatants.values()) {
                if (combatant.type === 'hero' && combatant.controller === gameScene.playerSessionId) {
                    heroX = combatant.x;
                    heroY = combatant.y;
                    break;
                }
            }

            const dx = this.moveTargetPosition.x - heroX;
            const dy = this.moveTargetPosition.y - heroY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // If we're close enough, stop moving
            if (distance < (this.gameplayConfig?.HERO_STOP_DISTANCE || 10)) {
                this.moveTargetPosition = null;
                this.hideDestinationMarker();
                return;
            }

            // Send move command to target position
            this.room.send('move', {
                targetX: this.moveTargetPosition.x,
                targetY: this.moveTargetPosition.y
            });
        }
    }

    /**
     * Handles pointer down events - starts ability targeting
     */
    private handlePointerDown(pointer: Phaser.Input.Pointer): void {
        // Don't handle input if tutorial is visible
        if (this.uiManager && this.uiManager.isTutorialVisible()) {
            return;
        }

        // In MOBA mode, left-click starts targeting mode
        if (this.controlMode === 'moba') {
            this.isClickHeld = true;
            this.isTargetingWithSpace = false; // This was triggered by mouse, not space
            const worldPos = this.screenToWorldCoordinates(pointer.x, pointer.y);
            this.clickDownPosition = { x: worldPos.x, y: worldPos.y };
            
            // Notify scene for UI updates (ability range display)
            this.notifyScenePointerDown(pointer);
            return;
        }

        // Original behavior for mouse and keyboard modes
        this.isClickHeld = true;
        const worldPos = this.screenToWorldCoordinates(pointer.x, pointer.y);
        this.clickDownPosition = { x: worldPos.x, y: worldPos.y };
        
        // Notify scene for UI updates (ability range display)
        this.notifyScenePointerDown(pointer);
    }

    /**
     * Handles pointer up events - fires ability
     */
    private handlePointerUp(pointer: Phaser.Input.Pointer): void {
        // Don't handle input if tutorial is visible
        if (this.uiManager && this.uiManager.isTutorialVisible()) {
            return;
        }

        if (this.controlMode === 'mouse') {
            // Mouse mode: ability on mouse up
            if (this.isClickHeld) {
                const worldPos = this.screenToWorldCoordinates(pointer.x, pointer.y);
                this.room.send('useAbility', {
                    x: worldPos.x,
                    y: worldPos.y
                });
                
                // Notify scene for UI updates (hide ability range display)
                this.notifyScenePointerUp(pointer);
            }
            
            this.isClickHeld = false;
            this.clickDownPosition = null;
        } else if (this.controlMode === 'keyboard') {
            // Keyboard mode: ability on mouse up (same UI behavior as mouse mode)
            if (this.isClickHeld) {
                const worldPos = this.screenToWorldCoordinates(pointer.x, pointer.y);
                this.room.send('useAbility', {
                    x: worldPos.x,
                    y: worldPos.y
                });
                
                // Notify scene for UI updates (hide ability range display)
                this.notifyScenePointerUp(pointer);
            }
            
            this.isClickHeld = false;
        } else if (this.controlMode === 'moba') {
            // MOBA mode: ability on mouse up (only if targeting was started with mouse)
            if (this.isClickHeld && !this.isTargetingWithSpace) {
                const worldPos = this.screenToWorldCoordinates(pointer.x, pointer.y);
                this.room.send('useAbility', {
                    x: worldPos.x,
                    y: worldPos.y
                });
                
                // Notify scene for UI updates (hide ability range display)
                this.notifyScenePointerUp(pointer);
            }
            
            // Only reset if this was mouse-triggered targeting
            if (!this.isTargetingWithSpace) {
                this.isClickHeld = false;
                this.clickDownPosition = null;
            }
        }
    }

    /**
     * Notifies the scene about pointer down for UI updates
     */
    private notifyScenePointerDown(pointer: Phaser.Input.Pointer): void {
        const gameScene = this.scene as any;
        if (gameScene.onPointerDown) {
            gameScene.onPointerDown(pointer);
        }
    }

    /**
     * Notifies the scene about pointer up for UI updates
     */
    private notifyScenePointerUp(pointer: Phaser.Input.Pointer): void {
        const gameScene = this.scene as any;
        if (gameScene.onPointerUp) {
            gameScene.onPointerUp(pointer);
        }
    }

    /**
     * Checks if the player is currently in ability targeting mode
     */
    isInAbilityTargetingMode(): boolean {
        return this.isClickHeld;
    }

    private screenToWorldCoordinates(screenX: number, screenY: number): { x: number; y: number } {
        const camera = this.scene.cameras.main;
        if (!camera) {
            console.warn('Camera not available for coordinate conversion');
            return { x: 0, y: 0 };
        }
        // Use Phaser's built-in coordinate conversion that properly accounts for zoom
        return camera.getWorldPoint(screenX, screenY);
    }

    /**
     * Checks if the current hero has the sniper ability and should stop movement
     */
    private shouldStopMovementForSniper(): boolean {
        const gameScene = this.scene as any;
        if (!gameScene.lastState) return false;
        
        // Find the current player's hero
        for (const combatant of gameScene.lastState.combatants.values()) {
            if (combatant.type === 'hero' && combatant.controller === gameScene.playerSessionId) {
                return combatant.ability && combatant.ability.type === 'sniper';
            }
        }
        
        return false;
    }

    /**
     * Sends a stop command to prevent server from continuing movement
     */
    private sendStopCommand(): void {
        const gameScene = this.scene as any;
        if (!gameScene.lastState) return;
        
        // Find the current player's hero position
        for (const combatant of gameScene.lastState.combatants.values()) {
            if (combatant.type === 'hero' && combatant.controller === gameScene.playerSessionId) {
                // Send move command to current position to stop movement
                this.room.send('move', {
                    targetX: combatant.x,
                    targetY: combatant.y
                });
                break;
            }
        }
    }

    /**
     * Sets the control mode and updates internal state
     */
    setControlMode(mode: ControlMode): void {
        this.controlMode = mode;
        
        // Reset keyboard state when switching modes
        if (mode === 'mouse') {
            this.keyStates = { W: false, A: false, S: false, D: false };
        }
        
        // Reset MOBA state when switching modes
        if (mode !== 'moba') {
            this.moveTargetPosition = null;
            this.isTargetingWithSpace = false;
            this.hideDestinationMarker();
        }
    }

    /**
     * Gets the current control mode
     */
    getControlMode(): ControlMode {
        return this.controlMode;
    }

    /**
     * Handles right-click for MOBA mode movement
     */
    private handleRightClick(pointer: Phaser.Input.Pointer): void {
        const worldPos = this.screenToWorldCoordinates(pointer.x, pointer.y);
        this.moveTargetPosition = { x: worldPos.x, y: worldPos.y };
        
        // Create or update destination marker
        this.updateDestinationMarker();
    }

    /**
     * Handles space key down for MOBA mode targeting
     */
    private handleSpaceDown(): void {
        this.isClickHeld = true;
        this.isTargetingWithSpace = true;
        
        // Get current mouse position for targeting
        const pointer = this.scene.input.activePointer;
        const worldPos = this.screenToWorldCoordinates(pointer.x, pointer.y);
        this.clickDownPosition = { x: worldPos.x, y: worldPos.y };
        
        // Notify scene for UI updates (ability range display)
        this.notifyScenePointerDown(pointer);
    }

    /**
     * Handles space key up for MOBA mode ability firing
     */
    private handleSpaceUp(): void {
        if (this.isClickHeld && this.isTargetingWithSpace) {
            // Get current mouse position for ability target
            const pointer = this.scene.input.activePointer;
            const worldPos = this.screenToWorldCoordinates(pointer.x, pointer.y);
            this.room.send('useAbility', {
                x: worldPos.x,
                y: worldPos.y
            });
            
            // Notify scene for UI updates (hide ability range display)
            this.notifyScenePointerUp(pointer);
        }
        
        this.isClickHeld = false;
        this.isTargetingWithSpace = false;
        this.clickDownPosition = null;
    }

    /**
     * Creates or updates the destination marker for MOBA mode
     */
    private updateDestinationMarker(): void {
        if (!this.moveTargetPosition) return;

        // Get the current player's hero color
        const gameScene = this.scene as any;
        if (!gameScene.lastState) return;

        let heroColor: number = CLIENT_CONFIG.SELF_COLORS.PRIMARY; // Default to purple for player hero
        
        // Find the player's hero to get the correct color
        for (const combatant of gameScene.lastState.combatants.values()) {
            if (combatant.type === 'hero' && combatant.controller === gameScene.playerSessionId) {
                // Check if this is the player's hero
                const isControlledByPlayer = combatant.controller === gameScene.playerSessionId;
                
                if (isControlledByPlayer) {
                    // Use purple palette for player-controlled heroes
                    if (combatant.state === 'respawning') {
                        heroColor = CLIENT_CONFIG.SELF_COLORS.RESPAWNING as number;
                    } else {
                        heroColor = CLIENT_CONFIG.SELF_COLORS.PRIMARY as number;
                    }
                } else {
                    // Use team colors for other heroes
                    if (combatant.state === 'respawning') {
                        heroColor = (combatant.team === 'blue' ? CLIENT_CONFIG.TEAM_COLORS.BLUE_RESPAWNING : CLIENT_CONFIG.TEAM_COLORS.RED_RESPAWNING) as number;
                    } else {
                        heroColor = (combatant.team === 'blue' ? CLIENT_CONFIG.TEAM_COLORS.BLUE : CLIENT_CONFIG.TEAM_COLORS.RED) as number;
                    }
                }
                break;
            }
        }

        // Use GameScene's destination marker management
        gameScene.updateDestinationMarker(this.moveTargetPosition.x, this.moveTargetPosition.y, heroColor);
    }


    /**
     * Hides the destination marker
     */
    private hideDestinationMarker(): void {
        const gameScene = this.scene as any;
        gameScene.clearDestinationMarker();
    }
}
