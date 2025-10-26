import Phaser from 'phaser';
import { TutorialStep } from './TutorialStep';
import { WelcomeStep } from './steps/WelcomeStep';
import { MovementStep } from './steps/MovementStep';
import { CombatStep } from './steps/CombatStep';
import { HowToPlay } from './steps/HowToPlay';

export type TutorialDefinition = {
    steps: Array<new (scene: Phaser.Scene, onDismiss?: () => void) => TutorialStep>;
};

const TUTORIALS: Record<string, TutorialDefinition> = {
    'basic-tutorial': {
        steps: [
            WelcomeStep,
            MovementStep,
            CombatStep,
        ]
    },
    'how-to-play': {
        steps: [
            HowToPlay,
        ]
    }
};

export class TutorialManager {
    private scene: Phaser.Scene;
    private currentTutorial: TutorialDefinition | null = null;
    private currentStepIndex: number = -1;
    private currentStep: TutorialStep | null = null;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }

    startTutorial(tutorialId: string): void {
        const tutorial = TUTORIALS[tutorialId];
        if (!tutorial) {
            console.warn(`Tutorial '${tutorialId}' not found`);
            return;
        }

        this.currentTutorial = tutorial;
        this.currentStepIndex = -1;
        this.nextStep();
    }

    private nextStep(): void {
        if (!this.currentTutorial) return;

        if (this.currentStep) {
            this.currentStep.destroy();
            this.currentStep = null;
        }

        this.currentStepIndex++;
        
        if (this.currentStepIndex >= this.currentTutorial.steps.length) {
            this.currentTutorial = null;
            this.currentStepIndex = -1;
            this.currentStep = null;
            return;
        }

        const StepClass = this.currentTutorial.steps[this.currentStepIndex];
        this.currentStep = new StepClass(this.scene, () => {
            this.onStepDismissed();
        });

        this.currentStep.show();
    }

    private onStepDismissed(): void {
        this.nextStep();
    }

    destroy(): void {
        if (this.currentStep) {
            this.currentStep.destroy();
            this.currentStep = null;
        }
        this.currentTutorial = null;
        this.currentStepIndex = -1;
    }
}

