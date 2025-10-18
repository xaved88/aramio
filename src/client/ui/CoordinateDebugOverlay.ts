import Phaser from 'phaser';
import { CLIENT_CONFIG } from '../../ClientConfig';
import { TextStyleHelper } from '../utils/TextStyleHelper';
import { getCanvasWidth, getCanvasHeight } from '../utils/CanvasSize';
import { hexToColorString } from '../utils/ColorUtils';
import { GameObjectFactory } from '../GameObjectFactory';

/**
 * Handles coordinate debug overlays like coordinate grids and debug panels
 */
export class CoordinateDebugOverlay {
    private scene: Phaser.Scene;
    private gameObjectFactory: GameObjectFactory;
    private cameraManager: any = null;
    private coordinateGrid: Phaser.GameObjects.Graphics | null = null;
    private screenGrid: Phaser.GameObjects.Graphics | null = null;
    private coordinatesDebugPanel: Phaser.GameObjects.Text | null = null;
    private screenGridLabels: Phaser.GameObjects.Text[] = [];
    private gridLabels: Phaser.GameObjects.Text[] = [];

    constructor(scene: Phaser.Scene, gameObjectFactory: GameObjectFactory) {
        this.scene = scene;
        this.gameObjectFactory = gameObjectFactory;
    }

    setCameraManager(cameraManager: any): void {
        this.cameraManager = cameraManager;
    }

    initialize(): void {
        // Create world coordinate grid overlay
        this.coordinateGrid = this.gameObjectFactory.createGraphics(0, 0, CLIENT_CONFIG.RENDER_DEPTH.BACKGROUND);
        this.coordinateGrid.setVisible(CLIENT_CONFIG.DEBUG.WORLD_COORDINATE_GRID_ENABLED);
        
        // Create screen coordinate grid overlay (rendered at UI depth so it stays on screen)
        this.screenGrid = this.gameObjectFactory.createGraphics(0, 0, CLIENT_CONFIG.RENDER_DEPTH.GAME_UI);
        this.screenGrid.setScrollFactor(0, 0); // Fixed to screen
        this.screenGrid.setVisible(CLIENT_CONFIG.DEBUG.SCREEN_COORDINATE_GRID_ENABLED);
        
        // Create coordinates debug panel (positioned halfway up screen)
        this.coordinatesDebugPanel = this.gameObjectFactory.createText(10, getCanvasHeight() / 2, '', 
            TextStyleHelper.getStyle('BODY_MEDIUM'), 
            CLIENT_CONFIG.RENDER_DEPTH.GAME_UI).setOrigin(0, 0);
        this.coordinatesDebugPanel.setVisible(CLIENT_CONFIG.DEBUG.WORLD_COORDINATE_GRID_ENABLED || CLIENT_CONFIG.DEBUG.SCREEN_COORDINATE_GRID_ENABLED);
        
        // Create the grids if enabled
        if (CLIENT_CONFIG.DEBUG.WORLD_COORDINATE_GRID_ENABLED) {
            this.createCoordinateGrid();
        }
        if (CLIENT_CONFIG.DEBUG.SCREEN_COORDINATE_GRID_ENABLED) {
            this.createScreenGrid();
        }
    }

    update(pointer: Phaser.Input.Pointer): void {
        // Only update if camera is available
        if (!this.scene.cameras.main) {
            return;
        }
        
        // Update coordinates debug panel
        this.updateCoordinatesDebugPanel(pointer);
        
        // Update screen grid visibility
        if (this.screenGrid) {
            this.screenGrid.setVisible(CLIENT_CONFIG.DEBUG.SCREEN_COORDINATE_GRID_ENABLED);
        }
    }

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
        
        // Add world center indicator
        this.coordinateGrid.lineStyle(3, 0x00ff00, 1.0); // Green, thick line
        this.coordinateGrid.beginPath();
        const worldCenterX = CLIENT_CONFIG.MAP_WIDTH / 2;
        const worldCenterY = CLIENT_CONFIG.MAP_HEIGHT / 2;
        this.coordinateGrid.moveTo(worldCenterX - 20, worldCenterY);
        this.coordinateGrid.lineTo(worldCenterX + 20, worldCenterY);
        this.coordinateGrid.moveTo(worldCenterX, worldCenterY - 20);
        this.coordinateGrid.lineTo(worldCenterX, worldCenterY + 20);
        this.coordinateGrid.strokePath();
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
            const topLabel = this.gameObjectFactory.createText(x, 5, x.toString(), 
                TextStyleHelper.getStyleWithColor('BODY_TINY', 0xffffff), 
                CLIENT_CONFIG.RENDER_DEPTH.BACKGROUND).setOrigin(0.5, 0);
            this.gridLabels.push(topLabel);
            
