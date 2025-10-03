import Phaser from 'phaser';
import { CLIENT_CONFIG } from '../ClientConfig';

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
 * Control Scheme: Point-to-move + Click-down-to-stop + Click-up-for-ability
 * - Mouse not pressed: Move towards mouse pointer
 * - Mouse pressed: Stop sending move events, show ability targeting
 * - Mouse released: Fire ability at release position
 */
export class InputHandler {
    private scene: Phaser.Scene;
    private room: any;
    private isClickHeld: boolean = false;
    private clickDownPosition: { x: number; y: number } | null = null;
    private wasRespawningOnClick: boolean = false;
    
    // Dependencies for keyboard input handling
    private gameplayConfig: any = null;
    private uiManager: any = null;

    constructor(scene: Phaser.Scene, room: any) {
        this.scene = scene;
        this.room = room;
    }

    /**
     * Sets dependencies needed for keyboard input handling
     */
    setDependencies(gameplayConfig: any, uiManager: any): void {
        this.gameplayConfig = gameplayConfig;
        this.uiManager = uiManager;
    }

    /**
     * Sets up all input event handlers
     * This is the ONLY place where input events should be registered
     */
    setupHandlers(): void {
        // Pointer down: Start ability targeting, stop movement
        this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            this.handlePointerDown(pointer);
        });

        // Pointer up: Fire ability, resume movement
        this.scene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
            this.handlePointerUp(pointer);
        });

        // Keyboard input handlers
        this.setupKeyboardHandlers();
    }

    /**
     * Sets up all keyboard input handlers
     */
    private setupKeyboardHandlers(): void {
        // S key handler for hero cycling
        this.scene.input.keyboard?.on('keydown-S', (event: KeyboardEvent) => {
            if (this.room) {
                this.room.send('toggleHero');
            }
        });

        // D key handler for debug kill (only if enabled)
        this.scene.input.keyboard?.on('keydown-D', (event: KeyboardEvent) => {
            if (this.room && this.gameplayConfig?.DEBUG.CHEAT_KILL_PLAYER_ENABLED) {
                this.room.send('debugKill');
            }
        });

        // L key handler for instant respawn (only if enabled)
        this.scene.input.keyboard?.on('keydown-L', (event: KeyboardEvent) => {
            if (this.room && this.gameplayConfig?.DEBUG.CHEAT_INSTANT_RESPAWN_ENABLED) {
                this.room.send('instantRespawn');
            }
        });

        // U key handler for level up (only if enabled)
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
    }


    /**
     * Called every frame to handle continuous input (movement)
     * This is the ONLY place where movement commands should be sent
     */
    update(): void {
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
     * Handles pointer down events - starts ability targeting
     */
    private handlePointerDown(pointer: Phaser.Input.Pointer): void {
        this.isClickHeld = true;
        // Check if hero is currently respawning when click starts
        this.wasRespawningOnClick = this.isPlayerRespawning();
        const worldPos = this.screenToWorldCoordinates(pointer.x, pointer.y);
        this.clickDownPosition = { x: worldPos.x, y: worldPos.y };
        
        // Notify scene for UI updates (ability range display)
        this.notifyScenePointerDown(pointer);
    }

    /**
     * Handles pointer up events - fires ability
     */
    private handlePointerUp(pointer: Phaser.Input.Pointer): void {
        if (this.isClickHeld && !this.wasRespawningOnClick) {
            // Only fire ability if the hero wasn't respawning when click started
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
        this.wasRespawningOnClick = false; // Reset for next click
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
     * Checks if the player's hero is currently respawning
     */
    private isPlayerRespawning(): boolean {
        const gameScene = this.scene as any;
        if (gameScene.lastState) {
            // Find the player's hero in the game state
            for (const combatant of gameScene.lastState.combatants.values()) {
                if (combatant.type === 'hero' && combatant.controller === gameScene.playerSessionId) {
                    return combatant.state === 'respawning';
                }
            }
        }
        return false;
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
}
