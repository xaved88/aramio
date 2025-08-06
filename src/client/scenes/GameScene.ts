import Phaser from 'phaser';
import { Client } from 'colyseus.js';
import { GameState } from '../../server/schema/GameState';
import { CLIENT_CONFIG } from '../../Config';
import { type SharedGameState } from '../../shared/types/GameStateTypes';
import { convertToSharedGameState } from '../../shared/utils/StateConverter';
import { EntityManager } from '../entity/EntityManager';
import { AnimationManager } from '../animation/AnimationManager';
import { UIManager } from '../ui/UIManager';
import { hexToColorString } from '../utils/ColorUtils';
import { ControllerId, CombatantId } from '../../shared/types/CombatantTypes';

export class GameScene extends Phaser.Scene {
    private client!: Client;
    private room: any;
    private entityManager!: EntityManager;
    private animationManager!: AnimationManager;
    private uiManager!: UIManager;
    private processedAttackEvents: Set<string> = new Set();
    private lastState: GameState|null = null
    private playerTeam: string | null = null;
    private playerSessionId: ControllerId | null = null;
    private spaceKeyPressed: boolean = false;
    private moveTarget: { x: number, y: number } | null = null;
    private isClickHeld: boolean = false;
    private isRestarting: boolean = false;

    constructor() {
        super({ key: 'GameScene' });
    }

    preload() {
        // No assets needed for basic circles
    }

    async create() {
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
        this.uiManager = new UIManager(this);
        
        try {
            this.room = await this.client.joinOrCreate('game');
            console.log('Connected to server');
            
            // Store the session ID for this client
            this.playerSessionId = this.room.sessionId;
            console.log(`Client session ID: ${this.playerSessionId}`);
            
            // Set the player session ID in the entity manager
            this.entityManager.setPlayerSessionId(this.playerSessionId);
            
            this.setupRoomHandlers();
            this.setupInputHandlers();
            this.setupVisibilityHandlers();
            
            this.uiManager.createHUD();
            
        } catch (error) {
            console.error('Failed to connect:', error);
            this.add.text(300, 300, 'Failed to connect to server', {
                fontSize: CLIENT_CONFIG.UI.FONTS.ERROR,
                color: hexToColorString(CLIENT_CONFIG.UI.COLORS.ERROR)
            }).setOrigin(0.5);
        }
    }

    update() {
        if (!this.room || !this.room.state) return;
        
        if (CLIENT_CONFIG.CONTROLS.SCHEME === 'A') {
            // Control scheme A: point to move (original behavior)
            const pointer = this.input.activePointer;
            this.room.send('move', { 
                targetX: pointer.x, 
                targetY: pointer.y 
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
                this.room.send('move', { 
                    targetX: pointer.x, 
                    targetY: pointer.y 
                });
            } else if (this.moveTarget) {
                // When click is held, keep moving to the click-down position
                this.room.send('move', {
                    targetX: this.moveTarget.x,
                    targetY: this.moveTarget.y
                });
            }
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
            
            // Animate attack source (radius flash)
            this.animateAttackSource(event.sourceId);
            
            // Animate attack target (color flash)
            this.animateAttackTarget(event.targetId, state);
            
            // Trigger targeting line flash
            this.entityManager.triggerTargetingLineFlash(event.sourceId, event.targetId);
        });
    }

    private animateAttackSource(combatantId: CombatantId) {
        const radiusIndicator = this.entityManager.getEntityRadiusIndicator(combatantId);
        
        if (radiusIndicator) {
            this.animationManager.animateAttackSource(combatantId, radiusIndicator);
        }
    }

    private animateAttackTarget(combatantId: CombatantId, state: SharedGameState) {
        const combatant = state.combatants.get(combatantId);
        if (!combatant) return;
        
        const combatantGraphics = this.entityManager.getEntityGraphics(combatantId);
        
        if (combatantGraphics) {
            this.animationManager.animateAttackTarget(combatantId, combatantGraphics);
        }
    }

    private updateHUD(state: SharedGameState) {
        // Delegate HUD updates to the UIManager
        this.uiManager.updateHUD(state, this.playerTeam, this.playerSessionId);
    }

    private restartGame(): void {
        // This method is no longer needed since restart is handled by the server
        console.log('Restart triggered by server');
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
            this.updateHUD(sharedState);
        });
        
        this.room.onMessage('gameRestarted', () => {
            console.log('Game restarted by server');
            
            // Set restarting flag to prevent state processing during cleanup
            this.isRestarting = true;
            
            // Reset client-side state for the new game
            this.playerTeam = null;
            this.lastState = null;
            this.processedAttackEvents.clear();
            
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
            if (combatant.type === 'hero' && combatant.controller === this.playerSessionId) {
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
                    this.room.send('useAbility', {
                        x: pointer.x,
                        y: pointer.y
                    });
                }
            });
        } else if (CLIENT_CONFIG.CONTROLS.SCHEME === 'B') {
            // Scheme B: click to move, space+point to use ability
            this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
                if (this.room && !this.spaceKeyPressed) {
                    // Click without space: set move target
                    this.moveTarget = { x: pointer.x, y: pointer.y };
                }
            });
        } else if (CLIENT_CONFIG.CONTROLS.SCHEME === 'C') {
            // Scheme C: click down to stop at position, click up to use ability
            this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
                if (this.room) {
                    this.isClickHeld = true;
                    this.moveTarget = { x: pointer.x, y: pointer.y };
                }
            });

            this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
                if (this.room && this.isClickHeld) {
                    // Use ability at release position
                    this.room.send('useAbility', {
                        x: pointer.x,
                        y: pointer.y
                    });
                    this.isClickHeld = false;
                    this.moveTarget = null; // Clear move target to resume point-to-move
                }
            });
        }

        // Space key handlers for control scheme B
        this.input.keyboard?.on('keydown-SPACE', () => {
            this.spaceKeyPressed = true;
            // Fire ability at current pointer position when space is pressed
            if (CLIENT_CONFIG.CONTROLS.SCHEME === 'B' && this.room) {
                const pointer = this.input.activePointer;
                this.room.send('useAbility', {
                    x: pointer.x,
                    y: pointer.y
                });
            }
        });

        this.input.keyboard?.on('keyup-SPACE', () => {
            this.spaceKeyPressed = false;
        });

        // Shift key handlers for stats overlay (hold to show)
        this.input.keyboard?.on('keydown-SHIFT', () => {
            if (this.lastState) {
                const sharedState = convertToSharedGameState(this.lastState);
                this.uiManager.showStatsOverlay(sharedState);
            }
        });

        this.input.keyboard?.on('keyup-SHIFT', () => {
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
    }
} 
