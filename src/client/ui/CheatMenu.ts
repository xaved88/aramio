import Phaser from 'phaser';
import { CLIENT_CONFIG } from '../../ClientConfig';
import { HUDContainer } from './HUDContainer';
import { GameplayConfig } from '../../server/config/ConfigProvider';

interface CheatOption {
    id: string;
    name: string;
    description: string;
    key: string;
    enabled: boolean;
    action: () => void;
}

/**
 * CheatMenu displays available cheat options with buttons and keyboard shortcuts
 */
export class CheatMenu {
    private scene: Phaser.Scene;
    private hudCamera: Phaser.Cameras.Scene2D.Camera | null = null;
    private cameraManager: any = null;
    private hudContainer: HUDContainer | null = null;
    private overlayElements: Phaser.GameObjects.GameObject[] = [];
    private isVisible: boolean = false;
    private room: any = null;
    private gameplayConfig: GameplayConfig | null = null;
    private cheatButtons: Phaser.GameObjects.Text[] = [];

    // Depth configuration for consistent layering
    private readonly DEPTHS = {
        BACKGROUND: CLIENT_CONFIG.RENDER_DEPTH.MODALS,
        UI_CONTENT: CLIENT_CONFIG.RENDER_DEPTH.MODALS + 1
    } as const;

    // Text styles for consistent appearance
    private readonly TEXT_STYLES = {
        TITLE: {
            fontSize: '32px',
            color: '#ffffff',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 2
        },
        BUTTON: {
            fontSize: '18px',
            color: '#FFFFFF',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 1,
            backgroundColor: '#3498db',
            padding: { x: 15, y: 8 }
        },
        BUTTON_DISABLED: {
            fontSize: '18px',
            color: '#888888',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 1,
            backgroundColor: '#4A4A4A',
            padding: { x: 15, y: 8 }
        },
        DESCRIPTION: {
            fontSize: '14px',
            color: '#CCCCCC'
        },
        KEYBIND: {
            fontSize: '12px',
            color: '#FFFF00',
            fontStyle: 'bold'
        }
    } as const;

    constructor(scene: Phaser.Scene, gameplayConfig: GameplayConfig) {
        this.scene = scene;
        this.gameplayConfig = gameplayConfig;
    }

    setHUDCamera(hudCamera: Phaser.Cameras.Scene2D.Camera): void {
        this.hudCamera = hudCamera;
    }

    setCameraManager(cameraManager: any): void {
        this.cameraManager = cameraManager;
        if (this.hudContainer) {
            this.hudContainer.setCameraManager(cameraManager);
        }
    }

    setRoom(room: any): void {
        this.room = room;
    }


    /**
     * Shows the cheat menu
     */
    show(): void {
        if (this.isVisible || !this.gameplayConfig) return;
        
        this.isVisible = true;
        this.createOverlay();
    }

    /**
     * Hides the cheat menu
     */
    hide(): void {
        if (!this.isVisible) return;
        
        this.isVisible = false;
        this.destroyOverlay();
    }

