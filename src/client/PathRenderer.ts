import Phaser from 'phaser';
import { GameplayConfig } from '../server/config/ConfigProvider';

export class PathRenderer {
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
        const pathWidth = 80;
        const dx = redCradle.x - blueCradle.x;
        const dy = redCradle.y - blueCradle.y;
        const pathLength = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);
        
        // Create circular patterns around each cradle first
        this.drawCradleCircles(pathHighlight, blueCradle, redCradle, pathWidth);
        
        // Create straight path between cradles with gap to avoid overlap
        this.drawStraightCobblestonePath(pathHighlight, blueCradle, redCradle, pathWidth, pathLength, angle);
        
        // Add gradient fade at the edges
        this.addPathGradient(pathHighlight, blueCradle, redCradle, pathWidth, pathLength, angle);
        
    }
    
    /**
     * Draws a straight cobblestone path between the cradles, ending at circle radius distance
     */
    private drawStraightCobblestonePath(
        graphics: Phaser.GameObjects.Graphics,
        start: { x: number, y: number },
        end: { x: number, y: number },
        width: number,
        length: number,
        angle: number
    ): void {
        const stoneSize = 8;
        const stoneSpacing = 12;
        const rows = Math.ceil(width / stoneSpacing);
        const cols = Math.ceil(length / stoneSpacing);
        
        // Base path color (more muted gray)
        const baseColor = 0x6B6B6B;
        
        // Add gap between path and circles
        const gapDistance = 45;
        
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
                const fadeAlpha = Math.max(0.5, 1 - (distanceFromCenter / fadeDistance));
                
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
        const stoneSize = 8;
        const stoneSpacing = 12;
        const circleRadius = 60;
        const baseColor = 0x6B6B6B;
        
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
                const fadeDistance = radius * 0.8; // Start fading at 70% from center
                const fadeAlpha = Math.max(0.3, (distanceFromCenter / fadeDistance));
                
                // Draw individual stone with fade
                this.drawStoneWithAlpha(graphics, finalX, finalY, stoneSize, baseColor, fadeAlpha);
            }
        }
    }
    
    /**
     * Draws a single cobblestone
     */
    private drawStone(
        graphics: Phaser.GameObjects.Graphics,
        x: number,
        y: number,
        size: number,
        baseColor: number
    ): void {
        // Stone shadow
        graphics.fillStyle(0x5A5A5A, 0.1);
        graphics.fillRect(x - size/2 + 1, y - size/2 + 1, size, size);
        
        // Stone base
        graphics.fillStyle(baseColor, 0.15);
        graphics.fillRect(x - size/2, y - size/2, size, size);
        
        // Stone highlight
        graphics.fillStyle(0x7A7A7A, 0.08);
        graphics.fillRect(x - size/2, y - size/2, size, size/3);
        
        // Stone border
        graphics.lineStyle(1, 0x5A5A5A, 0.1);
        graphics.strokeRect(x - size/2, y - size/2, size, size);
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
        graphics.fillStyle(0x5A5A5A, 0.1 * alpha);
        graphics.fillRect(x - size/2 + 1, y - size/2 + 1, size, size);
        
        // Stone base
        graphics.fillStyle(baseColor, 0.15 * alpha);
        graphics.fillRect(x - size/2, y - size/2, size, size);
        
        // Stone highlight
        graphics.fillStyle(0x7A7A7A, 0.08 * alpha);
        graphics.fillRect(x - size/2, y - size/2, size, size/3);
        
        // Stone border
        graphics.lineStyle(1, 0x5A5A5A, 0.1 * alpha);
        graphics.strokeRect(x - size/2, y - size/2, size, size);
    }
    
    /**
     * Adds a gradient overlay to fade the path edges
     */
    private addPathGradient(
        graphics: Phaser.GameObjects.Graphics,
        start: { x: number, y: number },
        end: { x: number, y: number },
        width: number,
        length: number,
        angle: number
    ): void {
        const gradientSteps = 6;
        
        for (let i = 0; i < gradientSteps; i++) {
            const progress = i / (gradientSteps - 1);
            const currentWidth = width * (1 - progress * 0.2); // Less taper
            
            // Create gradient mask effect by drawing semi-transparent overlays
            const alpha = 0.01 + (progress * 0.03);
            graphics.lineStyle(currentWidth, 0x2c3e50, alpha);
            graphics.beginPath();
            graphics.moveTo(start.x, start.y);
            graphics.lineTo(end.x, end.y);
            graphics.strokePath();
        }
    }
}