            // Bottom label - positioned in world coordinates
            const bottomLabel = this.gameObjectFactory.createText(x, CLIENT_CONFIG.MAP_HEIGHT - 5, x.toString(), 
                TextStyleHelper.getStyleWithColor('BODY_TINY', 0xffffff), 
                CLIENT_CONFIG.RENDER_DEPTH.BACKGROUND).setOrigin(0.5, 1);
            this.gridLabels.push(bottomLabel);
        }
        
        // Create labels for horizontal lines (Y coordinates) at the left and right
        for (let y = 0; y <= CLIENT_CONFIG.MAP_HEIGHT; y += 100) {
            // Left label - positioned in world coordinates
            const leftLabel = this.gameObjectFactory.createText(5, y, y.toString(), 
                TextStyleHelper.getStyleWithColor('BODY_TINY', 0xffffff), 
                CLIENT_CONFIG.RENDER_DEPTH.BACKGROUND).setOrigin(0, 0.5);
            this.gridLabels.push(leftLabel);
            
            // Right label - positioned in world coordinates
            const rightLabel = this.gameObjectFactory.createText(CLIENT_CONFIG.MAP_WIDTH - 5, y, y.toString(), 
                TextStyleHelper.getStyleWithColor('BODY_TINY', 0xffffff), 
                CLIENT_CONFIG.RENDER_DEPTH.BACKGROUND).setOrigin(1, 0.5);
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
        for (let x = 0; x <= getCanvasWidth(); x += 100) {
            this.screenGrid.beginPath();
            this.screenGrid.moveTo(x, 0);
            this.screenGrid.lineTo(x, getCanvasHeight());
            this.screenGrid.strokePath();
        }
        
        // Draw horizontal lines every 100 screen pixels
        for (let y = 0; y <= getCanvasHeight(); y += 100) {
            this.screenGrid.beginPath();
            this.screenGrid.moveTo(0, y);
            this.screenGrid.lineTo(getCanvasWidth(), y);
            this.screenGrid.strokePath();
        }
        
        // Add screen center indicator
        this.screenGrid.lineStyle(3, 0x0000ff, 1.0); // Blue, thick line
        this.screenGrid.beginPath();
        const screenCenterX = getCanvasWidth() / 2;
        const screenCenterY = getCanvasHeight() / 2;
        this.screenGrid.moveTo(screenCenterX - 20, screenCenterY);
        this.screenGrid.lineTo(screenCenterX + 20, screenCenterY);
        this.screenGrid.moveTo(screenCenterX, screenCenterY - 20);
        this.screenGrid.lineTo(screenCenterX, screenCenterY + 20);
        this.screenGrid.strokePath();
        
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
        for (let x = 0; x <= getCanvasWidth(); x += 100) {
            // Top label - positioned in screen coordinates
            const topLabel = this.gameObjectFactory.createText(x, 5, x.toString(), 
                TextStyleHelper.getStyleWithColor('BODY_TINY', 0xff0000), 
                CLIENT_CONFIG.RENDER_DEPTH.GAME_UI).setOrigin(0.5, 0);
            this.screenGridLabels.push(topLabel);
            
            // Bottom label - positioned in screen coordinates
            const bottomLabel = this.gameObjectFactory.createText(x, getCanvasHeight() - 5, x.toString(), 
                TextStyleHelper.getStyleWithColor('BODY_TINY', 0xff0000), 
                CLIENT_CONFIG.RENDER_DEPTH.GAME_UI).setOrigin(0.5, 1);
            this.screenGridLabels.push(bottomLabel);
        }
        
        // Create labels for horizontal lines (Y coordinates) at the left and right
        for (let y = 0; y <= getCanvasHeight(); y += 100) {
            // Left label - positioned in screen coordinates
            const leftLabel = this.gameObjectFactory.createText(5, y, y.toString(), 
                TextStyleHelper.getStyleWithColor('BODY_TINY', 0xff0000), 
                CLIENT_CONFIG.RENDER_DEPTH.GAME_UI).setOrigin(0, 0.5);
            this.screenGridLabels.push(leftLabel);
            
            // Right label - positioned in screen coordinates
            const rightLabel = this.gameObjectFactory.createText(getCanvasWidth() - 5, y, y.toString(), 
                TextStyleHelper.getStyleWithColor('BODY_TINY', 0xff0000), 
                CLIENT_CONFIG.RENDER_DEPTH.GAME_UI).setOrigin(1, 0.5);
            this.screenGridLabels.push(rightLabel);
        }
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
}
