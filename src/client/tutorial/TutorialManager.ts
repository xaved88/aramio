import Phaser from 'phaser';
import { TutorialStep } from './TutorialStep';
import { WelcomeStep } from './steps/WelcomeStep';
import { MovementStep } from './steps/MovementStep';
import { AutoAttackStep } from './steps/AutoAttackStep';
import { AbilityStep } from './steps/AbilityStep';
import { XPStep } from './steps/XPStep';
import { LevelUpStep } from './steps/LevelUpStep';
import { RespawnRewardsStep } from './steps/RespawnRewardsStep';
import { EncouragementStep } from './steps/EncouragementStep';
import { HowToPlay } from './steps/HowToPlay';

export type TutorialDefinition = {
    steps: Array<new (scene: Phaser.Scene, onDismiss?: () => void, room?: any) => TutorialStep>;
};

const TUTORIALS: Record<string, TutorialDefinition> = {
    'basic-tutorial': {
        steps: [
            MovementStep,
            AutoAttackStep,
            AbilityStep,
            XPStep,
            LevelUpStep,
            RespawnRewardsStep,
            EncouragementStep,
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
    private room: any;
    private currentTutorial: TutorialDefinition | null = null;
    private currentStepIndex: number = -1;
    private currentStep: TutorialStep | null = null;

    constructor(scene: Phaser.Scene, room: any) {
        this.scene = scene;
        this.room = room;
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
            // Tutorial finished - unpause the game if it was paused
            if (this.room) {
                this.room.send('unpause');
            }
            this.currentTutorial = null;
            this.currentStepIndex = -1;
            this.currentStep = null;
            return;
        }

        const StepClass = this.currentTutorial.steps[this.currentStepIndex];
        this.currentStep = new StepClass(this.scene, () => {
            this.onStepDismissed();
        }, this.room);

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
        
        // Make sure game is unpaused when destroying tutorial manager
        if (this.room) {
            this.room.send('unpause');
        }
        
        this.currentTutorial = null;
        this.currentStepIndex = -1;
    }

    isTutorialActive(): boolean {
        return this.currentStep !== null;
    }
}

