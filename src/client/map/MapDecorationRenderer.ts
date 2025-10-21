import Phaser from 'phaser';
import { GameplayConfig } from '../../server/config/ConfigProvider';
import { CLIENT_CONFIG } from '../../ClientConfig';

export class MapDecorationRenderer {
    private scene: Phaser.Scene;
    private gameplayConfig: GameplayConfig; // Deserialized gameplay configuration
    private cameraManager: any = null;

    constructor(scene: Phaser.Scene, gameplayConfig: GameplayConfig) {
        this.scene = scene;
        this.gameplayConfig = gameplayConfig;
    }

    setCameraManager(cameraManager: any): void {
        this.cameraManager = cameraManager;
    }

    /**
     * Creates a textured path highlight from corner to corner of the map
     */
    createPathHighlight(): void {
        const pathHighlight = this.scene.add.graphics();
        pathHighlight.setDepth(-5); // Background depth
        
        // Assign to main camera
        if (this.cameraManager) {
            this.cameraManager.assignToMainCamera(pathHighlight);
        }
        
        // Get cradle positions
        const blueCradle = this.gameplayConfig.CRADLE_POSITIONS.BLUE;
        const redCradle = this.gameplayConfig.CRADLE_POSITIONS.RED;
        
        // Calculate path dimensions
        const pathWidth = 160; // 80 * 2
        
        // Create circular patterns around each cradle first
        this.drawCradleCircles(pathHighlight, blueCradle, redCradle, pathWidth);
        
        // Create straight path between cradles with gap to avoid overlap
        this.drawStraightCobblestonePath(pathHighlight, blueCradle, redCradle, pathWidth);
        
        // Add corner decorations for orientation
        this.addCornerDecorations(pathHighlight);
        
        // Add scattered decorative stones throughout the map
        this.addScatteredDecorations(pathHighlight, 12, CLIENT_CONFIG.PATH_COLORS.STONE_BASE);
        
    }
    
    /**
     * Draws a straight cobblestone path between the cradles, ending at circle radius distance
     */
    private drawStraightCobblestonePath(
        graphics: Phaser.GameObjects.Graphics,
        start: { x: number, y: number },
        end: { x: number, y: number },
        width: number
    ): void {
        const stoneSize = 16; // 8 * 2
        const stoneSpacing = 24; // 12 * 2
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);
        const rows = Math.ceil(width / stoneSpacing);
        const cols = Math.ceil(length / stoneSpacing);
        
        // Base path color (more muted gray)
        const baseColor = CLIENT_CONFIG.PATH_COLORS.STONE_BASE;
        
        // Add gap between path and circles
        const gapDistance = 90; // 45 * 2
        
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                // Calculate stone position along the straight path
                const progress = col / (cols - 1);
                const centerX = start.x + (end.x - start.x) * progress;
                const centerY = start.y + (end.y - start.y) * progress;
                
                // Skip stones too close to cradles
                const distanceFromStart = Math.sqrt((centerX - start.x) ** 2 + (centerY - start.y) ** 2);
                const distanceFromEnd = Math.sqrt((centerX - end.x) ** 2 + (centerY - end.y) ** 2);
                if (distanceFromStart < gapDistance || distanceFromEnd < gapDistance) continue;
                
                // Calculate offset perpendicular to path direction
                const offset = (row - (rows - 1) / 2) * stoneSpacing;
                const stoneX = centerX + Math.cos(angle + Math.PI / 2) * offset;
                const stoneY = centerY + Math.sin(angle + Math.PI / 2) * offset;
                
                // Add some randomness to stone positions
                const randomOffset = (Math.random() - 0.5) * 2;
                const finalX = stoneX + randomOffset;
                const finalY = stoneY + randomOffset;
                
                // Calculate fade based on distance from center of path
                const totalPathLength = Math.sqrt((end.x - start.x) ** 2 + (end.y - start.y) ** 2);
                const distanceFromCenter = Math.abs(progress - 0.5) * totalPathLength;
                const fadeDistance = totalPathLength * 0.8;
                const fadeAlpha = Math.max(0.4, 0.8 - (distanceFromCenter / fadeDistance)) * 0.7;
                
