import Phaser from 'phaser';
import { Client } from 'colyseus.js';
import { LobbyState, PlayerSlot } from '../../shared/types/LobbyTypes';
import { CLIENT_CONFIG } from '../../ClientConfig';
import { TextStyleHelper } from '../utils/TextStyleHelper';
import { getCanvasWidth, getCanvasHeight } from '../utils/CanvasSize';
import { hexToColorString } from '../utils/ColorUtils';
import { ConnectionManager } from '../ConnectionManager';
import { PlayerNameStorage } from '../utils/PlayerNameStorage';
import { ControlModeToggle } from '../ui/ControlModeToggle';
import { TutorialOverlay } from '../ui/TutorialOverlay';
import { CursorRenderer } from '../ui/CursorRenderer';
import { Button } from '../ui/Button';

export class LobbyScene extends Phaser.Scene {
    private client!: Client;
    private room: any;
    private lobbyState: LobbyState | null = null;
    private playerSessionId: string | null = null;
    private connectionManager!: ConnectionManager;
    private isNameDialogOpen: boolean = false;
    private hasLoadedSavedName: boolean = false;
    
    // UI Elements
    private configValue!: Phaser.GameObjects.Text;
    private configDropdownItems: Phaser.GameObjects.Text[] = [];
    private blueTeamContainer!: Phaser.GameObjects.Container;
    private redTeamContainer!: Phaser.GameObjects.Container;
    private startButton!: Button;
    private teamSizeButtons: Phaser.GameObjects.Text[] = [];
    private versionText!: Phaser.GameObjects.Text;
    private controlModeToggle!: ControlModeToggle;
    private tutorialOverlay!: TutorialOverlay;
    private tutorialButton!: Phaser.GameObjects.Container;
    private cursorRenderer!: CursorRenderer;

    constructor() {
        super({ key: 'LobbyScene' });
    }

    private addHoverEffect(button: Phaser.GameObjects.Text, normalColor: number, hoverColor: number = CLIENT_CONFIG.UI.COLORS.ACCENT) {
        button.on('pointerover', () => {
            button.setStyle({ backgroundColor: hexToColorString(hoverColor) });
        });
        button.on('pointerout', () => {
            button.setStyle({ backgroundColor: hexToColorString(normalColor) });
        });
    }

    /**
     * Reset all scene state for fresh initialization
     */
    private resetSceneState() {
        // Reset connection state
        this.client = null as any;
        this.room = null;
        this.playerSessionId = null;
        this.lobbyState = null;
        this.isNameDialogOpen = false;
        this.hasLoadedSavedName = false;
        
        // Reset UI elements
        this.configValue = null as any;
        this.blueTeamContainer = null as any;
        this.redTeamContainer = null as any;
        this.startButton = null as any;
        this.versionText = null as any;
        
        // Destroy control mode toggle if it exists
        if (this.controlModeToggle) {
            this.controlModeToggle.destroy();
            this.controlModeToggle = null as any;
        }
        
        // Destroy tutorial overlay if it exists
        if (this.tutorialOverlay) {
            this.tutorialOverlay.destroy();
            this.tutorialOverlay = null as any;
        }
        
        // Destroy tutorial button if it exists
        if (this.tutorialButton) {
            this.tutorialButton.destroy();
            this.tutorialButton = null as any;
        }
        
        // Clear arrays
        this.configDropdownItems = [];
        this.teamSizeButtons = [];
    }


    preload() {
        // Load pyromancer icon for the title
        this.load.image('pyromancer-icon', '/assets/icons/pyromancer.svg');
        
        // Load control mode icons
        this.load.image('control-mouse', '/assets/config/mouse.png');
        this.load.image('control-keyboard', '/assets/config/keyboard.png');
        
        // Load assets for tutorial overlay
        this.load.image('hero-base', '/assets/heroes/hero_base.png');
        this.load.image('hero-hookshot', '/assets/heroes/hero_hookshot.png');
        this.load.image('hero-mercenary', '/assets/heroes/hero_mercenary.png');
        this.load.image('hero-pyromancer', '/assets/heroes/hero_pyromancer.png');
        this.load.image('hero-sniper', '/assets/heroes/hero_sniper.png');
        this.load.image('hero-thorndive', '/assets/heroes/hero_thorndive.png');
        this.load.image('minion-warrior', '/assets/minions/minion_warrior.png');
        this.load.image('minion-archer', '/assets/minions/minion_archer.png');
        this.load.image('structure-cradle', '/assets/structures/structure_cradle.png');
        this.load.image('structure-turret', '/assets/structures/structure_tower.png');
    }

