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
import { gameStateToString, getTotalCombatantHealth } from '../../shared/utils/DebugUtils';

export class GameScene extends Phaser.Scene {
    private client!: Client;
    private room: any;
    private entityManager!: EntityManager;
    private animationManager!: AnimationManager;
    private uiManager!: UIManager;
    private processedAttackEvents: Set<string> = new Set();
    private lastState: GameState|null = null
    private stateLogTimer: number = 0;
    private totalHP: number = 0;
    private playerTeam: string | null = null;
    private playerSessionId: string | null = null;

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
            
            this.setupRoomHandlers();
            this.setupInputHandlers();
            
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
        
        // Get mouse position and send continuously
        const pointer = this.input.activePointer;
        this.room.send('move', { 
            targetX: pointer.x, 
            targetY: pointer.y 
        });
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
        });
    }

    private animateAttackSource(combatantId: string) {
        const radiusIndicator = this.entityManager.getEntityRadiusIndicator(combatantId);
        
        if (radiusIndicator) {
            this.animationManager.animateAttackSource(combatantId, radiusIndicator);
        }
    }

    private animateAttackTarget(combatantId: string, state: SharedGameState) {
        const combatant = state.combatants.get(combatantId);
        if (!combatant) return;
        
        const combatantGraphics = this.entityManager.getEntityGraphics(combatantId);
        
        if (combatantGraphics) {
            this.animationManager.animateAttackTarget(combatantId, combatantGraphics);
        }
    }

    private updateHUD(state: SharedGameState) {
        // Delegate HUD updates to the UIManager
        this.uiManager.updateHUD(state, this.playerTeam);
    }

    private restartGame(): void {
        // This method is no longer needed since restart is handled by the server
        console.log('Restart triggered by server');
    }



    private setupRoomHandlers() {
        this.room.onStateChange((colyseusState: GameState) => {
            this.lastState = colyseusState      
            
            const sharedState = convertToSharedGameState(colyseusState);
            
            // Track the player's team when they spawn
            this.updatePlayerTeam(sharedState);
            
            this.updateCombatantEntities(sharedState);
            this.processAttackEvents(sharedState);
            this.updateHUD(sharedState);
        });
        
        this.room.onLeave((code: number) => {
            console.log('Left room with code:', code);
            // When disconnected, restart the entire scene for a fresh game
            this.scene.restart();
        });
    }

    private updatePlayerTeam(state: SharedGameState): void {
        // Find the player that belongs to this client by session ID
        if (!this.playerSessionId || this.playerTeam) return;
        
        const player = state.combatants.get(this.playerSessionId);
        if (player && player.type === 'player') {
            this.playerTeam = player.team;
            console.log(`Player team determined: ${this.playerTeam} (session: ${this.playerSessionId})`);
        }
    }

    private setupInputHandlers(): void {
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            if (this.room) {
                this.room.send('useAbility', {
                    x: pointer.x,
                    y: pointer.y
                });
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