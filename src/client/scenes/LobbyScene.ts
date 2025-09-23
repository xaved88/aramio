import Phaser from 'phaser';
import { Client } from 'colyseus.js';
import { LobbyState, PlayerSlot } from '../../shared/types/LobbyTypes';
import { CLIENT_CONFIG } from '../../ClientConfig';
import { hexToColorString } from '../utils/ColorUtils';
import { ConnectionManager } from '../ConnectionManager';

export class LobbyScene extends Phaser.Scene {
    private client!: Client;
    private room: any;
    private lobbyState: LobbyState | null = null;
    private playerSessionId: string | null = null;
    private connectionManager!: ConnectionManager;
    
    // UI Elements
    private teamSizeText!: Phaser.GameObjects.Text;
    private blueTeamContainer!: Phaser.GameObjects.Container;
    private redTeamContainer!: Phaser.GameObjects.Container;
    private startButton!: Phaser.GameObjects.Text;
    private teamSizeButtons: Phaser.GameObjects.Text[] = [];
    private playerSlots: Phaser.GameObjects.Text[] = [];

    constructor() {
        super({ key: 'LobbyScene' });
    }

    preload() {
        // No assets needed for basic UI
    }

    async create() {
        console.log('Creating lobby scene...');
        
        // Initialize connection manager
        this.connectionManager = new ConnectionManager();
        
        try {
            const { client, room, sessionId } = await this.connectionManager.connectToLobby();
            this.client = client;
            this.room = room;
            this.playerSessionId = sessionId;
            
            // Set up room handlers
            this.setupRoomHandlers();
            
            // Create UI
            this.createUI();
            
        } catch (error) {
            console.error('Failed to connect to lobby:', error);
            this.createErrorUI();
        }
    }

    private setupRoomHandlers() {
        this.room.onStateChange((state: any) => {
            this.lobbyState = this.convertLobbyState(state);
            this.updateUI();
        });

        this.room.onMessage('gameStarting', (message: any) => {
            console.log('Game starting, transitioning to game scene...');
            this.scene.start('GameScene', { lobbyData: message.lobbyData });
        });

        this.room.onLeave(() => {
            console.log('Left lobby room');
        });
    }

    private convertLobbyState(state: any): LobbyState {
        return {
            lobbyPhase: state.lobbyPhase,
            teamSize: state.teamSize,
            blueTeamSize: state.blueTeamSize,
            redTeamSize: state.redTeamSize,
            canStart: state.canStart,
            gameRoomId: state.gameRoomId,
            blueTeam: Array.from(state.blueTeam).map((slot: any) => ({
                playerId: slot.playerId,
                playerName: slot.playerName,
                isBot: slot.isBot,
                isReady: slot.isReady
            })),
            redTeam: Array.from(state.redTeam).map((slot: any) => ({
                playerId: slot.playerId,
                playerName: slot.playerName,
                isBot: slot.isBot,
                isReady: slot.isReady
            }))
        };
    }

