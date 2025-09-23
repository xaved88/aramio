import Phaser from 'phaser';
import { CLIENT_CONFIG } from '../ClientConfig';

/**
 * Handles all input schemes and control logic
 */
export class InputHandler {
    private scene: Phaser.Scene;
    private room: any;
    private moveTarget: { x: number; y: number } | null = null;
    private isClickHeld: boolean = false;

    constructor(scene: Phaser.Scene, room: any) {
        this.scene = scene;
        this.room = room;
    }

    setupHandlers(): void {
        if (CLIENT_CONFIG.CONTROLS.SCHEME === 'A') {
            // Scheme A: point to move, click to use ability
            this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
                this.handleAbilityUse(pointer);
            });
        } else if (CLIENT_CONFIG.CONTROLS.SCHEME === 'B') {
            // Scheme B: click to set move target, click to use ability
            this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
                this.handleMoveTarget(pointer);
            });
        } else if (CLIENT_CONFIG.CONTROLS.SCHEME === 'C') {
            // Scheme C: handled by GameScene, no duplicate handlers needed
        } else if (CLIENT_CONFIG.CONTROLS.SCHEME === 'D') {
            // Scheme D: point to move when not clicking, stop moving when clicking
            this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
                this.isClickHeld = true;
                this.moveTarget = null; // Stop moving
                this.handleAbilityUse(pointer);
            });
            
            this.scene.input.on('pointerup', () => {
                this.isClickHeld = false;
            });
        }
    }

    update(): void {
        if (CLIENT_CONFIG.CONTROLS.SCHEME === 'A') {
            // Control scheme A: point to move (original behavior)
            const pointer = this.scene.input.activePointer;
            const worldPos = this.screenToWorldCoordinates(pointer.x, pointer.y);
            this.room.send('move', { 
                targetX: worldPos.x, 
                targetY: worldPos.y 
            });
        } else if (CLIENT_CONFIG.CONTROLS.SCHEME === 'B') {
            // Control scheme B: send continuous movement to target if we have one
            if (this.moveTarget) {
                this.room.send('move', {
                    targetX: this.moveTarget.x,
                    targetY: this.moveTarget.y
                });
            }
        } else if (CLIENT_CONFIG.CONTROLS.SCHEME === 'C') {
            // Control scheme C: move to pointer when not clicking; stop sending move events when clicking
            // Check GameScene's isClickHeld state since GameScene handles Control Scheme C
            const gameScene = this.scene as any;
            if (!gameScene.isClickHeld) {
                const pointer = this.scene.input.activePointer;
                const worldPos = this.screenToWorldCoordinates(pointer.x, pointer.y);
                this.room.send('move', {
                    targetX: worldPos.x,
                    targetY: worldPos.y
                });
            }
            // When clicking (isClickHeld = true), don't send move events - server will continue with last direction
        } else if (CLIENT_CONFIG.CONTROLS.SCHEME === 'D') {
            // Control scheme D: point to move when not clicking, stop moving when clicking
            const pointer = this.scene.input.activePointer;
            if (!pointer.isDown) {
                const worldPos = this.screenToWorldCoordinates(pointer.x, pointer.y);
                this.room.send('move', {
                    targetX: worldPos.x,
                    targetY: worldPos.y
                });
            }
            // if pointer is down, do not emit move commands
        }
    }

    private handleMoveTarget(pointer: Phaser.Input.Pointer): void {
        this.moveTarget = this.screenToWorldCoordinates(pointer.x, pointer.y);
    }

    private handleAbilityUse(pointer: Phaser.Input.Pointer): void {
        const worldPos = this.screenToWorldCoordinates(pointer.x, pointer.y);
        this.room.send('useAbility', { 
            x: worldPos.x, 
            y: worldPos.y 
        });
    }

    private screenToWorldCoordinates(screenX: number, screenY: number): { x: number; y: number } {
        const camera = this.scene.cameras.main;
        if (!camera) {
            console.warn('Camera not available for coordinate conversion');
            return { x: 0, y: 0 };
        }
        return {
            x: camera.scrollX + screenX,
            y: camera.scrollY + screenY
        };
    }
}
