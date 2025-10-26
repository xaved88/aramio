import { TutorialStepDefinition } from './TutorialManager';
import { SharedGameState } from '../../shared/types/GameStateTypes';
import { MovementStep } from './steps/MovementStep';
import { AutoAttackStep } from './steps/AutoAttackStep';
import { AbilityStep } from './steps/AbilityStep';
import { XPStep } from './steps/XPStep';
import { LevelUpStep } from './steps/LevelUpStep';
import { RespawnRewardsStep } from './steps/RespawnRewardsStep';
import { EncouragementStep } from './steps/EncouragementStep';

export class BasicTutorialManager {
    private playerSessionId: string | null = null;
    private trackedState: any = {};
    private lastStepCompletedAt: number = 0;

    setPlayerSessionId(sessionId: string | null): void {
        this.playerSessionId = sessionId;
    }

    setTrackedState(state: any): void {
        this.trackedState = state;
    }

    setLastStepCompletedAt(timestamp: number): void {
        this.lastStepCompletedAt = timestamp;
    }

    getTutorialSteps(): TutorialStepDefinition[] {
        return [
            {
                stepClass: MovementStep,
                condition: this.movementStepCondition.bind(this),
                objective: 'Take your first steps'
            },
            {
                stepClass: AutoAttackStep,
                condition: this.autoAttackStepCondition.bind(this),
                objective: 'Attack enemy minions'
            },
            {
                stepClass: AbilityStep,
                condition: this.abilityStepCondition.bind(this),
                objective: 'Cast your ability'
            },
            {
                stepClass: XPStep,
                condition: this.xpStepCondition.bind(this),
                objective: 'Gain experience'
            },
            {
                stepClass: LevelUpStep,
                condition: this.levelUpStepCondition.bind(this),
                objective: 'Level up'
            },
            {
                stepClass: RespawnRewardsStep,
                condition: this.respawnRewardsStepCondition.bind(this),
                objective: 'Collect your rewards'
            },
            {
                stepClass: EncouragementStep,
                condition: this.encouragementStepCondition.bind(this),
                objective: 'Finish the tutorial'
            }
        ];
    }

    private movementStepCondition(gameState: SharedGameState, lastStepCompletedAt: number): boolean {
        return true; // Show immediately
    }

    private autoAttackStepCondition(gameState: SharedGameState, lastStepCompletedAt: number): boolean {
        const timeSinceLastStep = Date.now() - lastStepCompletedAt;
        if (timeSinceLastStep < 3000) return false; // Wait 3 seconds
        
        // Check if hero has moved
        if (!this.trackedState.startingPosition || !gameState.combatants) return false;
        
        for (const combatant of gameState.combatants.values()) {
            if (combatant.type === 'hero' && this.playerSessionId && combatant.controller === this.playerSessionId) {
                const startPos = this.trackedState.startingPosition;
                const dx = Math.abs(combatant.x - startPos.x);
                const dy = Math.abs(combatant.y - startPos.y);
                return dx > 10 || dy > 10; // Has moved at least 10 units
            }
        }
        return false;
    }

    private abilityStepCondition(gameState: SharedGameState, lastStepCompletedAt: number): boolean {
        // Track damage dealt - using roundStats.damageDealt
        if (!gameState.combatants) return false;
        
        for (const combatant of gameState.combatants.values()) {
            if (combatant.type === 'hero' && this.playerSessionId && combatant.controller === this.playerSessionId) {
                const hero = combatant as any;
                if (hero.roundStats && hero.roundStats.damageDealt) {
                    // Check if hero has dealt damage (any amount means they've been attacking)
                    if (hero.roundStats.damageDealt > 0) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    private xpStepCondition(gameState: SharedGameState, lastStepCompletedAt: number): boolean {
        const timeSinceLastStep = Date.now() - lastStepCompletedAt;
        if (timeSinceLastStep < 3000) return false; // Wait 3 seconds
        
        if (!gameState.combatants) return false;
        
        for (const combatant of gameState.combatants.values()) {
            if (combatant.type === 'hero' && this.playerSessionId && combatant.controller === this.playerSessionId) {
                // Check if player has gained some XP (5 points)
                if (combatant.experience >= 5) {
                    return true;
                }
            }
        }
        return false;
    }

    private levelUpStepCondition(gameState: SharedGameState, lastStepCompletedAt: number): boolean {
        const timeSinceLastStep = Date.now() - lastStepCompletedAt;
        if (timeSinceLastStep < 3000) return false; // Wait 3 seconds
        
        if (!gameState.combatants) return false;
        
        for (const combatant of gameState.combatants.values()) {
            if (combatant.type === 'hero' && this.playerSessionId && combatant.controller === this.playerSessionId) {
                // Check if player has leveled up (experienceNeeded suggests they've gained a level)
                // Or if they're at level 2 or higher
                return combatant.level >= 2 || (combatant.experience >= 0 && combatant.experienceNeeded > 0);
            }
        }
        return false;
    }

    private respawnRewardsStepCondition(gameState: SharedGameState, lastStepCompletedAt: number): boolean {
        return this.trackedState.playerRespawning === true;
    }

    private encouragementStepCondition(gameState: SharedGameState, lastStepCompletedAt: number): boolean {
        return this.trackedState.playerRespawned === true;
    }
}

