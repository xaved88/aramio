import { GameState } from '../../schema/GameState';
import { Combatant } from '../../schema/Combatants';
import { DamageEvent, KillEvent } from '../../schema/Events';

export class CombatantUtils {
    /**
     * Applies damage to a combatant and dispatches events
     * @param combatant The combatant to damage
     * @param damage Amount of damage to apply
     * @param gameState The game state for event dispatching
     * @param sourceId The ID of the combatant causing the damage
     */
    static damageCombatant(combatant: Combatant, damage: number, gameState: GameState, sourceId: string): void {
        const previousHealth = combatant.getHealth();
        combatant.health = Math.max(0, combatant.health - damage);
        const actualDamage = previousHealth - combatant.getHealth();
        
        // Find the source combatant
        const sourceCombatant = gameState.combatants.get(sourceId);
        
        // Update stats for source combatant (damage dealt)
        if (sourceCombatant && sourceCombatant.type === 'hero') {
            const hero = sourceCombatant as any;
            hero.roundStats.damageDealt += actualDamage;
        }
        
        // Update stats for target combatant (damage taken)
        if (combatant.type === 'hero') {
            const hero = combatant as any;
            hero.roundStats.damageTaken += actualDamage;
        }
        
        // Dispatch damage event if damage was dealt
        if (actualDamage > 0) {
            const damageEvent = new DamageEvent();
            damageEvent.sourceId = sourceId;
            damageEvent.targetId = combatant.id;
            damageEvent.targetType = combatant.type;
            damageEvent.amount = actualDamage;
            damageEvent.timestamp = gameState.gameTime;
            gameState.damageEvents.push(damageEvent);
        }
        
        // Dispatch kill event and update kill stats if combatant was killed
        if (combatant.getHealth() <= 0) {
            const killEvent = new KillEvent();
            killEvent.sourceId = sourceId;
            killEvent.targetId = combatant.id;
            killEvent.targetType = combatant.type;
            killEvent.timestamp = gameState.gameTime;
            gameState.killEvents.push(killEvent);
            
            // Update kill stats for source combatant
            if (sourceCombatant && sourceCombatant.type === 'hero') {
                const hero = sourceCombatant as any;
                switch (combatant.type) {
                    case 'minion':
                        hero.roundStats.minionKills++;
                        break;
                    case 'hero':
                        hero.roundStats.heroKills++;
                        break;
                    case 'turret':
                        hero.roundStats.turretKills++;
                        break;
                }
            }
        }
    }

    /**
     * Heals a combatant up to their maximum health
     * @param combatant The combatant to heal
     * @param healAmount Amount of healing to apply
     */
    static healCombatant(combatant: Combatant, healAmount: number): void {
        combatant.health = Math.min(combatant.getMaxHealth(), combatant.health + healAmount);
    }

    /**
     * Checks if a combatant is alive (health > 0)
     * @param combatant The combatant to check
     * @returns true if the combatant is alive
     */
    static isCombatantAlive(combatant: Combatant): boolean {
        return combatant.getHealth() > 0;
    }

    /**
     * Gets the health percentage of a combatant
     * @param combatant The combatant to check
     * @returns Health percentage as a decimal (0.0 to 1.0)
     */
    static getCombatantHealthPercentage(combatant: Combatant): number {
        return combatant.getHealth() / combatant.getMaxHealth();
    }

    /**
     * Checks if two combatants are on the same team
     * @param combatant1 First combatant
     * @param combatant2 Second combatant
     * @returns true if both combatants are on the same team
     */
    static areSameTeam(combatant1: Combatant, combatant2: Combatant): boolean {
        return combatant1.team === combatant2.team;
    }

    /**
     * Checks if two combatants are on opposing teams
     * @param combatant1 First combatant
     * @param combatant2 Second combatant
     * @returns true if combatants are on different teams
     */
    static areOpposingTeams(combatant1: Combatant, combatant2: Combatant): boolean {
        return combatant1.team !== combatant2.team;
    }

    /**
     * Calculates distance between two combatants
     * @param combatant1 First combatant
     * @param combatant2 Second combatant
     * @returns Distance between the two combatants
     */
    static getDistance(combatant1: Combatant, combatant2: Combatant): number {
        const dx = combatant1.x - combatant2.x;
        const dy = combatant1.y - combatant2.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Checks if a combatant is within a certain range of another
     * @param source The source combatant
     * @param target The target combatant
     * @param range The range to check
     * @returns true if target is within range of source
     */
    static isInRange(source: Combatant, target: Combatant, range: number): boolean {
        return this.getDistance(source, target) <= range;
    }
} 
