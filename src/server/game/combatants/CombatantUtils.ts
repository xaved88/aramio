import { GameState } from '../../schema/GameState';
import { Combatant } from '../../schema/Combatants';
import { DamageEvent, KillEvent, DeathEffectEvent } from '../../schema/Events';
import { ReflectEffect } from '../../schema/Effects';

export type DamageSource = 'auto-attack' | 'ability';

export class CombatantUtils {
    /**
     * Applies damage to a combatant and dispatches events
     * @param combatant The combatant to damage
     * @param damage Amount of damage to apply
     * @param gameState The game state for event dispatching
     * @param sourceId The ID of the combatant causing the damage
     * @param damageSource The source of damage for armor calculation
     * @param isReflectDamage Whether this damage is from a reflect effect (prevents infinite loops)
     */
    static damageCombatant(combatant: Combatant, damage: number, gameState: GameState, sourceId: string, damageSource: DamageSource = 'auto-attack', isReflectDamage: boolean = false): void {
        // Apply armor reduction
        const reducedDamage = this.calculateArmorReduction(combatant, damage, damageSource);
        
        const previousHealth = combatant.getHealth();
        combatant.health = Math.max(0, combatant.health - reducedDamage);
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
            // Update last damage time and remove passive healing effects
            combatant.lastDamageTime = gameState.gameTime;
            this.removePassiveHealingEffects(combatant);
            
            const damageEvent = new DamageEvent();
            damageEvent.sourceId = sourceId;
            damageEvent.targetId = combatant.id;
            damageEvent.targetType = combatant.type;
            damageEvent.amount = actualDamage;
            damageEvent.originalAmount = damage; // Store original damage before armor reduction
            damageEvent.timestamp = gameState.gameTime;
            damageEvent.damageSource = damageSource;
            gameState.damageEvents.push(damageEvent);

            // Check for reflect effects and apply reflect damage (only if this isn't already reflect damage)
            if (!isReflectDamage) {
                this.handleReflectDamage(combatant, actualDamage, gameState, sourceId, damageSource);
            }
        }
        
        // Dispatch kill event and update kill stats if combatant was killed
        if (combatant.getHealth() <= 0) {
            const killEvent = new KillEvent();
            killEvent.sourceId = sourceId;
            killEvent.targetId = combatant.id;
            killEvent.targetType = combatant.type;
            killEvent.timestamp = gameState.gameTime;
            gameState.killEvents.push(killEvent);
            
            // Create death effect event for visual effects
            const deathEffectEvent = new DeathEffectEvent();
            deathEffectEvent.targetId = combatant.id;
            deathEffectEvent.targetType = combatant.type;
            deathEffectEvent.x = combatant.x;
            deathEffectEvent.y = combatant.y;
            deathEffectEvent.team = combatant.team;
            deathEffectEvent.timestamp = gameState.gameTime;
            gameState.deathEffectEvents.push(deathEffectEvent);
            
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
     * Calculates damage reduction based on armor
     * @param combatant The combatant taking damage
     * @param damage Original damage amount
     * @param damageSource Source of the damage for armor type selection
     * @returns Reduced damage after armor calculation
     */
    private static calculateArmorReduction(combatant: Combatant, damage: number, damageSource: DamageSource): number {
        const armor = damageSource === 'auto-attack' ? combatant.getBulletArmor() : combatant.getAbilityArmor();
        
        // Formula: damage dealt = damage * (1 - armor / (armor + 100))
        const damageMultiplier = 1 - (armor / (armor + 100));
        
        return damage * damageMultiplier;
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
     * Removes passive healing effects from a combatant
     * @param combatant The combatant to remove effects from
     */
    static removePassiveHealingEffects(combatant: Combatant): void {
        if (!combatant.effects) return;
        
        // Remove passive healing effects by index (in reverse order to maintain indices)
        for (let i = combatant.effects.length - 1; i >= 0; i--) {
            const effect = combatant.effects[i];
            if (effect && effect.type === 'passive_healing') {
                combatant.effects.splice(i, 1);
            }
        }
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
        const distance = this.getDistance(source, target);
        // Account for target's size - check if any part of target is within range
        return distance <= range + target.size;
    }

    /**
     * Handles reflect damage effects
     * @param combatant The combatant that took damage and might have reflect
     * @param actualDamage The damage taken (after armor reduction)
     * @param gameState The game state for applying reflect damage
     * @param sourceId The ID of the original attacker
     * @param damageSource The type of damage source
     */
    private static handleReflectDamage(combatant: Combatant, actualDamage: number, gameState: GameState, sourceId: string, damageSource: DamageSource): void {
        const sourceCombatant = gameState.combatants.get(sourceId);
        if (!sourceCombatant) return;

        // Only reflect damage to heroes and minions, not structures
        if (sourceCombatant.type !== 'hero' && sourceCombatant.type !== 'minion') {
            return;
        }

        // Find all reflect effects on the combatant that took damage
        const reflectEffects = Array.from(combatant.effects).filter(effect => 
            effect != null && effect.type === 'reflect'
        ) as ReflectEffect[];

        for (const reflectEffect of reflectEffects) {
            if (reflectEffect.reflectPercentage && reflectEffect.reflectPercentage > 0) {
                // Calculate reflect damage (percentage of actual damage taken)
                const reflectDamage = (actualDamage * reflectEffect.reflectPercentage) / 100;
                
                // Apply reflect damage back to the attacker (same damage type)
                if (reflectDamage > 0 && sourceId !== combatant.id) {
                    // Mark as reflect damage to prevent infinite loops
                    this.damageCombatant(sourceCombatant, reflectDamage, gameState, combatant.id, damageSource, true);
                }
            }
        }
    }
} 
