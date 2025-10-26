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
                objective: 'Move around the map'
            },
            {
                stepClass: AutoAttackStep,
                condition: this.autoAttackStepCondition.bind(this),
                objective: 'Defeat enemy minions with your auto-attack'
            },
            {
                stepClass: AbilityStep,
                condition: this.abilityStepCondition.bind(this),
                objective: 'Use your ability to defeat more minions'
            },
            {
                stepClass: XPStep,
                condition: this.xpStepCondition.bind(this),
                objective: 'Reach level 3'
            },
            {
                stepClass: LevelUpStep,
                condition: this.levelUpStepCondition.bind(this),
                objective: 'Die and respawn to collect your rewards'
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
        if (timeSinceLastStep < 4000) return false; // Wait 4 seconds
        
        // Check if hero has moved
        if (!this.trackedState.startingPosition || !gameState.combatants) return false;
        
        for (const combatant of gameState.combatants.values()) {
            if (combatant.type === 'hero' && this.playerSessionId && combatant.controller === this.playerSessionId) {
                const startPos = this.trackedState.startingPosition;
                const dx = Math.abs(combatant.x - startPos.x);
                const dy = Math.abs(combatant.y - startPos.y);
                return dx > 200 || dy > 200; // Has moved at least 50 units
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
                    if (hero.roundStats.damageDealt > 20) {
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
                const hero = combatant as any;
                
                // Require 100+ damage dealt (gives time to use ability)
                if (hero.roundStats && hero.roundStats.damageDealt >= 100) {
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
                // Check if player has reached level 2
                return combatant.level >= 3;
            }
        }
        return false;
    }

    private respawnRewardsStepCondition(gameState: SharedGameState, lastStepCompletedAt: number): boolean {
        return this.trackedState.playerRespawning === true;
    }

    private encouragementStepCondition(gameState: SharedGameState, lastStepCompletedAt: number): boolean {
        return this.trackedState.playerRespawned === true && 
               this.trackedState.playerRespawning === false;
    }
}