                // Draw individual stone with fade
                this.drawStoneWithAlpha(graphics, finalX, finalY, stoneSize, baseColor, fadeAlpha);
            }
        }
    }
    
    /**
     * Draws circular cobblestone patterns around each cradle
     */
    private drawCradleCircles(
        graphics: Phaser.GameObjects.Graphics,
        blueCradle: { x: number, y: number },
        redCradle: { x: number, y: number },
        width: number
    ): void {
        const stoneSize = 16; // 8 * 2
        const stoneSpacing = 24; // 12 * 2
        const circleRadius = 120; // 60 * 2
        const baseColor = CLIENT_CONFIG.PATH_COLORS.STONE_BASE;
        
        // Draw circle around blue cradle
        this.drawCircleStones(graphics, blueCradle.x, blueCradle.y, circleRadius, stoneSize, stoneSpacing, baseColor);
        
        // Draw circle around red cradle
        this.drawCircleStones(graphics, redCradle.x, redCradle.y, circleRadius, stoneSize, stoneSpacing, baseColor);
    }
    
    /**
     * Draws stones filling a circular area using concentric circles
     */
    private drawCircleStones(
        graphics: Phaser.GameObjects.Graphics,
        centerX: number,
        centerY: number,
        radius: number,
        stoneSize: number,
        stoneSpacing: number,
        baseColor: number
    ): void {
        // Draw concentric circles to fill the area
        const numCircles = Math.ceil(radius / stoneSpacing);
        
        for (let circle = 0; circle < numCircles; circle++) {
            const currentRadius = (circle * stoneSpacing) + (stoneSpacing / 2);
            
            // Skip if radius is too large
            if (currentRadius > radius) break;
            
            // Calculate number of stones for this circle
            const circumference = 2 * Math.PI * currentRadius;
            const numStones = Math.ceil(circumference / stoneSpacing);
            
            for (let i = 0; i < numStones; i++) {
                const angle = (i / numStones) * Math.PI * 2;
                const stoneX = centerX + Math.cos(angle) * currentRadius;
                const stoneY = centerY + Math.sin(angle) * currentRadius;
                
                // Add some randomness to stone positions
                const randomOffset = (Math.random() - 0.5) * 2;
                const finalX = stoneX + randomOffset;
                const finalY = stoneY + randomOffset;
                
                // Calculate fade based on distance from center (fade outward)
                const distanceFromCenter = currentRadius;
                const fadeDistance = radius * 1.2;
                const fadeAlpha = Math.max(0.3, (distanceFromCenter / fadeDistance));
                
                // Draw individual stone with fade
                this.drawStoneWithAlpha(graphics, finalX, finalY, stoneSize, baseColor, fadeAlpha);
            }
        }
    }
    
    /**
     * Draws a single cobblestone with custom alpha
     */
    private drawStoneWithAlpha(
        graphics: Phaser.GameObjects.Graphics,
        x: number,
        y: number,
        size: number,
        baseColor: number,
        alpha: number
    ): void {
        // Stone shadow
        graphics.fillStyle(CLIENT_CONFIG.PATH_COLORS.STONE_SHADOW, 0.1 * alpha);
        graphics.fillRect(x - size/2 + 1, y - size/2 + 1, size, size);
        
        // Stone base
        graphics.fillStyle(baseColor, 0.15 * alpha);
        graphics.fillRect(x - size/2, y - size/2, size, size);
        
        // Stone highlight
        graphics.fillStyle(CLIENT_CONFIG.PATH_COLORS.STONE_HIGHLIGHT, 0.08 * alpha);
        graphics.fillRect(x - size/2, y - size/2, size, size/3);
        
        // Stone border
        graphics.lineStyle(1, CLIENT_CONFIG.PATH_COLORS.STONE_SHADOW, 0.1 * alpha);
        graphics.strokeRect(x - size/2, y - size/2, size, size);
    }
    
    /**
     * Adds corner stone clusters for orientation
     */
    private addCornerDecorations(graphics: Phaser.GameObjects.Graphics): void {
        const mapWidth = CLIENT_CONFIG.MAP_WIDTH;
        const mapHeight = CLIENT_CONFIG.MAP_HEIGHT;
        const cornerMargin = 80; // Distance from map edges for corners (further out)
        const stoneSize = 12; // Smaller than main path stones
        const baseColor = CLIENT_CONFIG.PATH_COLORS.STONE_BASE;
        
        // Corner decorations - small stone clusters (excluding cradle corners)
        const cornerDecorations = [
            // Top-left corner (further from corner)
            { x: cornerMargin, y: cornerMargin },
            // Bottom-right corner (further from corner)
            { x: mapWidth - cornerMargin, y: mapHeight - cornerMargin }
        ];
        
        cornerDecorations.forEach(corner => {
            this.drawStoneCluster(graphics, corner.x, corner.y, 3, stoneSize, baseColor, 0.4);
        });
    }
    
    /**
     * Draws a small cluster of stones at a given position
     */
    private drawStoneCluster(
        graphics: Phaser.GameObjects.Graphics,
        centerX: number,
        centerY: number,
        stoneCount: number,
        stoneSize: number,
        baseColor: number,
        alpha: number
    ): void {
        // Simple grid-based placement to avoid expensive collision detection
        const spacing = stoneSize * 2;
        const offset = spacing / 2;
        
        for (let i = 0; i < stoneCount; i++) {
            // Simple grid pattern with slight variation
            const gridX = (i % 2) * spacing - offset;
            const gridY = Math.floor(i / 2) * spacing - offset;
            
            // Add small random offset for organic look
            const randomOffsetX = (Math.random() - 0.5) * 8;
            const randomOffsetY = (Math.random() - 0.5) * 8;
            
            const stoneX = centerX + gridX + randomOffsetX;
            const stoneY = centerY + gridY + randomOffsetY;
            
            // Simple size variation
            const finalSize = stoneSize * (0.9 + Math.random() * 0.2);
            
            this.drawStoneWithAlpha(graphics, stoneX, stoneY, finalSize, baseColor, alpha);
        }
    }
    
    /**
     * Adds scattered decorative stone clusters throughout the map
     */
    private addScatteredDecorations(
        graphics: Phaser.GameObjects.Graphics,
        stoneSize: number,
        baseColor: number
    ): void {
        // Simplified positions - closer to edges and more bottom middle coverage
        const clusterPositions = [
            // Top-left quadrant (closer to edges)
            { x: 150, y: 200, size: 2, alpha: 0.4 },
            { x: 380, y: 220, size: 1, alpha: 0.4 },
            { x: 200, y: 450, size: 2, alpha: 0.5 },
            
            // Top-middle and top-right quadrant (closer to edges)
            { x: 650, y: 150, size: 2, alpha: 0.4 },
            { x: 800, y: 250, size: 1, alpha: 0.4 },
            { x: 490, y: 550, size: 2, alpha: 0.4 },
            { x: 1250, y: 160, size: 1, alpha: 0.5 },
            { x: 950, y: 300, size: 2, alpha: 0.4 },
            { x: 1350, y: 100, size: 1, alpha: 0.5 },
            
            // Bottom-left quadrant (closer to edges)
            { x: 220, y: 1220, size: 2, alpha: 0.4 },
            { x: 550, y: 1240, size: 1, alpha: 0.4 },
            { x: 100, y: 950, size: 2, alpha: 0.5 },
            
            // Bottom-middle (more coverage)
            { x: 700, y: 1050, size: 1, alpha: 0.4 },
            { x: 800, y: 1300, size: 2, alpha: 0.4 },
            { x: 950, y: 870, size: 2, alpha: 0.3 },
            
            // Bottom-right quadrant (closer to edges)
            { x: 1100, y: 1150, size: 1, alpha: 0.5 },
            { x: 1250, y: 750, size: 2, alpha: 0.4 },
            { x: 1350, y: 1180, size: 2, alpha: 0.4 },
        ];
        
        // Place clusters with simple variation
        clusterPositions.forEach(pos => {
            const offsetX = (Math.random() - 0.5) * 20;
            const offsetY = (Math.random() - 0.5) * 20;
            this.drawStoneCluster(graphics, pos.x + offsetX, pos.y + offsetY, pos.size, stoneSize, baseColor, pos.alpha);
        });
    }
    
    
}
