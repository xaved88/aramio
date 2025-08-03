import { Combatant } from '../../schema/GameState';

export class CombatantUtils {
    /**
     * Applies damage to a combatant and returns whether they died
     * @param combatant The combatant to damage
     * @param damage Amount of damage to apply
     * @returns true if the combatant died (health <= 0)
     */
    static damageCombatant(combatant: Combatant, damage: number): boolean {
        combatant.health = Math.max(0, combatant.health - damage);
        return combatant.health <= 0;
    }

    /**
     * Heals a combatant up to their maximum health
     * @param combatant The combatant to heal
     * @param healAmount Amount of healing to apply
     */
    static healCombatant(combatant: Combatant, healAmount: number): void {
        combatant.health = Math.min(combatant.maxHealth, combatant.health + healAmount);
    }

    /**
     * Checks if a combatant is alive (health > 0)
     * @param combatant The combatant to check
     * @returns true if the combatant is alive
     */
    static isCombatantAlive(combatant: Combatant): boolean {
        return combatant.health > 0;
    }

    /**
     * Gets the health percentage of a combatant
     * @param combatant The combatant to check
     * @returns Health percentage as a decimal (0.0 to 1.0)
     */
    static getCombatantHealthPercentage(combatant: Combatant): number {
        return combatant.health / combatant.maxHealth;
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