    private createUI() {
        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;

        // Title
        this.add.text(centerX, 50, 'Game Lobby', {
            fontSize: '32px',
            color: hexToColorString(CLIENT_CONFIG.UI.COLORS.PRIMARY),
            fontFamily: CLIENT_CONFIG.UI.FONTS.PRIMARY
        }).setOrigin(0.5);

        // Team size selector
        this.add.text(centerX, 120, 'Team Size:', {
            fontSize: '20px',
            color: hexToColorString(CLIENT_CONFIG.UI.COLORS.TEXT),
            fontFamily: CLIENT_CONFIG.UI.FONTS.PRIMARY
        }).setOrigin(0.5);

        this.teamSizeText = this.add.text(centerX, 150, '5', {
            fontSize: '24px',
            color: hexToColorString(CLIENT_CONFIG.UI.COLORS.PRIMARY),
            fontFamily: CLIENT_CONFIG.UI.FONTS.PRIMARY
        }).setOrigin(0.5);

        // Team size buttons
        for (let i = 1; i <= 5; i++) {
            const button = this.add.text(centerX - 100 + (i - 1) * 40, 180, i.toString(), {
                fontSize: '18px',
                color: hexToColorString(CLIENT_CONFIG.UI.COLORS.TEXT),
                fontFamily: CLIENT_CONFIG.UI.FONTS.PRIMARY,
                backgroundColor: hexToColorString(CLIENT_CONFIG.UI.COLORS.BACKGROUND),
                padding: { x: 10, y: 5 }
            }).setOrigin(0.5).setInteractive();

            button.on('pointerdown', () => {
                this.room.send('setTeamSize', { size: i });
            });

            this.teamSizeButtons.push(button);
        }

        // Team containers
        this.blueTeamContainer = this.add.container(centerX - 200, 250);
        this.redTeamContainer = this.add.container(centerX + 200, 250);

        this.add.text(centerX - 200, 220, 'Blue Team', {
            fontSize: '20px',
            color: hexToColorString(CLIENT_CONFIG.UI.COLORS.BLUE),
            fontFamily: CLIENT_CONFIG.UI.FONTS.PRIMARY
        }).setOrigin(0.5);

        this.add.text(centerX + 200, 220, 'Red Team', {
            fontSize: '20px',
            color: hexToColorString(CLIENT_CONFIG.UI.COLORS.RED),
            fontFamily: CLIENT_CONFIG.UI.FONTS.PRIMARY
        }).setOrigin(0.5);

        // Start button
        this.startButton = this.add.text(centerX, 450, 'Start Game', {
            fontSize: '24px',
            color: hexToColorString(CLIENT_CONFIG.UI.COLORS.TEXT),
            fontFamily: CLIENT_CONFIG.UI.FONTS.PRIMARY,
            backgroundColor: hexToColorString(CLIENT_CONFIG.UI.COLORS.PRIMARY),
            padding: { x: 20, y: 10 }
        }).setOrigin(0.5).setInteractive();

        this.startButton.on('pointerdown', () => {
            if (this.lobbyState?.canStart) {
                this.room.send('startGame');
            }
        });
    }

    private updateUI() {
        if (!this.lobbyState) return;

        // Update team size display
        this.teamSizeText.setText(this.lobbyState.teamSize.toString());

        // Update team size buttons
        this.teamSizeButtons.forEach((button, index) => {
            const size = index + 1;
            if (size === this.lobbyState!.teamSize) {
                button.setStyle({ backgroundColor: hexToColorString(CLIENT_CONFIG.UI.COLORS.PRIMARY) });
            } else {
                button.setStyle({ backgroundColor: hexToColorString(CLIENT_CONFIG.UI.COLORS.BACKGROUND) });
            }
        });

        // Update team displays
        this.updateTeamDisplay('blue', this.lobbyState.blueTeam);
        this.updateTeamDisplay('red', this.lobbyState.redTeam);

        // Update start button
        if (this.lobbyState.canStart) {
            this.startButton.setStyle({ backgroundColor: hexToColorString(CLIENT_CONFIG.UI.COLORS.SUCCESS) });
        } else {
            this.startButton.setStyle({ backgroundColor: hexToColorString(CLIENT_CONFIG.UI.COLORS.DISABLED) });
        }
    }