    /**
     * Toggles the cheat menu visibility
     */
    toggle(): void {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    /**
     * Gets the available cheat options based on configuration
     */
    private getCheatOptions(): CheatOption[] {
        if (!this.gameplayConfig || !this.room) return [];

        return [
            {
                id: 'toggleHero',
                name: '(S)witch Hero',
                description: 'Take control of the next available hero',
                key: 'S',
                enabled: true, // Always available
                action: () => this.room.send('toggleHero')
            },
            {
                id: 'debugKill',
                name: 'Instant (D)eath',
                description: 'Kill your current hero',
                key: 'D',
                enabled: this.gameplayConfig.DEBUG.CHEAT_KILL_PLAYER_ENABLED,
                action: () => this.room.send('debugKill')
            },
            {
                id: 'instantRespawn',
                name: 'Instant (L)ife',
                description: 'Respawn your hero',
                key: 'L',
                enabled: this.gameplayConfig.DEBUG.CHEAT_INSTANT_RESPAWN_ENABLED,
                action: () => this.room.send('instantRespawn')
            },
            {
                id: 'debugLevelUp',
                name: 'Level (U)p',
                description: 'Gain XP to level up your hero',
                key: 'U',
                enabled: this.gameplayConfig.DEBUG.CHEAT_LEVEL_UP_ENABLED,
                action: () => this.room.send('debugLevelUp')
            }
        ];
    }

    /**
     * Creates the overlay elements
     */
    private createOverlay(): void {
        // Create HUD container
        this.hudContainer = new HUDContainer(this.scene);
        this.hudContainer.setDepth(this.DEPTHS.BACKGROUND);
        
        if (this.cameraManager) {
            this.hudContainer.setCameraManager(this.cameraManager);
        }
        
        // Create semi-transparent background (matching stats overlay)
        const background = this.scene.add.graphics();
        background.fillStyle(0x000000, 0.7);
        background.fillRect(0, 0, CLIENT_CONFIG.GAME_CANVAS_WIDTH, CLIENT_CONFIG.GAME_CANVAS_HEIGHT);
        background.setDepth(this.DEPTHS.BACKGROUND);
        background.setScrollFactor(0, 0); // Fixed to screen
        this.overlayElements.push(background);
        this.hudContainer.add(background);

        const centerX = CLIENT_CONFIG.GAME_CANVAS_WIDTH / 2;
        const centerY = CLIENT_CONFIG.GAME_CANVAS_HEIGHT / 2;

        // Create title
        const title = this.scene.add.text(
            centerX,
            80,
            'Cheat Menu',
            this.TEXT_STYLES.TITLE
        ).setOrigin(0.5).setDepth(this.DEPTHS.UI_CONTENT).setScrollFactor(0, 0);
        this.overlayElements.push(title);
        this.hudContainer.add(title);


        // Create cheat buttons
        const cheatOptions = this.getCheatOptions();
        const buttonSpacing = 100;
        const startY = centerY - 150;

        cheatOptions.forEach((cheat, index) => {
            const buttonY = startY + (index * buttonSpacing);
            this.createCheatButton(cheat, centerX, buttonY);
        });
    }

    /**
     * Creates a cheat button with description and keybind info
     */
    private createCheatButton(cheat: CheatOption, x: number, y: number): void {
        if (!this.hudContainer) return;

        const buttonStyle = cheat.enabled ? this.TEXT_STYLES.BUTTON : this.TEXT_STYLES.BUTTON_DISABLED;
        
        // Create main button
        const button = this.scene.add.text(
            x,
            y,
            cheat.name,
            buttonStyle
        ).setOrigin(0.5).setDepth(this.DEPTHS.UI_CONTENT).setScrollFactor(0, 0);
        
        this.hudContainer.add(button);
        this.overlayElements.push(button);
        this.cheatButtons.push(button);

        // Create description text
        const description = this.scene.add.text(
            x,
            y + 35,
            cheat.description,
            this.TEXT_STYLES.DESCRIPTION
        ).setOrigin(0.5).setDepth(this.DEPTHS.UI_CONTENT).setScrollFactor(0, 0);
        
        this.hudContainer.add(description);
        this.overlayElements.push(description);

        // Create keybind text
        const keybindText = this.scene.add.text(
            x + 120,
            y,
            `(${cheat.key})`,
            this.TEXT_STYLES.KEYBIND
        ).setOrigin(0.5).setDepth(this.DEPTHS.UI_CONTENT).setScrollFactor(0, 0);
        
        this.hudContainer.add(keybindText);
        this.overlayElements.push(keybindText);

        // Add interactivity only if enabled
        if (cheat.enabled) {
            button.setInteractive();
            
            // Add click handler
            button.on('pointerdown', () => {
                cheat.action();
                // Menu will close when Caps Lock is released, no need to hide here
            });
            
            // Add hover effects
            button.on('pointerover', () => {
                button.setStyle({ backgroundColor: '#5dade2' });
            });
            
            button.on('pointerout', () => {
                button.setStyle({ backgroundColor: '#3498db' });
            });
        } else {
            // Disabled state - no interactivity
            button.setAlpha(0.5);
            description.setAlpha(0.5);
            keybindText.setAlpha(0.5);
        }
    }

    /**
     * Destroys the overlay elements
     */
    private destroyOverlay(): void {
        if (this.hudContainer) {
            this.hudContainer.destroy();
            this.hudContainer = null;
        }
        this.overlayElements = [];
        this.cheatButtons = [];
    }

    /**
     * Cleans up the overlay
     */
    destroy(): void {
        this.hide();
    }

    /**
     * Checks if the menu is currently visible
     */
    isMenuVisible(): boolean {
        return this.isVisible;
    }
}
