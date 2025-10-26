import Phaser from 'phaser';
import { CLIENT_CONFIG } from '../../ClientConfig';
import { TextStyleHelper } from '../utils/TextStyleHelper';

export interface Objective {
    text: string;
    completed: boolean;
    started: boolean;
}

export class ObjectivesDisplay {
    private scene: Phaser.Scene;
    private cameraManager: any;
    private container: Phaser.GameObjects.Container | null = null;
    private objectives: Objective[] = [];
    private objectiveTexts: Phaser.GameObjects.Text[] = [];
    private checkboxes: Phaser.GameObjects.Graphics[] = [];

    constructor(scene: Phaser.Scene, cameraManager: any) {
        this.scene = scene;
        this.cameraManager = cameraManager;
        this.container = this.scene.add.container(20, 40);
        this.container.setDepth(CLIENT_CONFIG.RENDER_DEPTH.GAME_UI + 30);
        this.container.setScrollFactor(0, 0);
        this.cameraManager.assignToHUDCamera(this.container);
        this.container.setVisible(true);
    }

    setObjectives(objectives: string[]): void {
        this.objectives = objectives.map(text => ({ text, completed: false, started: false }));
        this.updateDisplay();
    }

    startObjective(index: number): void {
        if (index >= 0 && index < this.objectives.length) {
            this.objectives[index].started = true;
            this.updateDisplay();
        }
    }

    completeObjective(index: number): void {
        if (index >= 0 && index < this.objectives.length && !this.objectives[index].completed) {
            this.objectives[index].completed = true;
            this.updateDisplay();
        }
    }

    private updateDisplay(): void {
        if (!this.container) return;

        // Clear existing display
        this.container.removeAll(true);

        let y = 0;

        // Only show objectives that have been started
        this.objectives.forEach((objective, index) => {
            if (!objective.started) return;
            const checkboxSize = 20;
            const spacing = 25;

            // Checkbox
            const checkbox = this.scene.add.graphics();
            if (objective.completed) {
                // Filled checkbox with checkmark
                checkbox.fillStyle(CLIENT_CONFIG.SELF_COLORS.PRIMARY, 1);
                checkbox.fillRect(0, y, checkboxSize, checkboxSize);
                checkbox.lineStyle(2, CLIENT_CONFIG.UI.COLORS.BORDER);
                checkbox.strokeRect(0, y, checkboxSize, checkboxSize);
                
                // Checkmark
                checkbox.lineStyle(3, 0xffffff);
                checkbox.beginPath();
                checkbox.moveTo(5, y + checkboxSize / 2);
                checkbox.lineTo(8, y + checkboxSize - 5);
                checkbox.lineTo(checkboxSize - 5, y + 5);
                checkbox.strokePath();
            } else {
                // Empty checkbox
                checkbox.lineStyle(2, CLIENT_CONFIG.UI.COLORS.BORDER);
                checkbox.strokeRect(0, y, checkboxSize, checkboxSize);
            }
            this.container!.add(checkbox);

            // Text
            const textStyle = objective.completed 
                ? TextStyleHelper.getStyleWithCustom('BODY_SMALL', {
                    color: '#888888',
                    fontStyle: 'italic'
                })
                : TextStyleHelper.getStyle('BODY_SMALL');
            
            const text = this.scene.add.text(checkboxSize + 10, y + checkboxSize / 2, objective.text, textStyle);
            text.setOrigin(0, 0.5);
            this.container!.add(text);
            
            if (objective.completed) {
                // Draw strikethrough line
                const line = this.scene.add.graphics();
                line.lineStyle(2, 0x888888, 1);
                line.beginPath();
                const textBounds = text.getBounds();
                line.moveTo(textBounds.x, y + checkboxSize / 2);
                line.lineTo(textBounds.x + textBounds.width, y + checkboxSize / 2);
                line.strokePath();
                this.container!.add(line);
            }

            y += spacing;
        });
    }

    destroy(): void {
        if (this.container) {
            this.container.destroy();
            this.container = null;
        }
    }

    show(): void {
        if (this.container) {
            this.container.setVisible(true);
        }
    }

    hide(): void {
        if (this.container) {
            this.container.setVisible(false);
        }
    }
}