    async create() {
        console.log('Creating lobby scene...');
        
        // Hide the default cursor (use custom cursor like in game)
        this.input.setDefaultCursor('none');
        
        // Create lobby background
        this.createLobbyBackground();
        
        // Reset all state for fresh scene
        this.resetSceneState();
        
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
            
            // Set up keyboard handlers
            this.setupKeyboardHandlers();
            
            // Load and set saved player name
            this.loadAndSetSavedPlayerName();
            
        } catch (error) {
            console.error('Failed to connect to lobby:', error);
            this.createErrorUI();
        }
    }

    private setupRoomHandlers() {
        this.room.onStateChange((state: any) => {
            this.lobbyState = this.convertLobbyState(state);
            // Only update UI if it's been created and is valid
            if (this.startButton && this.startButton.scene) {
                this.updateUI();
            }
            // Try to load saved name on first state change
            this.loadAndSetSavedPlayerName();
        });

        this.room.onMessage('gameStarting', (message: any) => {
            console.log('Game starting, transitioning to game scene...');
            this.scene.start('GameScene', { lobbyData: message.lobbyData, playerLobbyId: this.playerSessionId });
        });

        this.room.onLeave(() => {
            console.log('Left lobby room');
        });
    }

    private setupKeyboardHandlers() {
        // E key handler for opening name edit dialog
        this.input.keyboard?.on('keydown-E', (event: KeyboardEvent) => {
            // Don't open dialog if one is already open
            if (this.isNameDialogOpen) {
                return;
            }
            
            const currentPlayerSlot = this.getCurrentPlayerSlot();
            if (currentPlayerSlot) {
                event.preventDefault(); // Prevent the 'E' from being typed
                this.showNameEditDialog(currentPlayerSlot.playerDisplayName, true);
            }
        });

        // ESC key handler for closing tutorial
        this.input.keyboard?.on('keydown-ESC', (event: KeyboardEvent) => {
            if (this.tutorialOverlay && this.tutorialOverlay.isShowing()) {
                this.tutorialOverlay.hide();
            }
        });

        // T key handler for tutorial toggle
        this.input.keyboard?.on('keydown-T', (event: KeyboardEvent) => {
            if (this.tutorialOverlay) {
                this.tutorialOverlay.toggle();
            }
        });
    }

    private getCurrentPlayerSlot(): PlayerSlot | null {
        if (!this.lobbyState || !this.playerSessionId) {
            return null;
        }

        // Check blue team first
        const bluePlayer = this.lobbyState.blueTeam.find(slot => slot.playerId === this.playerSessionId);
        if (bluePlayer) {
            return bluePlayer;
        }

        // Check red team
        const redPlayer = this.lobbyState.redTeam.find(slot => slot.playerId === this.playerSessionId);
        if (redPlayer) {
            return redPlayer;
        }

        return null;
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
                playerDisplayName: slot.playerDisplayName,
                isBot: slot.isBot,
                isReady: slot.isReady
            })),
            redTeam: Array.from(state.redTeam).map((slot: any) => ({
                playerId: slot.playerId,
                playerDisplayName: slot.playerDisplayName,
                isBot: slot.isBot,
                isReady: slot.isReady
            })),
            availableConfigs: Array.from(state.availableConfigs),
            selectedConfig: state.selectedConfig
        };
    }

    private createUI() {
        const centerX = getCanvasWidth() / 2;
        const centerY = getCanvasHeight() / 2;

        // Add pyromancer icon and title
        const pyromancerIcon = this.add.image(centerX - 115, centerY - 300, 'pyromancer-icon');
        pyromancerIcon.setScale(0.6);
        pyromancerIcon.setOrigin(0.5);

        const titleText = this.add.text(centerX + 25, centerY - 300, 'ARAM.IO Lobby', 
            TextStyleHelper.getTitleStyle('medium')
        ).setOrigin(0.5);

        // Team size selector
        this.add.text(centerX, centerY - 230, 'Team Size:', 
            TextStyleHelper.getStyle('HEADER')
        ).setOrigin(0.5);

        // Team size buttons
        for (let i = 1; i <= 5; i++) {
            const button = this.add.text(centerX - 80 + (i - 1) * 40, centerY - 200, i.toString(), 
                TextStyleHelper.getStyleWithCustom('HEADER', {
                    backgroundColor: hexToColorString(CLIENT_CONFIG.UI.COLORS.BACKGROUND),
                    padding: { x: 8, y: 4 }
                })
            ).setOrigin(0.5).setInteractive();

            // Add hover effects
            this.addHoverEffect(button, CLIENT_CONFIG.UI.COLORS.BACKGROUND);

            button.on('pointerdown', () => {
                this.room.send('setTeamSize', { size: i });
            });

            this.teamSizeButtons.push(button);
        }

        // Config selector
        this.add.text(centerX, centerY - 130, 'Config:', 
            TextStyleHelper.getStyle('HEADER')
        ).setOrigin(0.5);

        this.configValue = this.add.text(centerX, centerY - 100, 'default', 
            TextStyleHelper.getStyleWithCustom('BODY_LARGE', {
                backgroundColor: hexToColorString(CLIENT_CONFIG.UI.COLORS.BACKGROUND),
                padding: { x: 10, y: 5 }
            })
        ).setOrigin(0.5).setInteractive();

        // Add hover effects
        this.addHoverEffect(this.configValue, CLIENT_CONFIG.UI.COLORS.BACKGROUND);

        this.configValue.on('pointerdown', () => {
            // Toggle dropdown - close if already open, open if closed
            if (this.configDropdownItems.length > 0) {
                // Close dropdown
                this.configDropdownItems.forEach(item => item.destroy());
                this.configDropdownItems = [];
            } else {
                // Open dropdown
                this.toggleConfigDropdown(centerX, centerY - 70);
            }
        });

        // Team containers
        const teamY = centerY; // Position teams at the center
        this.blueTeamContainer = this.add.container(centerX - 200, teamY);
        this.redTeamContainer = this.add.container(centerX + 200, teamY);

        this.add.text(centerX - 200, teamY - 40, 'Blue Team', 
            TextStyleHelper.getStyleWithColor('TITLE_SMALL', TextStyleHelper.getTeamColor('blue'))
        ).setOrigin(0.5);

        this.add.text(centerX + 200, teamY - 40, 'Red Team', 
            TextStyleHelper.getStyleWithColor('TITLE_SMALL', TextStyleHelper.getTeamColor('red'))
        ).setOrigin(0.5);

        // Start button (below How to Play button)
        this.startButton = new Button(this, {
            x: centerX,
            y: centerY + 250,
            text: 'Start Game',
            type: 'proceed',
            enabled: false, // Will be updated in updateUI
            onClick: () => {
                if (this.lobbyState?.canStart) {
                    this.room.send('startGame');
                }
            }
        });
        
        this.add.existing(this.startButton);

        // How to Play section (above start button)
        const howToPlayY = centerY + 200;
        
        // Tutorial button with text (entire element is clickable)
        this.createTutorialButton(centerX, howToPlayY);

        // Version display centered at bottom
        let versionDisplay = 'Game Version: dev';
        try {
            // Dynamic import works in both dev and production
            import('../../generated/version').then(({ VERSION_INFO }) => {
                if (this.versionText && this.versionText.scene) {
                    const displayText = `Game Version: ${VERSION_INFO.commitHash} - ${VERSION_INFO.commitMessage}`;
                    this.versionText.setText(displayText);
                }
            }).catch(() => {
                // Fallback already set to 'Game Version: dev'
            });
        } catch (e) {
            // Fallback if version file doesn't exist yet
        }
        
        const padding = 10;
        this.versionText = this.add.text(
            centerX,
            getCanvasHeight() - padding,
            versionDisplay,
            TextStyleHelper.getStyleWithCustom('BODY_TINY', {
                fontFamily: 'monospace',
                fontStyle: 'italic',
                color: '#888888'
            })
        ).setOrigin(0.5, 1);

        // Control mode toggle in bottom right
        this.controlModeToggle = new ControlModeToggle(
            this,
            this.cameras.main.width - padding - 15,
            this.cameras.main.height - padding - 15
        );
        this.controlModeToggle.setScrollFactor(0, 0);
        
        // Initialize tutorial overlay
        this.tutorialOverlay = new TutorialOverlay(this);
        
        // Initialize cursor renderer
        this.cursorRenderer = new CursorRenderer(this);
        this.cursorRenderer.create();
    }
    
    update() {
        // Update cursor to show crosshair
        if (this.cursorRenderer) {
            this.cursorRenderer.update(null, 0, false);
        }
    }
    
    private createTutorialButton(x: number, y: number): void {
        const buttonSize = 30;
        
        // Create container for the entire clickable element
        this.tutorialButton = this.add.container(x, y);
        
        // Background rectangle for the entire button
        const bgRect = this.add.rectangle(0, 0, 160, 45, CLIENT_CONFIG.UI.COLORS.BACKGROUND);
        
        // Background circle for the ? icon
        const bg = this.add.circle(-60, 0, buttonSize / 2, CLIENT_CONFIG.UI.COLORS.CONTROL_TOGGLE);
        bg.setStrokeStyle(2, CLIENT_CONFIG.UI.COLORS.BORDER);
        
        // Question mark text
        const questionMark = this.add.text(-60, 0, '?', 
            TextStyleHelper.getStyle('HEADER')
        );
        questionMark.setOrigin(0.5, 0.5);
        
        // "How to Play" text
        const howToPlayText = this.add.text(-35, 0, 'How to Play', 
            TextStyleHelper.getStyle('BODY_LARGE')
        );
        howToPlayText.setOrigin(0, 0.5);
        
        // Add elements to container
        this.tutorialButton.add([bgRect, bg, questionMark, howToPlayText]);
        
        // Make entire area clickable
        const clickableWidth = 160;
        const clickableHeight = 45;
        this.tutorialButton.setSize(clickableWidth, clickableHeight);
        this.tutorialButton.setInteractive();
        
        // Hover effects
        this.tutorialButton.on('pointerover', () => {
            bgRect.setFillStyle(CLIENT_CONFIG.UI.COLORS.ACCENT);
        });
        
        this.tutorialButton.on('pointerout', () => {
            bgRect.setFillStyle(CLIENT_CONFIG.UI.COLORS.BACKGROUND);
        });
        
        // Click handler
        this.tutorialButton.on('pointerdown', () => {
            this.tutorialOverlay.show();
        });
    }
    

    private updateUI() {
        if (!this.lobbyState) return;

        // Update config selector
        if (this.configValue) {
            this.configValue.setText(this.lobbyState.selectedConfig || 'default');
        }

        // Update team size buttons
        this.teamSizeButtons.forEach((button, index) => {
            const size = index + 1;
            if (size === this.lobbyState!.teamSize) {
                button.setStyle({ 
                    backgroundColor: hexToColorString(CLIENT_CONFIG.UI.COLORS.BACKGROUND),
                    stroke: hexToColorString(CLIENT_CONFIG.UI.BUTTON_COLORS.PROCEED),
                    strokeThickness: 2,
                    color: hexToColorString(CLIENT_CONFIG.UI.BUTTON_COLORS.PROCEED)
                });
            } else {
                button.setStyle({ 
                    backgroundColor: hexToColorString(CLIENT_CONFIG.UI.COLORS.BACKGROUND),
                    stroke: '',
                    strokeThickness: 0,
                    color: '#ffffff'
                });
            }
        });

        // Update team displays
        this.updateTeamDisplay('blue', this.lobbyState.blueTeam);
        this.updateTeamDisplay('red', this.lobbyState.redTeam);

        // Update start button
        if (this.startButton && this.startButton.scene) {
            this.startButton.setEnabled(this.lobbyState.canStart);
        }
    }

    private toggleConfigDropdown(centerX: number, startY: number) {
        // Clear existing dropdown
        this.configDropdownItems.forEach(item => item.destroy());
        this.configDropdownItems = [];

        if (!this.lobbyState) return;
        const allItems = this.lobbyState.availableConfigs || [];
        // Filter out the currently selected config
        const items = allItems.filter(name => name !== this.lobbyState!.selectedConfig);

        items.forEach((name, idx) => {
            const y = startY + idx * 24;
            const item = this.add.text(centerX, y, name, 
                TextStyleHelper.getStyleWithCustom('BODY_SMALL', {
                    color: '#ffffff',
                    backgroundColor: hexToColorString(CLIENT_CONFIG.UI.COLORS.BACKGROUND),
                    padding: { x: 8, y: 3 }
                })
            ).setOrigin(0.5).setInteractive();

            // Add hover effects
            this.addHoverEffect(item, CLIENT_CONFIG.UI.COLORS.BACKGROUND);

            item.on('pointerdown', () => {
                this.room.send('setConfig', { name });
                this.configDropdownItems.forEach(i => i.destroy());
                this.configDropdownItems = [];
            });

            this.configDropdownItems.push(item);
        });
    }

    private updateTeamDisplay(team: 'blue' | 'red', slots: PlayerSlot[]) {
        const container = team === 'blue' ? this.blueTeamContainer : this.redTeamContainer;
        
        // Clear existing slots
        container.removeAll(true);

        // Create slot displays
        slots.forEach((slot, index) => {
            const y = index * 40;
            let slotText = '';
            let textColor: number = 0xffffff; // white
            let isSelf = false;
            let fontStyle: string | undefined = undefined;
            
            if (slot.playerId) {
                if (slot.isBot) {
                    slotText = `Bot ${index + 1}`;
                    textColor = CLIENT_CONFIG.UI.COLORS.DISABLED;
                } else {
                    slotText = slot.playerDisplayName;
                    if (slot.playerId === this.playerSessionId) {
                        // Your own name uses the character's purple color and is bolded
                        textColor = CLIENT_CONFIG.SELF_COLORS.PRIMARY;
                        isSelf = true;
                        fontStyle = 'bold';
                    } else {
                        // Other players use team colors
                        textColor = TextStyleHelper.getTeamColor(team as 'blue' | 'red');
                    }
                }
                
                if (slot.isReady) {
                    slotText += ' ✓';
                }
            } else {
                slotText = 'Empty';
                textColor = CLIENT_CONFIG.UI.COLORS.DISABLED;
                fontStyle = 'italic';
            }

            const slotDisplay = this.add.text(0, y, slotText, 
                TextStyleHelper.getStyleWithCustom('BODY_LARGE', {
                    color: hexToColorString(textColor),
                    fontStyle: fontStyle
                })
            ).setOrigin(0.5);
            

            // Add team switching arrows for players (not bots)
            if (slot.playerId && !slot.isBot) {
                const elementsToAdd = [slotDisplay];
                
                // Only show left arrow (to blue team) if player is not already on blue team
                if (team !== 'blue') {
                    const arrowLeft = this.add.text(-100, y, '←', {
                        fontSize: '24px',
                         color: hexToColorString(CLIENT_CONFIG.UI.COLORS.BLUE_TEAM),
                        fontFamily: CLIENT_CONFIG.UI.FONTS.PRIMARY,
                        backgroundColor: hexToColorString(CLIENT_CONFIG.UI.COLORS.BACKGROUND),
                        padding: { x: 4, y: 2 }
                    }).setOrigin(0.5).setInteractive();

                    // Add hover effects
                    this.addHoverEffect(arrowLeft, CLIENT_CONFIG.UI.COLORS.BACKGROUND);

                    // Left arrow: move to blue team
                    arrowLeft.on('pointerdown', () => {
                        if (isSelf) {
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

                    elementsToAdd.push(arrowLeft);
                }

                // Only show right arrow (to red team) if player is not already on red team
                if (team !== 'red') {
                    const arrowRight = this.add.text(100, y, '→', {
                        fontSize: '24px',
                         color: hexToColorString(CLIENT_CONFIG.UI.COLORS.RED_TEAM),
                        fontFamily: CLIENT_CONFIG.UI.FONTS.PRIMARY,
                        backgroundColor: hexToColorString(CLIENT_CONFIG.UI.COLORS.BACKGROUND),
                        padding: { x: 4, y: 2 }
                    }).setOrigin(0.5).setInteractive();

                    // Add hover effects
                    this.addHoverEffect(arrowRight, CLIENT_CONFIG.UI.COLORS.BACKGROUND);

                    // Right arrow: move to red team
                    arrowRight.on('pointerdown', () => {
                        if (isSelf) {
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

                    elementsToAdd.push(arrowRight);
                }

                // Add edit button for current player's own slot
                if (isSelf) {
                    const editButton = this.add.text(70, y, '✏️', {
                        fontSize: '12px',
                        fontFamily: CLIENT_CONFIG.UI.FONTS.PRIMARY,
                        backgroundColor: hexToColorString(CLIENT_CONFIG.UI.COLORS.BACKGROUND),
                        padding: { x: 3, y: 2 }
                    }).setOrigin(0.5).setInteractive();

                    // Add hover effects
                    this.addHoverEffect(editButton, CLIENT_CONFIG.UI.COLORS.BACKGROUND);

                    editButton.on('pointerdown', () => {
                        this.showNameEditDialog(slot.playerDisplayName);
                    });

                    elementsToAdd.push(editButton);
                }

                container.add(elementsToAdd);
            } else {
                container.add(slotDisplay);
            }
        });
    }

    private createErrorUI() {
        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;

        this.add.text(centerX, centerY, 'Failed to connect to lobby', 
            TextStyleHelper.getStyle('ERROR')
        ).setOrigin(0.5);

        const retryButton = new Button(this, {
            x: centerX,
            y: centerY + 50,
            text: 'Retry',
            type: 'standard',
            onClick: () => this.scene.restart()
        });
        
        // Add button to scene
        this.add.existing(retryButton);
    }

    /**
     * Load saved player name from localStorage and set it if the player has a default name
     * If the saved name is already in use, append a number to make it unique
     */
    private loadAndSetSavedPlayerName() {
        // Only try once per session
        if (this.hasLoadedSavedName) {
            return;
        }

        const savedName = PlayerNameStorage.getPlayerName();
        if (savedName) {
            const currentPlayerSlot = this.getCurrentPlayerSlot();
            if (currentPlayerSlot) {
                const currentName = currentPlayerSlot.playerDisplayName;
                const isDefaultName = !currentName || 
                                    currentName.trim() === '' || 
                                    currentName.startsWith('Player ') ||
                                    currentName.startsWith('Hero ');
                
                if (isDefaultName) {
                    const uniqueName = this.generateUniqueDisplayName(savedName);
                    console.log(`Loading saved player name: ${uniqueName} (replacing default name: ${currentName})`);
                    this.room.send('setPlayerDisplayName', { displayName: uniqueName });
                    this.hasLoadedSavedName = true;
                }
            }
        }
    }

    /**
     * Generate a unique display name by checking if the base name is already in use
     * If it's in use, append a number (e.g., "PlayerName", "PlayerName 2", "PlayerName 3")
     * 
     * NOTE: This modification of the name is just for testing purposes
     */
    private generateUniqueDisplayName(baseName: string): string {
        if (!this.lobbyState) {
            return baseName;
        }

        // Get all existing display names in the lobby
        const existingNames = new Set<string>();
        
        // Check blue team
        this.lobbyState.blueTeam.forEach(slot => {
            if (slot.playerDisplayName && slot.playerDisplayName.trim() !== '') {
                existingNames.add(slot.playerDisplayName);
            }
        });
        
        // Check red team
        this.lobbyState.redTeam.forEach(slot => {
            if (slot.playerDisplayName && slot.playerDisplayName.trim() !== '') {
                existingNames.add(slot.playerDisplayName);
            }
        });

        // If the base name is not in use, use it
        if (!existingNames.has(baseName)) {
            return baseName;
        }

        // Otherwise, find a unique name by appending numbers
        let counter = 2;
        let uniqueName: string;
        
        do {
            uniqueName = `${baseName} ${counter}`;
            counter++;
        } while (existingNames.has(uniqueName));

        return uniqueName;
    }


    private showNameEditDialog(currentName: string, autoFocus: boolean = true) {
        // Set flag to prevent multiple dialogs
        this.isNameDialogOpen = true;
        
        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;

        // Create semi-transparent overlay
        const overlay = this.add.rectangle(centerX, centerY, this.cameras.main.width, this.cameras.main.height, CLIENT_CONFIG.UI.OVERLAY.BACKGROUND, CLIENT_CONFIG.UI.OVERLAY.ALPHA);

        // Create dialog background
        const dialogBg = this.add.rectangle(centerX, centerY, 400, 200, CLIENT_CONFIG.UI.COLORS.BACKGROUND);
        dialogBg.setStrokeStyle(2, CLIENT_CONFIG.UI.COLORS.BORDER);

        // Title
        const title = this.add.text(centerX, centerY - 60, 'Change Display Name', 
            TextStyleHelper.getStyle('HEADER')
        ).setOrigin(0.5);

        // Create HTML input field over the canvas
        const canvasElement = this.game.canvas;
        const canvasRect = canvasElement.getBoundingClientRect();
        
        const inputElement = document.createElement('input');
        inputElement.type = 'text';
        // Use current name, or fall back to stored name if current is empty
        const defaultValue = currentName || PlayerNameStorage.getPlayerName() || '';
        inputElement.value = defaultValue;
        inputElement.maxLength = CLIENT_CONFIG.UI.MAX_DISPLAY_NAME_LENGTH;
        inputElement.style.position = 'absolute';
        inputElement.style.left = (canvasRect.left + centerX - 150) + 'px';
        inputElement.style.top = (canvasRect.top + centerY - 25) + 'px';
        inputElement.style.width = '300px';
        inputElement.style.height = '30px';
        inputElement.style.border = '2px solid #7f8c8d';
        inputElement.style.borderRadius = '4px';
        inputElement.style.padding = '5px 10px';
        inputElement.style.fontSize = '16px';
        inputElement.style.fontFamily = 'Arial';
        inputElement.style.backgroundColor = '#ecf0f1';
        inputElement.style.color = '#2c3e50';
        inputElement.style.zIndex = '1000';
        
        // Add input to document
        document.body.appendChild(inputElement);
        
        // Only auto-focus and select if autoFocus is true
        if (autoFocus) {
            inputElement.focus();
            inputElement.select(); // Select all text for easy editing
        }

        // Buttons
        const cancelButton = new Button(this, {
            x: centerX - 80,
            y: centerY + 60,
            text: 'Cancel',
            type: 'standard',
            onClick: () => cleanup()
        });

        const saveButton = new Button(this, {
            x: centerX + 80,
            y: centerY + 60,
            text: 'Save',
            type: 'proceed',
            onClick: () => {
                const newName = inputElement.value.trim();
                if (newName && newName.length <= CLIENT_CONFIG.UI.MAX_DISPLAY_NAME_LENGTH) {
                    // Save to localStorage for persistence
                    PlayerNameStorage.savePlayerName(newName);
                    // Send to server
                    this.room.send('setPlayerDisplayName', { displayName: newName });
                    cleanup();
                }
            }
        });

        // Add buttons to scene
        this.add.existing(cancelButton);
        this.add.existing(saveButton);

        // Store dialog elements for cleanup
        const dialogElements = [overlay, dialogBg, title, cancelButton, saveButton];

        // Cleanup function
        const cleanup = () => {
            this.isNameDialogOpen = false; // Clear flag when dialog closes
            document.body.removeChild(inputElement);
            dialogElements.forEach(element => element.destroy());
        };


        // Handle Enter key in input field
        inputElement.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                const newName = inputElement.value.trim();
                if (newName && newName.length <= CLIENT_CONFIG.UI.MAX_DISPLAY_NAME_LENGTH) {
                    // Save to localStorage for persistence
                    PlayerNameStorage.savePlayerName(newName);
                    // Send to server
                    this.room.send('setPlayerDisplayName', { displayName: newName });
                    cleanup();
                }
            } else if (event.key === 'Escape') {
                cleanup();
            }
        });

        // Handle clicking outside the dialog
        overlay.setInteractive();
        overlay.on('pointerdown', (pointer: Phaser.Input.Pointer, localX: number, localY: number, event: Phaser.Types.Input.EventData) => {
            // Only close if clicking directly on the overlay (not on dialog content)
            // Check if the pointer is within the dialog bounds
            const dialogLeft = centerX - 200; // Half of dialog width
            const dialogRight = centerX + 200;
            const dialogTop = centerY - 100; // Half of dialog height
            const dialogBottom = centerY + 100;
            
            if (pointer.x < dialogLeft || pointer.x > dialogRight || 
                pointer.y < dialogTop || pointer.y > dialogBottom) {
                cleanup();
            }
        });
    }

    /**
     * Creates a background for the lobby scene
     * This overrides the viewport background to use the original blue color
     */
    private createLobbyBackground(): void {
        // Create a graphics object for the lobby background
        const lobbyBackground = this.add.graphics();
        
        // Set it to the lowest depth so it appears behind everything else
        lobbyBackground.setDepth(CLIENT_CONFIG.RENDER_DEPTH.SCENE_BACKGROUND);
        
        // Fill the entire canvas with the lobby background color
        lobbyBackground.fillStyle(CLIENT_CONFIG.UI.BACKGROUND.LOBBY);
        lobbyBackground.fillRect(0, 0, getCanvasWidth(), getCanvasHeight());
    }
}