    private updateTeamDisplay(team: 'blue' | 'red', slots: PlayerSlot[]) {
        const container = team === 'blue' ? this.blueTeamContainer : this.redTeamContainer;
        const teamColor = team === 'blue' ? CLIENT_CONFIG.UI.COLORS.BLUE : CLIENT_CONFIG.UI.COLORS.RED;
        
        // Clear existing slots
        container.removeAll(true);

        // Create slot displays
        slots.forEach((slot, index) => {
            const y = index * 40;
            let slotText = '';
            let textColor: number = CLIENT_CONFIG.UI.COLORS.TEXT_PRIMARY;
            
            if (slot.playerId) {
                if (slot.isBot) {
                    slotText = `Bot ${index + 1}`;
                    textColor = CLIENT_CONFIG.UI.COLORS.DISABLED;
                } else {
                    slotText = slot.playerName;
                    if (slot.playerId === this.playerSessionId) {
                        // Your own name uses the character's purple color
                        textColor = CLIENT_CONFIG.SELF_COLORS.PRIMARY;
                    } else {
                        // Other players use team colors
                        textColor = team === 'blue' ? CLIENT_CONFIG.UI.COLORS.BLUE : CLIENT_CONFIG.UI.COLORS.RED;
                    }
                }
                
                if (slot.isReady) {
                    slotText += ' ✓';
                }
            } else {
                slotText = 'Empty';
                textColor = CLIENT_CONFIG.UI.COLORS.DISABLED;
            }

            const slotDisplay = this.add.text(0, y, slotText, {
                fontSize: '16px',
                color: hexToColorString(textColor),
                fontFamily: CLIENT_CONFIG.UI.FONTS.PRIMARY
            }).setOrigin(0.5);

            // Add team switching arrows for players (not bots)
            if (slot.playerId && !slot.isBot) {
                const arrowLeft = this.add.text(-80, y, '←', {
                    fontSize: '24px',
                    color: hexToColorString(CLIENT_CONFIG.UI.COLORS.BLUE),
                    fontFamily: CLIENT_CONFIG.UI.FONTS.PRIMARY,
                    backgroundColor: hexToColorString(CLIENT_CONFIG.UI.COLORS.BACKGROUND),
                    padding: { x: 8, y: 4 }
                }).setOrigin(0.5).setInteractive();

                const arrowRight = this.add.text(80, y, '→', {
                    fontSize: '24px',
                    color: hexToColorString(CLIENT_CONFIG.UI.COLORS.RED),
                    fontFamily: CLIENT_CONFIG.UI.FONTS.PRIMARY,
                    backgroundColor: hexToColorString(CLIENT_CONFIG.UI.COLORS.BACKGROUND),
                    padding: { x: 8, y: 4 }
                }).setOrigin(0.5).setInteractive();

                // Add hover effects
                arrowLeft.on('pointerover', () => {
                    arrowLeft.setStyle({ backgroundColor: hexToColorString(CLIENT_CONFIG.UI.COLORS.BLUE) });
                });
                arrowLeft.on('pointerout', () => {
                    arrowLeft.setStyle({ backgroundColor: hexToColorString(CLIENT_CONFIG.UI.COLORS.BACKGROUND) });
                });

                arrowRight.on('pointerover', () => {
                    arrowRight.setStyle({ backgroundColor: hexToColorString(CLIENT_CONFIG.UI.COLORS.RED) });
                });
                arrowRight.on('pointerout', () => {
                    arrowRight.setStyle({ backgroundColor: hexToColorString(CLIENT_CONFIG.UI.COLORS.BACKGROUND) });
                });

                // Left arrow: move to blue team
                arrowLeft.on('pointerdown', () => {
                    if (slot.playerId === this.playerSessionId) {
                        // Switch own team
                        this.room.send('switchTeam', { team: 'blue' });
                    } else {
                        // Switch other player's team
                        this.room.send('switchPlayerTeam', { 
                            playerId: slot.playerId, 
                            targetTeam: 'blue' 
                        });
                    }
                });

                // Right arrow: move to red team
                arrowRight.on('pointerdown', () => {
                    if (slot.playerId === this.playerSessionId) {
                        // Switch own team
                        this.room.send('switchTeam', { team: 'red' });
                    } else {
                        // Switch other player's team
                        this.room.send('switchPlayerTeam', { 
                            playerId: slot.playerId, 
                            targetTeam: 'red' 
                        });
                    }
                });

                container.add([slotDisplay, arrowLeft, arrowRight]);
            } else {
                container.add(slotDisplay);
            }
        });
    }

    private createErrorUI() {
        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;

        this.add.text(centerX, centerY, 'Failed to connect to lobby', {
            fontSize: '24px',
            color: hexToColorString(CLIENT_CONFIG.UI.COLORS.ERROR),
            fontFamily: CLIENT_CONFIG.UI.FONTS.PRIMARY
        }).setOrigin(0.5);

        const retryButton = this.add.text(centerX, centerY + 50, 'Retry', {
            fontSize: '18px',
            color: hexToColorString(CLIENT_CONFIG.UI.COLORS.TEXT),
            fontFamily: CLIENT_CONFIG.UI.FONTS.PRIMARY,
            backgroundColor: hexToColorString(CLIENT_CONFIG.UI.COLORS.PRIMARY),
            padding: { x: 15, y: 8 }
        }).setOrigin(0.5).setInteractive();

        retryButton.on('pointerdown', () => {
            this.scene.restart();
        });
    }
}
