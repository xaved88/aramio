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
            // Scheme C: point to move when not clicking, hold position when clicking
            this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
                this.isClickHeld = true;
                this.moveTarget = this.screenToWorldCoordinates(pointer.x, pointer.y);
                this.handleAbilityUse(pointer);
            });
            
            this.scene.input.on('pointerup', () => {
                this.isClickHeld = false;
                this.moveTarget = null;
            });
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
            // Control scheme C: point to move when not clicking, hold position when clicking
            if (!this.isClickHeld) {
                const pointer = this.scene.input.activePointer;
                const worldPos = this.screenToWorldCoordinates(pointer.x, pointer.y);
                this.room.send('move', { 
                    targetX: worldPos.x, 
                    targetY: worldPos.y 
                });
            } else if (this.moveTarget) {
                // When click is held, keep moving to the click-down position
                this.room.send('move', {
                    targetX: this.moveTarget.x,
                    targetY: this.moveTarget.y
                });
            }
        } else if (CLIENT_CONFIG.CONTROLS.SCHEME === 'D') {
            // Control scheme D: point to move when not clicking, stop moving when clicking
            if (!this.isClickHeld) {
                const pointer = this.scene.input.activePointer;
                const worldPos = this.screenToWorldCoordinates(pointer.x, pointer.y);
                this.room.send('move', { 
                    targetX: worldPos.x, 
                    targetY: worldPos.y 
                });
            }
            // When click is held, don't send move commands (stop moving)
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
