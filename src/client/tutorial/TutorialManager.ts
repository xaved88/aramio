import Phaser from 'phaser';
import { TutorialStep } from './TutorialStep';
import { HowToPlay } from './steps/HowToPlay';
import { SharedGameState } from '../../shared/types/GameStateTypes';
import { BasicTutorialManager } from './BasicTutorial';
import { ObjectivesDisplay } from './ObjectivesDisplay';

export type TutorialStepCondition = (gameState: SharedGameState, lastStepCompletedAt: number) => boolean;

export interface TutorialStepDefinition {
    stepClass: new (scene: Phaser.Scene, onDismiss?: () => void, room?: any) => TutorialStep;
    condition: TutorialStepCondition;
    objective?: string;
}

export type TutorialDefinition = {
    steps: Array<TutorialStepDefinition>;
};

const TUTORIALS: Record<string, TutorialDefinition> = {
    'basic-tutorial': {
        steps: [] // Will be populated dynamically
    },
    'how-to-play': {
        steps: [
            { stepClass: HowToPlay, condition: (gs, ts) => true, objective: '' },
        ]
    }
};

export class TutorialManager {
    private scene: Phaser.Scene;
    private room: any;
    private playerSessionId: string | null = null;
    private currentTutorial: TutorialDefinition | null = null;
    private currentStepIndex: number = -1;
    private currentStep: TutorialStep | null = null;
    private lastStepCompletedAt: number = 0;
    private trackedState: any = {}; // For tracking player actions
    private basicTutorialManager: BasicTutorialManager | null = null;
    private objectivesDisplay: ObjectivesDisplay | null = null;

    constructor(scene: Phaser.Scene, room: any, cameraManager: any) {
        this.scene = scene;
        this.room = room;
        if (room && room.sessionId) {
            this.playerSessionId = room.sessionId;
        }
        this.basicTutorialManager = new BasicTutorialManager();
        this.objectivesDisplay = new ObjectivesDisplay(scene, cameraManager);
    }

    setPlayerSessionId(sessionId: string | null): void {
        this.playerSessionId = sessionId;
        if (this.basicTutorialManager) {
            this.basicTutorialManager.setPlayerSessionId(sessionId);
        }
    }

    startTutorial(tutorialId: string): void {
        const tutorial = TUTORIALS[tutorialId];
        if (!tutorial) {
            console.warn(`Tutorial '${tutorialId}' not found`);
            return;
        }

        // For basic-tutorial, populate steps dynamically with proper manager reference
        if (tutorialId === 'basic-tutorial' && this.basicTutorialManager) {
            this.basicTutorialManager.setPlayerSessionId(this.playerSessionId);
            this.basicTutorialManager.setTrackedState(this.trackedState);
            tutorial.steps = this.basicTutorialManager.getTutorialSteps();
        }

        // Initialize objectives display (but don't show anything yet)
        if (this.objectivesDisplay && tutorial.steps.length > 0) {
            const objectives = tutorial.steps.map(step => step.objective).filter((obj): obj is string => obj !== undefined);
            this.objectivesDisplay.setObjectives(objectives);
            // Don't show yet - will show as steps are reached
        }

        this.currentTutorial = tutorial;
        this.currentStepIndex = -1;
        this.lastStepCompletedAt = Date.now();
        if (this.basicTutorialManager) {
            this.basicTutorialManager.setLastStepCompletedAt(Date.now());
        }
        this.trackedState = {
            startingPosition: null,
            autoAttacksDone: 0,
            abilitiesUsed: 0,
            minionsKilled: 0,
            wasRespawning: false,
            playerRespawning: false
        };
        if (this.basicTutorialManager) {
            this.basicTutorialManager.setTrackedState(this.trackedState);
        }
    }

