import Phaser from 'phaser';
import { CLIENT_CONFIG } from '../Config';

/**
 * GameObjectFactory provides a centralized way to create game objects
 * with automatic camera assignment based on depth.
 * 
 * This ensures that all game objects are automatically assigned to the correct camera
 * without requiring manual assignment in each component.
 */
export class GameObjectFactory {
    private scene: Phaser.Scene;
    private cameraManager: any = null;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }

    setCameraManager(cameraManager: any): void {
        this.cameraManager = cameraManager;
    }

    /**
     * Creates a graphics object and automatically assigns it to the correct camera
     */
    createGraphics(x: number = 0, y: number = 0, depth?: number): Phaser.GameObjects.Graphics {
        const graphics = this.scene.add.graphics();
        graphics.setPosition(x, y);
        
        if (depth !== undefined) {
            graphics.setDepth(depth);
        }
        
        this.assignToCorrectCamera(graphics);
        return graphics;
    }

    /**
     * Creates a text object and automatically assigns it to the correct camera
     */
    createText(x: number, y: number, text: string, style?: Phaser.Types.GameObjects.Text.TextStyle, depth?: number): Phaser.GameObjects.Text {
        const textObj = this.scene.add.text(x, y, text, style);
        
        if (depth !== undefined) {
            textObj.setDepth(depth);
        }
        
        this.assignToCorrectCamera(textObj);
        return textObj;
    }

    /**
     * Creates a rectangle object and automatically assigns it to the correct camera
     */
    createRectangle(x: number, y: number, width: number, height: number, fillColor?: number, fillAlpha?: number, depth?: number): Phaser.GameObjects.Rectangle {
        const rectangle = this.scene.add.rectangle(x, y, width, height, fillColor, fillAlpha);
        
        if (depth !== undefined) {
            rectangle.setDepth(depth);
        }
        
        this.assignToCorrectCamera(rectangle);
        return rectangle;
    }

    /**
     * Creates a container and automatically assigns it to the correct camera
     */
    createContainer(x: number = 0, y: number = 0, depth?: number): Phaser.GameObjects.Container {
        const container = this.scene.add.container(x, y);
        
        if (depth !== undefined) {
            container.setDepth(depth);
        }
        
        this.assignToCorrectCamera(container);
        return container;
    }

    /**
     * Creates a sprite and automatically assigns it to the correct camera
     */
    createSprite(x: number, y: number, texture: string, frame?: string | number, depth?: number): Phaser.GameObjects.Sprite {
        const sprite = this.scene.add.sprite(x, y, texture, frame);
        
        if (depth !== undefined) {
            sprite.setDepth(depth);
        }
        
        this.assignToCorrectCamera(sprite);
        return sprite;
    }

    /**
     * Creates an image and automatically assigns it to the correct camera
     */
    createImage(x: number, y: number, texture: string, frame?: string | number, depth?: number): Phaser.GameObjects.Image {
        const image = this.scene.add.image(x, y, texture, frame);
        
        if (depth !== undefined) {
            image.setDepth(depth);
        }
        
        this.assignToCorrectCamera(image);
        return image;
    }

    /**
     * Automatically assigns an object to the correct camera based on its depth
     */
    private assignToCorrectCamera(object: Phaser.GameObjects.GameObject): void {
        if (!this.cameraManager) return;

        // Get depth safely - not all GameObjects have depth property
        const depth = (object as any).depth || 0;
        
        // UI elements (depth >= HUD) go to HUD camera
        if (depth >= CLIENT_CONFIG.RENDER_DEPTH.HUD) {
            this.cameraManager.assignToHUDCamera(object);
        } 
        // Game world elements (depth < HUD) go to main camera
        else {
            this.cameraManager.assignToMainCamera(object);
        }
    }

    /**
     * Manually assigns an object to a specific camera (override automatic assignment)
     */
    assignToHUDCamera(object: Phaser.GameObjects.GameObject): void {
        if (this.cameraManager) {
            this.cameraManager.assignToHUDCamera(object);
        }
    }

    /**
     * Manually assigns an object to a specific camera (override automatic assignment)
     */
    assignToMainCamera(object: Phaser.GameObjects.GameObject): void {
        if (this.cameraManager) {
            this.cameraManager.assignToMainCamera(object);
        }
    }
}
