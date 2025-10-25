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
    private hasLoadedSavedName: boolean = false;
    
    // UI Elements
    private configValue!: Button;
    private configDropdownItems: Button[] = [];
    private blueTeamContainer!: Phaser.GameObjects.Container;
    private redTeamContainer!: Phaser.GameObjects.Container;
    private startButton!: Button;
    private teamSizeButtons: Button[] = [];
    private versionText!: Phaser.GameObjects.Text;
    private controlModeToggle!: ControlModeToggle;
    private tutorialOverlay!: TutorialOverlay;
    private tutorialButton!: Phaser.GameObjects.Container;
    private cursorRenderer!: CursorRenderer;
    
    // Welcome section elements
    private welcomeText!: Phaser.GameObjects.Text;
    private welcomeSaveButton!: Button;
    private welcomeInputElement!: HTMLInputElement;
    private originalPlayerName: string = '';
    
    // Team size selection circles
    private teamSizeCircles: Phaser.GameObjects.GameObject[] = [];
    
    // Click outside listener for input field
    private clickOutsideListener?: (event: Event) => void;
    
    // Resize listener for input field positioning
    private resizeListener?: () => void;
    

    constructor() {
        super({ key: 'LobbyScene' });
    }

    private addHoverEffect(button: Phaser.GameObjects.Text, normalColor: number, hoverColor: number = CLIENT_CONFIG.UI.BUTTON_COLORS.SUBTLE_HOVER) {
        button.on('pointerover', () => {
            button.setStyle({ backgroundColor: hexToColorString(hoverColor) });
        });
        button.on('pointerout', () => {
            button.setStyle({ backgroundColor: hexToColorString(normalColor) });
        });
    }

    private createPlayerNameHighlight(textDisplay: Phaser.GameObjects.Text, y: number): Phaser.GameObjects.Ellipse {
        const textBounds = textDisplay.getBounds();
        const padding = 10;
        const highlightBg = this.add.ellipse(
            0, y, 
            textBounds.width + padding * 2, 
            textBounds.height + padding * 2,
            CLIENT_CONFIG.SELF_COLORS.PRIMARY, // Purple background
            0.8 // Slightly transparent
        );
        highlightBg.setStrokeStyle(2, 0x6c3483); // Dark purple border
        highlightBg.setOrigin(0.5);
        
        // Move highlight behind the text
        highlightBg.setDepth(-1);
        textDisplay.setDepth(0);
        
        return highlightBg;
    }

    private createWelcomeSection(centerX: number, y: number) {
        // Welcome text
        const welcomeText = this.add.text(centerX - 30, y, 'Welcome, ', 
            TextStyleHelper.getStyle('BODY_LARGE')
        ).setOrigin(1, 0.5);

        // Create actual HTML input field
        this.createWelcomeInputField(centerX - 25, y);

        // Save button positioned to the right of the input field
        const inputFieldStart = centerX - 25; // Phaser coordinate of input field start
        const inputFieldWidth = 120;
        const gap = 50;
        const saveButtonX = inputFieldStart + inputFieldWidth + gap; // Right edge + gap
        
        const saveButton = new Button(this, {
            x: saveButtonX,
            y: y,
            text: 'Save',
            type: 'proceed',
            onClick: () => {
                this.savePlayerName();
            }
        });
        saveButton.setVisible(false); // Start hidden
        this.add.existing(saveButton);

        // Store references for updating
        this.welcomeText = welcomeText;
        this.welcomeSaveButton = saveButton;
        
        // Update input field visibility based on tutorial state
        this.updateInputFieldVisibility();
    }

    private createWelcomeInputField(x: number, y: number) {
        // Create actual HTML input field with minimal styling
        this.welcomeInputElement = document.createElement('input');
        this.welcomeInputElement.type = 'text';
        this.welcomeInputElement.value = 'Player';
        this.welcomeInputElement.maxLength = CLIENT_CONFIG.UI.MAX_DISPLAY_NAME_LENGTH;
        this.welcomeInputElement.style.position = 'absolute';
        this.welcomeInputElement.style.width = '120px';
        this.welcomeInputElement.style.height = '20px';
        this.welcomeInputElement.style.zIndex = '500'; // Lower than tutorial overlay (1050)
        
        // Set initial position
        this.setInputFieldPosition(x, y);
        
        // Add input to document
        document.body.appendChild(this.welcomeInputElement);

        // Track original value for change detection
        this.originalPlayerName = this.welcomeInputElement.value;

        // Handle input changes to show/hide save button
        this.welcomeInputElement.addEventListener('input', () => {
            // Clear original name as soon as any edit is made
            this.originalPlayerName = '';
            this.updateSaveButtonVisibility();
        });

        // Select all text when clicking into the field
        this.welcomeInputElement.addEventListener('focus', () => {
            this.welcomeInputElement.select();
        });

        // Add click outside listener to blur input field
        this.clickOutsideListener = (event) => {
            if (this.welcomeInputElement && 
                !this.welcomeInputElement.contains(event.target as Node) && 
                this.welcomeInputElement === document.activeElement) {
                this.welcomeInputElement.blur();
            }
        };
        document.addEventListener('click', this.clickOutsideListener);

        // Add resize listener to update input field position
        this.resizeListener = () => {
            this.updateInputFieldPosition();
        };
        window.addEventListener('resize', this.resizeListener);

        // Handle Enter key to save
        this.welcomeInputElement.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                this.savePlayerName();
            }
        });
    }

    private updateWelcomeSection() {
        if (!this.welcomeInputElement) return;

        const currentPlayerSlot = this.getCurrentPlayerSlot();
        if (currentPlayerSlot) {
            this.welcomeInputElement.value = currentPlayerSlot.playerDisplayName;
            this.originalPlayerName = currentPlayerSlot.playerDisplayName;
            this.updateSaveButtonVisibility();
        }
    }

    private updateSaveButtonVisibility() {
        if (!this.welcomeInputElement || !this.welcomeSaveButton) return;

        // Show save button if no original name (editing started) or if value differs from original
        const hasBeenEdited = this.originalPlayerName === '' || this.welcomeInputElement.value !== this.originalPlayerName;
        this.welcomeSaveButton.setVisible(hasBeenEdited);
    }

    private updateInputFieldVisibility(): void {
        if (!this.welcomeInputElement || !this.tutorialOverlay) return;
        
        const isTutorialVisible = this.tutorialOverlay.isShowing();
        this.welcomeInputElement.style.display = isTutorialVisible ? 'none' : 'block';
    }

    private setInputFieldPosition(x: number, y: number): void {
        if (!this.welcomeInputElement) return;

        // Get current canvas position and size
        const canvasElement = this.game.canvas;
        const canvasRect = canvasElement.getBoundingClientRect();
        
        // Set the input field position relative to the canvas
        this.welcomeInputElement.style.left = (canvasRect.left + x) + 'px';
        this.welcomeInputElement.style.top = (canvasRect.top + y - 15) + 'px';
    }

    private updateInputFieldPosition(): void {
        if (!this.welcomeInputElement) return;

        // Calculate the input field position relative to the canvas
        const centerX = getCanvasWidth() / 2;
        const inputFieldX = centerX - 25; // Same as in createWelcomeSection
        const inputFieldY = (getCanvasHeight() / 2) - 250; // Same as in createWelcomeSection
        
        // Update the input field position
        this.setInputFieldPosition(inputFieldX, inputFieldY);
    }


    private savePlayerName() {
        if (!this.welcomeInputElement) return;

        const newName = this.welcomeInputElement.value.trim();
        if (newName && newName.length <= CLIENT_CONFIG.UI.MAX_DISPLAY_NAME_LENGTH) {
            // Save to localStorage for persistence
            PlayerNameStorage.savePlayerName(newName);
            // Send to server
            this.room.send('setPlayerDisplayName', { displayName: newName });
            
            // Update original name and hide save button
            this.originalPlayerName = newName;
            this.updateSaveButtonVisibility();
            
            // Remove focus from input field
            this.welcomeInputElement.blur();
        }
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
        this.hasLoadedSavedName = false;
        
        // Reset UI elements
        this.configValue = null as any;
        this.blueTeamContainer = null as any;
        this.redTeamContainer = null as any;
        this.startButton = null as any;
        this.versionText = null as any;
        this.welcomeText = null as any;
        this.welcomeSaveButton = null as any;
        this.welcomeInputElement = null as any;
        this.teamSizeCircles = [];
        
        // Clean up click outside listener
        if (this.clickOutsideListener) {
            document.removeEventListener('click', this.clickOutsideListener);
            this.clickOutsideListener = undefined;
        }
        
        // Clean up resize listener
        if (this.resizeListener) {
            window.removeEventListener('resize', this.resizeListener);
            this.resizeListener = undefined;
        }
        
        // Hide input field
        if (this.welcomeInputElement) {
            this.welcomeInputElement.style.display = 'none';
        }
        
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
        this.load.image('control-moba', '/assets/config/moba.png');
        
        // Load assets for tutorial overlay
        this.load.image('hero-base', '/assets/heroes/hero_base.png');
        this.load.image('hero-hookshot', '/assets/heroes/hero_hookshot.png');
        this.load.image('hero-mercenary', '/assets/heroes/hero_mercenary.png');
        this.load.image('hero-pyromancer', '/assets/heroes/hero_pyromancer.png');
        this.load.image('hero-sniper', '/assets/heroes/hero_sniper.png');
        this.load.image('hero-thorndive', '/assets/heroes/hero_thorndive.png');
        this.load.image('minion-warrior', '/assets/minions/minion_warrior.png');
        this.load.image('minion-archer', '/assets/minions/minion_archer.png');
        this.load.image('super-minion-warrior', '/assets/minions/super_minion_warrior.png');
        this.load.image('super-minion-archer', '/assets/minions/super_minion_archer.png');
        this.load.image('structure-cradle', '/assets/structures/structure_cradle.png');
        this.load.image('structure-turret', '/assets/structures/structure_tower.png');
        
        // Load respawn indicator image for respawning heroes
        this.load.image('respawn-indicator', '/assets/icons/respawn-indicator.png');
    }

    async create() {
        console.log('Creating lobby scene...');
        
        // Hide the default cursor (use custom cursor like in game)
        this.input.setDefaultCursor('none');
        
        // Set lobby background color
        this.cameras.main.setBackgroundColor(CLIENT_CONFIG.UI.BACKGROUND.LOBBY);
        
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
            // Hide input field before transitioning
            if (this.welcomeInputElement) {
                this.welcomeInputElement.style.display = 'none';
            }
            this.scene.start('GameScene', { lobbyData: message.lobbyData, playerLobbyId: this.playerSessionId });
        });

        this.room.onLeave(() => {
            console.log('Left lobby room');
        });
    }

    private setupKeyboardHandlers() {
        // ESC key handler for closing tutorial
        this.input.keyboard?.on('keydown-ESC', (event: KeyboardEvent) => {
            if (this.tutorialOverlay && this.tutorialOverlay.isShowing()) {
                this.tutorialOverlay.hide();
            }
        });

        // T key handler for tutorial toggle
        this.input.keyboard?.on('keydown-T', (event: KeyboardEvent) => {
            // Don't open tutorial if input field is focused
            if (this.welcomeInputElement && document.activeElement === this.welcomeInputElement) {
                return;
            }
            
            if (this.tutorialOverlay) {
                this.tutorialOverlay.toggle();
                // Hide/show input field based on tutorial state
                this.updateInputFieldVisibility();
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
            TextStyleHelper.getStyle('PAGE_TITLE')
        ).setOrigin(0.5);

        // Welcome section with player name
        this.createWelcomeSection(centerX, centerY - 250);

        // Team size selector - positioned between welcome and config
        this.add.text(centerX, centerY - 200, 'Team Size:', 
            TextStyleHelper.getStyle('HEADER')
        ).setOrigin(0.5);

        // Team size buttons - only 1 and 5
        const button1 = new Button(this, {
            x: centerX - 30,
            y: centerY - 170,
            text: '1',
            type: 'subtle',
            onClick: () => {
                this.room.send('setTeamSize', { size: 1 });
            }
        });
        this.add.existing(button1);
        this.teamSizeButtons.push(button1);

        // Separator between buttons
        this.add.text(centerX, centerY - 170, '|', 
            TextStyleHelper.getStyleWithColor('BODY_LARGE', '#666666')
        ).setOrigin(0.5);

        const button5 = new Button(this, {
            x: centerX + 30,
            y: centerY - 170,
            text: '5',
            type: 'subtle',
            onClick: () => {
                this.room.send('setTeamSize', { size: 5 });
            }
        });
        this.add.existing(button5);
        this.teamSizeButtons.push(button5);

        // Config selector
        this.add.text(centerX, centerY - 130, 'Config:', 
            TextStyleHelper.getStyle('HEADER')
        ).setOrigin(0.5);

        this.configValue = new Button(this, {
            x: centerX,
            y: centerY - 100,
            text: 'default',
            type: 'subtle',
            onClick: () => {
            // Toggle dropdown - close if already open, open if closed
            if (this.configDropdownItems.length > 0) {
                // Close dropdown
                this.configDropdownItems.forEach(item => item.destroy());
                this.configDropdownItems = [];
            } else {
                // Open dropdown
                this.toggleConfigDropdown(centerX, centerY - 70);
            }
            }
        });
        
        this.add.existing(this.configValue);

        // Team containers
        const teamY = centerY; // Position teams at the center
        this.blueTeamContainer = this.add.container(centerX - 200, teamY);
        this.redTeamContainer = this.add.container(centerX + 200, teamY);

        this.add.text(centerX - 200, teamY - 40, 'Blue Team', 
            TextStyleHelper.getStyleWithColor('TITLE', TextStyleHelper.getTeamColor('blue'))
        ).setOrigin(0.5);

        this.add.text(centerX + 200, teamY - 40, 'Red Team', 
            TextStyleHelper.getStyleWithColor('TITLE', TextStyleHelper.getTeamColor('red'))
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
            TextStyleHelper.getSubtleHintStyle()
        ).setOrigin(0.5, 1);

        // Control mode toggle in bottom right
        this.controlModeToggle = new ControlModeToggle(
            this,
            this.cameras.main.width - padding - 15,
            this.cameras.main.height - padding - 15
        );
        this.controlModeToggle.setScrollFactor(0, 0);
        
        // Initialize tutorial overlay
        this.tutorialOverlay = new TutorialOverlay(this, () => {
            this.updateInputFieldVisibility();
        });
        
        // Set initial input field visibility based on tutorial state
        this.updateInputFieldVisibility();
        
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
        const bgRect = this.add.rectangle(0, 0, 160, 45, CLIENT_CONFIG.UI.BACKGROUND.LOBBY);
        
        // Background circle for the ? icon
        const bg = this.add.circle(-60, 0, buttonSize / 2, CLIENT_CONFIG.UI.BACKGROUND.LOBBY);
        bg.setStrokeStyle(2, CLIENT_CONFIG.UI.COLORS.BORDER);
        
        // Question mark text
        const questionMark = this.add.text(-60, 0, '?', 
            TextStyleHelper.getStyleWithColor('HEADER', '#ffffff')
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
            bgRect.setFillStyle(CLIENT_CONFIG.UI.BUTTON_COLORS.SUBTLE_HOVER);
        });
        
        this.tutorialButton.on('pointerout', () => {
            bgRect.setFillStyle(CLIENT_CONFIG.UI.BACKGROUND.LOBBY);
        });
        
        // Click handler
        this.tutorialButton.on('pointerdown', () => {
            this.tutorialOverlay.show();
            this.updateInputFieldVisibility();
        });
    }
    

    private updateUI() {
        if (!this.lobbyState) return;

        // Update welcome section with current player name
        this.updateWelcomeSection();

        // Update config selector
        if (this.configValue) {
            this.configValue.setText(this.lobbyState.selectedConfig || 'default');
        }

        // Clear existing circles
        this.teamSizeCircles.forEach(circle => circle.destroy());
        this.teamSizeCircles = [];

        // Update team size buttons - only 1 and 5
        const allowedSizes = [1, 5];
        this.teamSizeButtons.forEach((button, index) => {
            const size = allowedSizes[index];
            if (size === this.lobbyState!.teamSize) {
                // Selected state: add circle around button
                const circle = this.add.circle(button.x, button.y, 15, 0x000000, 0);
                circle.setStrokeStyle(3, 0xf1c40f); // Golden yellow from header styles
                circle.setDepth(button.depth + 1); // In front of the button
                
                // Add shadow circle behind the main circle
                const shadowCircle = this.add.circle(button.x + 1, button.y + 1, 15, 0x000000, 0);
                shadowCircle.setStrokeStyle(3, 0x000000); // Black shadow
                shadowCircle.setDepth(button.depth); // Behind the main circle
                shadowCircle.setAlpha(0.3); // Semi-transparent shadow
                
                // Store circle references for cleanup
                if (!this.teamSizeCircles) {
                    this.teamSizeCircles = [];
                }
                this.teamSizeCircles.push(circle);
                this.teamSizeCircles.push(shadowCircle);
                
                // Keep button styling simple
                button.setStyle({ 
                    backgroundColor: hexToColorString(CLIENT_CONFIG.UI.BUTTON_COLORS.SUBTLE),
                    color: '#ffffff'
                });
            } else {
                // Unselected state: white text, no circle
                button.setStyle({ 
                    backgroundColor: hexToColorString(CLIENT_CONFIG.UI.BUTTON_COLORS.SUBTLE),
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
            const item = new Button(this, {
                x: centerX,
                y: y,
                text: name,
                type: 'dropdown',
                onClick: () => {
                    this.room.send('setConfig', { name });
                    this.configDropdownItems.forEach(i => i.destroy());
                    this.configDropdownItems = [];
                }
            });

            this.add.existing(item);
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
            let fontStyle: string = 'bold'; // All player names are bold
            
            if (slot.playerId) {
                if (slot.isBot) {
                    slotText = `Bot ${index + 1}`;
                    textColor = CLIENT_CONFIG.UI.COLORS.DISABLED;
                    fontStyle = 'normal'; // Bots are not bold
                } else {
                    slotText = slot.playerDisplayName;
                    if (slot.playerId === this.playerSessionId) {
                        // Your own name uses white text with purple shadow
                        isSelf = true;
                        textColor = 0xffffff; // White text
                        // fontStyle already set to 'bold' above
                    }
                }
                
                if (slot.isReady) {
                    slotText += ' ✓';
                }
            } else {
                slotText = 'Empty';
                textColor = CLIENT_CONFIG.UI.COLORS.DISABLED;
                fontStyle = 'italic'; // Empty slots are italic, not bold
            }

            // Create the main player name text
            const slotDisplay = this.add.text(0, y, slotText, 
                TextStyleHelper.getStyleWithCustom('BODY_LARGE', {
                    color: hexToColorString(textColor),
                    fontStyle: fontStyle
                })
            ).setOrigin(0.5);
            
            // Add purple shadow for current player
            if (isSelf) {
                slotDisplay.setShadow(2, 2, hexToColorString(CLIENT_CONFIG.SELF_COLORS.TEXT), 3, true, true);
            }
            
            // Add team switching arrows for players (not bots)
            if (slot.playerId && !slot.isBot) {
                const elementsToAdd: Phaser.GameObjects.GameObject[] = [slotDisplay];
                
                // Add "(you)" indicator if this is the current player
                if (isSelf) {
                    const youIndicator = this.add.text(0, y, ' (you)', 
                        TextStyleHelper.getStyle('BODY_MEDIUM')
                    ).setOrigin(0, 0.5);
                    
                    // Position the "(you)" text right after the player name
                    const slotBounds = slotDisplay.getBounds();
                    youIndicator.setX(slotBounds.right + 2);
                    
                    // Calculate total width including "(you)" text for proper centering
                    const youBounds = youIndicator.getBounds();
                    const totalWidth = slotBounds.width + youBounds.width + 2; // +2 for spacing
                    
                    // Reposition both texts to center the combined width
                    const offsetX = totalWidth / 2 - slotBounds.width / 2;
                    slotDisplay.setX(-offsetX);
                    youIndicator.setX(youIndicator.x - offsetX);
                    
                    elementsToAdd.push(youIndicator);
                }
                
                // No highlight background needed - using shadow pattern instead
                
                // Only show left arrow (to blue team) if player is not already on blue team
                if (team !== 'blue') {
                     // Calculate position based on name length - blue arrow goes on the left
                     const textBounds = slotDisplay.getBounds();
                     // For current player, account for the "(you)" text width
                     const extraSpace = isSelf ? 25 : 0; // Space for "(you)" text
                     const arrowX = -(textBounds.width / 2) - 20 - extraSpace; // 20px before the name - space for "(you)"
                     
                     const arrowLeft = this.add.text(arrowX, y, '←', {
                         fontSize: '24px',
                          color: hexToColorString(CLIENT_CONFIG.TEAM_COLORS.BLUE),
                         fontFamily: CLIENT_CONFIG.UI.FONTS.PRIMARY,
                         backgroundColor: hexToColorString(CLIENT_CONFIG.UI.BACKGROUND.LOBBY),
                         padding: { x: 4, y: 2 }
                     }).setOrigin(0.5).setInteractive();

                     // Add hover effects
                     this.addHoverEffect(arrowLeft, CLIENT_CONFIG.UI.BACKGROUND.LOBBY);

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
                     // Calculate position based on name length - red arrow goes on the right
                     const textBounds = slotDisplay.getBounds();
                     // For current player, account for the "(you)" text width
                     const extraSpace = isSelf ? 25 : 0; // Space for "(you)" text
                     const arrowX = (textBounds.width / 2) + 20 + extraSpace; // 20px after the name + space for "(you)"
                     
                     const arrowRight = this.add.text(arrowX, y, '→', {
                         fontSize: '24px',
                          color: hexToColorString(CLIENT_CONFIG.TEAM_COLORS.RED),
                         fontFamily: CLIENT_CONFIG.UI.FONTS.PRIMARY,
                         backgroundColor: hexToColorString(CLIENT_CONFIG.UI.BACKGROUND.LOBBY),
                         padding: { x: 4, y: 2 }
                     }).setOrigin(0.5).setInteractive();

                     // Add hover effects
                     this.addHoverEffect(arrowRight, CLIENT_CONFIG.UI.BACKGROUND.LOBBY);

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


                container.add(elementsToAdd);
            } else {
                // For empty slots or bots, just add the text display
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



}