    update(gameState: SharedGameState): void {
        if (!this.currentTutorial) return;

        // Initialize starting position if not set
        if (this.trackedState.startingPosition === null && gameState.combatants) {
            for (const combatant of gameState.combatants.values()) {
                if (combatant.type === 'hero' && this.playerSessionId && combatant.controller === this.playerSessionId) {
                    this.trackedState.startingPosition = { x: combatant.x, y: combatant.y };
                    break;
                }
            }
        }

        // Update tracked state from game state
        this.updateTrackedState(gameState);
        
        // Update the basic tutorial manager with new state
        if (this.basicTutorialManager) {
            this.basicTutorialManager.setTrackedState(this.trackedState);
        }

        // Check if we need to advance to the next step
        if (this.currentStep === null && this.currentStepIndex < this.currentTutorial.steps.length) {
            if (this.currentStepIndex === -1) {
                // Special case: first step should show immediately
                this.currentStepIndex = 0;
                this.showCurrentStep();
            } else {
                // Check if current step should be shown based on condition
                const stepDef = this.currentTutorial.steps[this.currentStepIndex];
                if (stepDef.condition(gameState, this.lastStepCompletedAt)) {
                    this.showCurrentStep();
                }
            }
        }
    }

    private updateTrackedState(gameState: SharedGameState): void {
        // Track minions killed
        if (gameState.killEvents) {
            this.trackedState.minionsKilled = gameState.killEvents.length;
        }

        // Track if player has respawned (was respawning, now alive)
        if (gameState.combatants) {
            for (const combatant of gameState.combatants.values()) {
                if (combatant.type === 'hero' && this.playerSessionId && combatant.controller === this.playerSessionId) {
                    if (combatant.state === 'alive') {
                        // Check if we were tracking a respawn
                        if (this.trackedState.wasRespawning) {
                            this.trackedState.playerRespawned = true;
                            this.trackedState.wasRespawning = false;
                        }
                        this.trackedState.playerRespawning = false;
                    } else if (combatant.state === 'respawning') {
                        this.trackedState.playerRespawning = true;
                        this.trackedState.wasRespawning = true;
                    }
                    break;
                }
            }
        }
    }

    private showCurrentStep(): void {
        if (!this.currentTutorial || this.currentStepIndex < 0) return;

        // Mark the PREVIOUS objective as complete when showing the next step
        if (this.objectivesDisplay && this.currentStepIndex > 0) {
            this.objectivesDisplay.completeObjective(this.currentStepIndex - 1);
        }

        const stepDef = this.currentTutorial.steps[this.currentStepIndex];
        this.currentStep = new stepDef.stepClass(this.scene, () => {
            this.onStepDismissed();
        }, this.room);

        // Show this objective when the step is displayed
        if (this.objectivesDisplay) {
            this.objectivesDisplay.startObjective(this.currentStepIndex);
        }

        this.currentStep.show();
    }

    private onStepDismissed(): void {
        if (this.currentStep) {
            this.currentStep.destroy();
            this.currentStep = null;
        }

        this.lastStepCompletedAt = Date.now();
        if (this.basicTutorialManager) {
            this.basicTutorialManager.setLastStepCompletedAt(Date.now());
            this.basicTutorialManager.setTrackedState(this.trackedState);
        }
        this.currentStepIndex++;

        if (this.currentStepIndex >= this.currentTutorial!.steps.length) {
            // Tutorial finished - unpause the game if it was paused
            if (this.room) {
                this.room.send('unpause');
            }
            if (this.objectivesDisplay) {
                this.objectivesDisplay.hide();
            }
            this.currentTutorial = null;
            this.currentStepIndex = -1;
            this.currentStep = null;
        } else {
            // Don't show the next step immediately - wait for condition
            this.currentStep = null;
        }
    }

    destroy(): void {
        if (this.currentStep) {
            this.currentStep.destroy();
            this.currentStep = null;
        }
        
        if (this.objectivesDisplay) {
            this.objectivesDisplay.destroy();
            this.objectivesDisplay = null;
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

