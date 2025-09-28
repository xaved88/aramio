import Phaser from 'phaser';
import { CLIENT_CONFIG } from '../../ClientConfig';
import { hexToColorString } from '../utils/ColorUtils';
import { GameObjectFactory } from '../GameObjectFactory';

/**
 * Handles debug overlays like coordinate grids and debug panels
 */
export class DebugOverlay {
    private scene: Phaser.Scene;
    private gameObjectFactory: GameObjectFactory;
    private coordinateGrid: Phaser.GameObjects.Graphics | null = null;
    private screenGrid: Phaser.GameObjects.Graphics | null = null;
    private coordinatesDebugPanel: Phaser.GameObjects.Text | null = null;
    private screenGridLabels: Phaser.GameObjects.Text[] = [];
    private gridLabels: Phaser.GameObjects.Text[] = [];

    constructor(scene: Phaser.Scene, gameObjectFactory: GameObjectFactory) {
        this.scene = scene;
        this.gameObjectFactory = gameObjectFactory;
    }

    initialize(): void {
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

        const gridSize = 100;
        const worldWidth = 2000;
        const worldHeight = 2000;
        
        this.coordinateGrid.clear();
        this.coordinateGrid.lineStyle(1, 0x333333, 0.5);
        
        // Vertical lines
        for (let x = -worldWidth; x <= worldWidth; x += gridSize) {
            this.coordinateGrid.lineBetween(x, -worldHeight, x, worldHeight);
        }
        
        // Horizontal lines
        for (let y = -worldHeight; y <= worldHeight; y += gridSize) {
            this.coordinateGrid.lineBetween(-worldWidth, y, worldWidth, y);
        }
        
        // Create grid labels
        this.gridLabels.forEach(label => label.destroy());
        this.gridLabels = [];
        
        for (let x = -worldWidth; x <= worldWidth; x += gridSize) {
            for (let y = -worldHeight; y <= worldHeight; y += gridSize) {
                if (x !== 0 && y !== 0) continue; // Only label axes
                
                const label = this.gameObjectFactory.createText(x + 5, y - 15, `${x},${y}`, {
                    fontSize: '12px',
                    color: hexToColorString(0x666666),
                    fontFamily: CLIENT_CONFIG.UI.FONTS.DEFAULT_FAMILY
                }, CLIENT_CONFIG.RENDER_DEPTH.BACKGROUND).setOrigin(0, 0);
                
                this.gridLabels.push(label);
            }
        }
    }

    private createScreenGrid(): void {
        if (!this.screenGrid) return;

        const gridSize = 100;
        const screenWidth = CLIENT_CONFIG.GAME_CANVAS_WIDTH;
        const screenHeight = CLIENT_CONFIG.GAME_CANVAS_HEIGHT;
        
        this.screenGrid.clear();
        this.screenGrid.lineStyle(1, 0x666666, 0.3);
        
        // Vertical lines
        for (let x = 0; x <= screenWidth; x += gridSize) {
            this.screenGrid.lineBetween(x, 0, x, screenHeight);
        }
        
        // Horizontal lines
        for (let y = 0; y <= screenHeight; y += gridSize) {
            this.screenGrid.lineBetween(0, y, screenWidth, y);
        }
        
        // Create screen grid labels
        this.screenGridLabels.forEach(label => label.destroy());
        this.screenGridLabels = [];
        
        for (let x = 0; x <= screenWidth; x += gridSize) {
            for (let y = 0; y <= screenHeight; y += gridSize) {
                const label = this.gameObjectFactory.createText(x + 5, y - 15, `${x},${y}`, {
                    fontSize: '12px',
                    color: hexToColorString(0x999999),
                    fontFamily: CLIENT_CONFIG.UI.FONTS.DEFAULT_FAMILY
                }, CLIENT_CONFIG.RENDER_DEPTH.GAME_UI).setOrigin(0, 0);
                
                this.screenGridLabels.push(label);
            }
        }
    }

    private updateCoordinatesDebugPanel(pointer: Phaser.Input.Pointer): void {
        if (!this.coordinatesDebugPanel) return;

        const worldPos = this.screenToWorldCoordinates(pointer.x, pointer.y);
        this.coordinatesDebugPanel.setText(`Screen: ${Math.round(pointer.x)}, ${Math.round(pointer.y)}\nWorld: ${Math.round(worldPos.x)}, ${Math.round(worldPos.y)}`);
    }

    private screenToWorldCoordinates(screenX: number, screenY: number): { x: number; y: number } {
        const camera = this.scene.cameras.main;
        if (!camera) {
            return { x: screenX, y: screenY };
        }
        // Use Phaser's built-in coordinate conversion that properly accounts for zoom
        return camera.getWorldPoint(screenX, screenY);
    }
}
