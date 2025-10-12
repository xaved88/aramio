import { GameState } from '../../schema/GameState';
import { Combatant } from '../../schema/Combatants';
import { DamageEvent, KillEvent, DeathEffectEvent, KillStreakEvent } from '../../schema/Events';
import { ReflectEffect } from '../../schema/Effects';
import { GAMEPLAY_CONFIG } from '../../../GameConfig';
import { ZONE_TYPES } from '../../../shared/types/CombatantTypes';

export type DamageSource = 'auto-attack' | 'ability' | 'burn';

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
        const newHealth = Math.max(0, previousHealth - reducedDamage);
        combatant.health = newHealth;
        const actualDamage = previousHealth - newHealth;
        
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
                this.handleReflectDamage(combatant, damage, gameState, sourceId, damageSource);
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
            
            // Update death stats for victim if it's a hero
            if (combatant.type === 'hero') {
                const victimHero = combatant as any;
                victimHero.roundStats.deaths++;
            }
            
            // Update kill stats for source combatant
            if (sourceCombatant && sourceCombatant.type === 'hero') {
                const hero = sourceCombatant as any;
                switch (combatant.type) {
                    case 'minion':
                        hero.roundStats.minionKills++;
                        break;
                    case 'hero':
                        hero.roundStats.heroKills++;
                        // Only count hero kills for kill streaks
                        hero.roundStats.currentKillStreak++;
                        
                        // Check for kill streak achievements (5, 10, and 15 kills)
                        if (hero.roundStats.currentKillStreak === 5 || hero.roundStats.currentKillStreak === 10 || hero.roundStats.currentKillStreak === 15) {
                            const killStreakEvent = new KillStreakEvent();
                            killStreakEvent.heroId = hero.id;
                            killStreakEvent.heroName = hero.displayName;
                            killStreakEvent.team = hero.team;
                            killStreakEvent.killStreak = hero.roundStats.currentKillStreak;
                            killStreakEvent.timestamp = gameState.gameTime;
                            gameState.killStreakEvents.push(killStreakEvent);
                        }
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
        // Burn damage is true damage and bypasses armor
        if (damageSource === 'burn') {
            return damage;
        }
        
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
     * @param originalDamage The original incoming damage (before armor reduction)
     * @param gameState The game state for applying reflect damage
     * @param sourceId The ID of the original attacker
     * @param damageSource The type of damage source
     */
    private static handleReflectDamage(combatant: Combatant, originalDamage: number, gameState: GameState, sourceId: string, damageSource: DamageSource): void {
        const sourceCombatant = gameState.combatants.get(sourceId);
        if (!sourceCombatant) return;

        // Only reflect damage to heroes and minions, not structures
        if (sourceCombatant.type !== 'hero' && sourceCombatant.type !== 'minion') {
            return;
        }

        // Only reflect auto-attack damage, not ability damage
        if (damageSource !== 'auto-attack') {
            return;
        }

        // Find all reflect effects on the combatant that took damage
        const reflectEffects = Array.from(combatant.effects).filter(effect => 
            effect != null && effect.type === 'reflect'
        ) as ReflectEffect[];

        for (const reflectEffect of reflectEffects) {
            if (reflectEffect.reflectPercentage && reflectEffect.reflectPercentage > 0) {
                // Calculate reflect damage (percentage of original damage before armor)
                const reflectDamage = (originalDamage * reflectEffect.reflectPercentage) / 100;
                
                // Apply reflect damage back to the attacker (same damage type)
                if (reflectDamage > 0 && sourceId !== combatant.id) {
                    // Mark as reflect damage to prevent infinite loops
                    this.damageCombatant(sourceCombatant, reflectDamage, gameState, combatant.id, damageSource, true);
                }
            }
        }
    }

    /**
     * Finds the nearest enemy turret within detection range, prioritizing by health
     * @param source The source combatant (bot or minion)
     * @param allCombatants Array of all combatants in the game
     * @param detectionRange Range within which to detect turrets
     * @returns The turret with lowest health within range, or null if none found
     */
    static findNearbyEnemyTurret(source: any, allCombatants: any[], detectionRange: number = 150): any | null {
        const enemyTeam = source.team === 'blue' ? 'red' : 'blue';
        
        const enemyTurrets = allCombatants.filter(combatant => 
            combatant.type === 'turret' && 
            combatant.team === enemyTeam &&
            combatant.health > 0
        );
        
        // Find enemy turrets within detection range
        const nearbyTurrets = enemyTurrets.filter(turret => {
            const dx = turret.x - source.x;
            const dy = turret.y - source.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            return distance < detectionRange;
        });
        
        if (nearbyTurrets.length === 0) {
            return null;
        }
        
        // Prioritize the turret with the lowest health
        return nearbyTurrets.reduce((lowestHealthTurret, turret) => {
            return turret.health < lowestHealthTurret.health ? turret : lowestHealthTurret;
        });
    }

    /**
     * Gets the enemy cradle position for a given team
     * @param team The team to get enemy cradle position for
     * @param gameplayConfig Game configuration containing cradle positions
     * @returns Position of the enemy cradle
     */
    static getEnemyCradlePosition(team: string, gameplayConfig: any): { x: number, y: number } {
        const basePosition = team === 'blue' 
            ? gameplayConfig.CRADLE_POSITIONS.RED 
            : gameplayConfig.CRADLE_POSITIONS.BLUE;
        
        // Add some randomization to avoid all units targeting the exact same spot
        const offsetX = (Math.random() - 0.5) * 60; // ±30 pixels
        const offsetY = (Math.random() - 0.5) * 60; // ±30 pixels
        
        return {
            x: basePosition.x + offsetX,
            y: basePosition.y + offsetY
        };
    }

    /**
     * Determines if a combatant should play defensively based on nearby enemy/friend ratio
     * @param combatant The combatant to evaluate
     * @param allCombatants Array of all combatants in the game
     * @param currentTime Current game time for cooldown calculation
     * @returns true if the combatant should play defensively (more enemies than friends nearby)
     */
    static shouldPlayDefensively(combatant: any, allCombatants: any[], currentTime: number): boolean {
        const nearbyRadius = GAMEPLAY_CONFIG.BOTS.AWARENESS_RANGE;
        
        // Count nearby enemies - only count heroes, not minions
        const nearbyEnemies = allCombatants.filter((other: any) => {
            if (other.team === combatant.team || other.health <= 0) {
                return false;
            }
            
            // Only count heroes as tactical threats
            if (other.type !== 'hero') {
                return false;
            }
            
            const dx = other.x - combatant.x;
            const dy = other.y - combatant.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            return distance <= nearbyRadius;
        });

        // Count nearby friends (allies) - only count heroes, not minions
        const nearbyFriends = allCombatants.filter((other: any) => {
            if (other.team !== combatant.team || other.health <= 0 || other.id === combatant.id) {
                return false;
            }
            
            // Only count heroes as tactical allies
            if (other.type !== 'hero') {
                return false;
            }
            
            const dx = other.x - combatant.x;
            const dy = other.y - combatant.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            return distance <= nearbyRadius;
        });

        // Require at least 2 more enemies than friends to trigger retreat behavior
        // This allows safe fighting for smaller disadvantages
        const shouldRetreat = nearbyEnemies.length > nearbyFriends.length + 2;
        
        // For extreme disadvantages, always retreat regardless of position
        const extremeDisadvantage = nearbyEnemies.length > nearbyFriends.length + 3;
        if (extremeDisadvantage) {
            return true; // Always retreat when extremely outnumbered
        }
        
        // If we're in a safe defensive position (near a friendly structure), allow fighting
        // Apply this logic for any disadvantage to encourage safe fighting
        if (nearbyEnemies.length > nearbyFriends.length && this.isNearFriendlyStructure(combatant, allCombatants)) {
            // We're outnumbered but near safety - don't retreat, allow fighting
            return false;
        }
        
        // Only retreat if there's a significant disadvantage
        const shouldBeDefensive = shouldRetreat;

        
        // Only apply cooldown when switching FROM defensive TO offensive
        // Allow immediate switching TO defensive (when situation gets worse)
        if (!shouldBeDefensive && combatant.wasDefensive) {
            // Switching from defensive to offensive - check cooldown
            const DEFENSIVE_COOLDOWN = 1000; // 1 second in milliseconds
            if (combatant.lastDefensiveExitTime && (currentTime - combatant.lastDefensiveExitTime) < DEFENSIVE_COOLDOWN) {
                return true; // Still in cooldown, stay defensive
            }
            combatant.lastDefensiveExitTime = currentTime;
        }
        
        combatant.wasDefensive = shouldBeDefensive;
        return shouldBeDefensive;
    }

    /**
     * Gets the defensive retreat position for a combatant (nearest friendly structure)
     * @param combatant The combatant that needs to retreat
     * @param allCombatants Array of all combatants in the game
     * @param gameplayConfig Game configuration containing cradle positions
     * @returns Position of the nearest friendly structure for defensive retreat
     */
    static getDefensiveRetreatPosition(combatant: any, allCombatants: any[], gameplayConfig: any): { x: number, y: number } {
        // Find all friendly defensive structures (turrets and cradles)
        const friendlyStructures = allCombatants.filter((other: any) => 
            other.team === combatant.team && 
            other.health > 0 && 
            (other.type === 'cradle' || other.type === 'turret')
        );

        if (friendlyStructures.length === 0) {
            // Fallback to team spawn position if no structures found
            return combatant.team === 'blue' 
                ? gameplayConfig.CRADLE_POSITIONS.BLUE 
                : gameplayConfig.CRADLE_POSITIONS.RED;
        }

        // Find the closest friendly structure
        let closestStructure = friendlyStructures[0];
        let closestDistance = Infinity;

        friendlyStructures.forEach((structure: any) => {
            const dx = structure.x - combatant.x;
            const dy = structure.y - combatant.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < closestDistance) {
                closestDistance = distance;
                closestStructure = structure;
            }
        });

        // Return position inside the friendly structure's attack range for protection
        // Use the same logic as isNearFriendlyStructure for consistency
        const defensiveRange = Math.max(closestStructure.attackRadius - 80, 80);
        const dx = combatant.x - closestStructure.x;
        const dy = combatant.y - closestStructure.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance === 0) {
            // Combatant is at structure position, move to random position in protection range
            const randomAngle = Math.random() * 2 * Math.PI;
            return {
                x: closestStructure.x + (Math.cos(randomAngle) * defensiveRange),
                y: closestStructure.y + (Math.sin(randomAngle) * defensiveRange)
            };
        }

        // Normalize direction and scale to retreat distance (toward structure)
        const normalizedDx = -dx / distance; // Negative to move toward structure
        const normalizedDy = -dy / distance; // Negative to move toward structure
        
        // Add randomness to prevent all bots from clustering at the same spot
        const randomOffset = (Math.random() - 0.5) * 60; // ±30 pixels random offset
        const randomAngle = Math.random() * 2 * Math.PI; // Random angle for offset
        
        const offsetX = Math.cos(randomAngle) * randomOffset;
        const offsetY = Math.sin(randomAngle) * randomOffset;
        
        return {
            x: closestStructure.x + (normalizedDx * defensiveRange) + offsetX,
            y: closestStructure.y + (normalizedDy * defensiveRange) + offsetY
        };
    }

    /**
     * Gets the safest fallback position behind the team's cradle
     * This is used for healing and extreme retreat situations
     * @param team The team ('blue' or 'red')
     * @param gameplayConfig Game configuration containing cradle positions
     * @returns Position behind the team's cradle (away from center of map)
     */
    static getCradleFallbackPosition(team: string, gameplayConfig: any): { x: number, y: number } {
        // Get the friendly cradle position
        const cradlePos = team === 'blue' 
            ? gameplayConfig.CRADLE_POSITIONS.BLUE 
            : gameplayConfig.CRADLE_POSITIONS.RED;
        
        // Position behind the cradle (away from center)
        // For blue team (bottom-left), go further down-left
        // For red team (top-right), go further up-right
        if (team === 'blue') {
            return {
                x: cradlePos.x - 50,
                y: cradlePos.y + 50
            };
        } else {
            return {
                x: cradlePos.x + 50,
                y: cradlePos.y - 50
            };
        }
    }

    /**
     * Checks if all friendly turrets are alive
     * @param team The team to check turrets for
     * @param allCombatants Array of all combatants in the game
     * @returns true if all 3 turrets for the team are alive
     */
    static areAllFriendlyTurretsAlive(team: string, allCombatants: any[]): boolean {
        const friendlyTurrets = allCombatants.filter((combatant: any) => 
            combatant.type === 'turret' && 
            combatant.team === team &&
            combatant.health > 0
        );
        
        // Each team has 3 turrets - all must be alive (health > 0)
        return friendlyTurrets.length === 3;
    }

    /**
     * Gets a healing position between the second row turrets
     * Second row turrets are the turrets off the main diagonal path
     * @param team The team to get turret position for
     * @param gameplayConfig Game configuration containing turret positions
     * @returns Position at the midpoint between the second row turrets
     */
    static getSecondRowTurretsFallbackPosition(team: string, gameplayConfig: any): { x: number, y: number } {
        const turretPositions = team === 'blue' 
            ? gameplayConfig.TURRET_POSITIONS.BLUE 
            : gameplayConfig.TURRET_POSITIONS.RED;
        
        // Second row turrets are at indices 1 and 2 (the off-path turrets)
        const turret1 = turretPositions[1];
        const turret2 = turretPositions[2];
        
        // Return midpoint between the two turrets
        return {
            x: (turret1.x + turret2.x) / 2,
            y: (turret1.y + turret2.y) / 2
        };
    }

    /**
     * Checks if a combatant is near a friendly structure (turrets or cradles)
     * Uses the same logic as defensive retreat positioning - inside attack range with buffer
     * @param combatant The combatant to check
     * @param allCombatants Array of all combatants in the game
     * @returns true if the combatant is near a friendly structure in a defensive position
     */
    private static isNearFriendlyStructure(combatant: any, allCombatants: any[]): boolean {
        return allCombatants.some((other: any) => {
            if (other.team !== combatant.team || other.health <= 0) {
                return false;
            }
            
            // Only check turrets and cradles
            if (other.type !== 'turret' && other.type !== 'cradle') {
                return false;
            }
            
            const dx = other.x - combatant.x;
            const dy = other.y - combatant.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Expanded safe area for fighting - within attack range plus some buffer
            const safeFightingRange = Math.max(other.attackRadius - 80, 60); // Smaller safe fighting area
            return distance <= safeFightingRange;
        });
    }

    /**
     * Checks if a combatant is currently in an enemy damage zone
     * @param combatant The combatant to check
     * @param zones Map of all zones in the game
     * @param safetyMargin Additional radius to treat the zone as bigger (default 15% bigger)
     * @returns The enemy zone the combatant is in, or null if not in any enemy zone
     */
    static isInEnemyZone(combatant: any, zones: Map<string, any>, safetyMargin: number = 0.15): any | null {
        if (!zones || zones.size === 0) return null;

        for (const zone of zones.values()) {
            // Skip friendly zones
            if (zone.team === combatant.team) continue;
            
            // Check if combatant is within zone radius (with safety margin)
            const dx = combatant.x - zone.x;
            const dy = combatant.y - zone.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const effectiveRadius = zone.radius * (1 + safetyMargin);
            
            if (distance <= effectiveRadius + combatant.size) {
                return zone;
            }
        }
        
        return null;
    }

    /**
     * Gets a safe position away from enemy zones using the quickest escape route
     * @param combatant The combatant that needs to escape
     * @param zones Map of all zones in the game
     * @param allCombatants Optional array of all combatants to avoid structures
     * @returns A safe position outside of enemy zones
     */
    static getSafePositionAwayFromZones(combatant: any, zones: Map<string, any>, allCombatants?: any[]): { x: number, y: number } {
        if (!zones || zones.size === 0) {
            return { x: combatant.x, y: combatant.y };
        }

        // Find all enemy zones
        const enemyZones = Array.from(zones.values()).filter(zone => zone.team !== combatant.team);
        
        if (enemyZones.length === 0) {
            return { x: combatant.x, y: combatant.y };
        }

        // Find the nearest zone that the combatant is in or near
        const nearestZone = enemyZones.reduce((nearest, zone) => {
            const distToZone = Math.sqrt(
                Math.pow(combatant.x - zone.x, 2) + Math.pow(combatant.y - zone.y, 2)
            );
            const distToNearest = nearest ? Math.sqrt(
                Math.pow(combatant.x - nearest.x, 2) + Math.pow(combatant.y - nearest.y, 2)
            ) : Infinity;
            return distToZone < distToNearest ? zone : nearest;
        }, null as any);

        if (!nearestZone) {
            return { x: combatant.x, y: combatant.y };
        }

        // Calculate the shortest path to escape the zone
        // This is the perpendicular direction from zone center to combatant position
        const dx = combatant.x - nearestZone.x;
        const dy = combatant.y - nearestZone.y;
        const distanceFromCenter = Math.sqrt(dx * dx + dy * dy);
        
        if (distanceFromCenter < 0.1) {
            // If we're at the exact center, pick an arbitrary safe direction
            // Try moving towards friendly structures if available
            if (allCombatants) {
                const friendlyStructures = allCombatants.filter((c: any) => 
                    c.team === combatant.team && 
                    c.health > 0 && 
                    (c.type === 'cradle' || c.type === 'turret')
                );
                
                if (friendlyStructures.length > 0) {
                    const nearest = friendlyStructures.reduce((closest: any, structure: any) => {
                        const dist = Math.sqrt(
                            Math.pow(combatant.x - structure.x, 2) + Math.pow(combatant.y - structure.y, 2)
                        );
                        const closestDist = closest ? Math.sqrt(
                            Math.pow(combatant.x - closest.x, 2) + Math.pow(combatant.y - closest.y, 2)
                        ) : Infinity;
                        return dist < closestDist ? structure : closest;
                    }, null);
                    
                    if (nearest) {
                        const escapeX = nearest.x - nearestZone.x;
                        const escapeY = nearest.y - nearestZone.y;
                        const escapeDist = Math.sqrt(escapeX * escapeX + escapeY * escapeY);
                        return {
                            x: nearestZone.x + (escapeX / escapeDist) * (nearestZone.radius + 40),
                            y: nearestZone.y + (escapeY / escapeDist) * (nearestZone.radius + 40)
                        };
                    }
                }
            }
            // Default: move in positive X direction
            return {
                x: nearestZone.x + nearestZone.radius + 40,
                y: nearestZone.y
            };
        }
        
        // Normalize direction (shortest path out of the circle)
        const dirX = dx / distanceFromCenter;
        const dirY = dy / distanceFromCenter;
        
        // Calculate escape position: just outside zone radius with safety margin
        const safetyMargin = 40; // Extra distance to stay clear
        const escapeDistance = nearestZone.radius + safetyMargin;
        let escapeX = nearestZone.x + dirX * escapeDistance;
        let escapeY = nearestZone.y + dirY * escapeDistance;

        // Check if this escape position overlaps with any other zones
        // If so, try alternative directions
        const isPositionInZone = (x: number, y: number) => {
            return enemyZones.some(zone => {
                const dist = Math.sqrt(Math.pow(x - zone.x, 2) + Math.pow(y - zone.y, 2));
                return dist <= zone.radius + 10; // Small margin
            });
        };

        if (isPositionInZone(escapeX, escapeY)) {
            // Try perpendicular directions
            const perpDirections = [
                { x: -dirY, y: dirX },  // 90 degrees
                { x: dirY, y: -dirX },  // -90 degrees
            ];

            for (const perpDir of perpDirections) {
                const testX = nearestZone.x + perpDir.x * escapeDistance;
                const testY = nearestZone.y + perpDir.y * escapeDistance;
                
                if (!isPositionInZone(testX, testY)) {
                    escapeX = testX;
                    escapeY = testY;
                    break;
                }
            }
        }

        return { x: escapeX, y: escapeY };
    }

    /**
     * Checks if there's a low-health enemy nearby that's worth staying in a zone for
     * @param bot The bot to check
     * @param state The game state
     * @returns true if there's a low health enemy in attack range
     */
    static hasLowHealthEnemyNearby(bot: any, state: any): boolean {
        const allEnemies = Array.from(state.combatants.values()).filter((combatant: any) => {
            return combatant.team !== bot.team && combatant.health > 0;
        });
        
        const enemiesInAttackRange = allEnemies.filter((enemy: any) => {
            const distance = Math.sqrt(Math.pow(enemy.x - bot.x, 2) + Math.pow(enemy.y - bot.y, 2));
            return distance <= bot.attackRadius + enemy.size;
        });

        // Consider it worth staying if enemy is below 30% health and in attack range
        return enemiesInAttackRange.some((enemy: any) => 
            (enemy.health / enemy.maxHealth) < 0.3
        );
    }
} 
