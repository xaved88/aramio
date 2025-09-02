import Phaser from 'phaser';
import { GAMEPLAY_CONFIG } from '../Config';

export class PathRenderer {
    private scene: Phaser.Scene;
    private cameraManager: any = null;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
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
        const blueCradle = GAMEPLAY_CONFIG.CRADLE_POSITIONS.BLUE;
        const redCradle = GAMEPLAY_CONFIG.CRADLE_POSITIONS.RED;
        
        // Calculate path dimensions
        const pathWidth = 80;
        const dx = redCradle.x - blueCradle.x;
        const dy = redCradle.y - blueCradle.y;
        const pathLength = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);
        
        // Create cobblestone pattern along the path
        this.drawCobblestonePath(pathHighlight, blueCradle, redCradle, pathWidth, pathLength, angle);
        
        // Add gradient fade at the edges
        this.addPathGradient(pathHighlight, blueCradle, redCradle, pathWidth, pathLength, angle);
        
        // Add subtle border
        pathHighlight.lineStyle(2, 0xffffff, 0.05);
        pathHighlight.strokeCircle(blueCradle.x, blueCradle.y, pathWidth / 2);
        pathHighlight.strokeCircle(redCradle.x, redCradle.y, pathWidth / 2);
    }
    
    /**
     * Draws a cobblestone pattern along the path
     */
    private drawCobblestonePath(
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
        
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                // Calculate stone position along the path
                const progress = col / (cols - 1);
                const centerX = start.x + (end.x - start.x) * progress;
                const centerY = start.y + (end.y - start.y) * progress;
                
                // Calculate offset perpendicular to path direction
                const offset = (row - (rows - 1) / 2) * stoneSpacing;
                const stoneX = centerX + Math.cos(angle + Math.PI / 2) * offset;
                const stoneY = centerY + Math.sin(angle + Math.PI / 2) * offset;
                
                // Add some randomness to stone positions
                const randomOffset = (Math.random() - 0.5) * 2;
                const finalX = stoneX + randomOffset;
                const finalY = stoneY + randomOffset;
                
                // Draw individual stone
                this.drawStone(graphics, finalX, finalY, stoneSize, baseColor);
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
