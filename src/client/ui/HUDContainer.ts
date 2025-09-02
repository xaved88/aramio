import Phaser from 'phaser';

/**
 * HUDContainer is a generic container that automatically assigns all child elements
 * to the HUD camera and ensures they don't appear on the main game camera.
 */
export class HUDContainer {
    private scene: Phaser.Scene;
    private container: Phaser.GameObjects.Container;
    private cameraManager: any = null;
    private elements: Phaser.GameObjects.GameObject[] = [];

    constructor(scene: Phaser.Scene, x: number = 0, y: number = 0) {
        this.scene = scene;
        this.container = scene.add.container(x, y);
        this.container.setScrollFactor(0, 0); // Fixed to screen
    }

    setCameraManager(cameraManager: any): void {
        this.cameraManager = cameraManager;
        // Assign the container itself to HUD camera
        if (this.cameraManager) {
            this.cameraManager.assignToHUDCamera(this.container);
        }
        // Assign all existing elements to HUD camera
        this.elements.forEach(element => {
            if (this.cameraManager) {
                this.cameraManager.assignToHUDCamera(element);
            }
        });
    }

    add(element: Phaser.GameObjects.GameObject): Phaser.GameObjects.GameObject {
        this.container.add(element);
        this.elements.push(element);
        
        // Automatically assign to HUD camera
        if (this.cameraManager) {
            this.cameraManager.assignToHUDCamera(element);
        }
        
        return element;
    }

    addMultiple(elements: Phaser.GameObjects.GameObject[]): Phaser.GameObjects.GameObject[] {
        this.container.add(elements);
        this.elements.push(...elements);
        
        // Automatically assign all to HUD camera
        if (this.cameraManager) {
            elements.forEach(element => {
                this.cameraManager.assignToHUDCamera(element);
            });
        }
        
        return elements;
    }

    remove(element: Phaser.GameObjects.GameObject): void {
        this.container.remove(element);
        const index = this.elements.indexOf(element);
        if (index > -1) {
            this.elements.splice(index, 1);
        }
    }

    setPosition(x: number, y: number): void {
        this.container.setPosition(x, y);
    }

    setVisible(visible: boolean): void {
        this.container.setVisible(visible);
    }

    setDepth(depth: number): void {
        this.container.setDepth(depth);
    }

    destroy(): void {
        this.container.destroy();
        this.elements = [];
    }

    getContainer(): Phaser.GameObjects.Container {
        return this.container;
    }

    getElements(): Phaser.GameObjects.GameObject[] {
        return this.elements;
    }
}
