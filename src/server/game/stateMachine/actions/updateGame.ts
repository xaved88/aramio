import { GameState } from '../../../schema/GameState';
import { Hero, Combatant } from '../../../schema/Combatants';
import { XPEvent, LevelUpEvent, AttackEvent, KillEvent } from '../../../schema/Events';
import { UpdateGameAction, StateMachineResult } from '../types';
import { GAMEPLAY_CONFIG, SERVER_CONFIG } from '../../../../Config';
import { COMBATANT_TYPES } from '../../../../shared/types/CombatantTypes';
import { CombatantUtils } from '../../combatants/CombatantUtils';
import { MinionManager } from '../../combatants/MinionManager';
import { AbilityLevelUpManager } from '../../abilities/AbilityLevelUpManager';
import { RewardManager } from '../../rewards/RewardManager';

export function handleUpdateGame(state: GameState, action: UpdateGameAction): StateMachineResult {
    // Update game time directly on the state
    state.gameTime = state.gameTime + action.payload.deltaTime;
    
    // Clear old attack events (older than 1 second)
    const currentTime = state.gameTime;
    const eventsToRemove: number[] = [];
    
    state.attackEvents.forEach((event, index) => {
        if (currentTime - event.timestamp > 1000) { // 1 second
            eventsToRemove.push(index);
        }
    });
    
    // Remove events in reverse order to maintain indices
    eventsToRemove.reverse().forEach(index => {
        state.attackEvents.splice(index, 1);
    });
    
    // Clear old XP events
    const xpEventsToRemove: number[] = [];
    
    state.xpEvents.forEach((event, index) => {
        if (currentTime - event.timestamp > GAMEPLAY_CONFIG.EXPERIENCE.XP_EVENT_DURATION_MS) {
            xpEventsToRemove.push(index);
        }
    });
    
    // Remove XP events in reverse order to maintain indices
    xpEventsToRemove.reverse().forEach(index => {
        state.xpEvents.splice(index, 1);
    });
    
    // Clear old level-up events (older than configured duration)
    const levelUpEventsToRemove: number[] = [];
    
    state.levelUpEvents.forEach((event, index) => {
        if (currentTime - event.timestamp > GAMEPLAY_CONFIG.EXPERIENCE.LEVEL_UP_EVENT_DURATION_MS) {
            levelUpEventsToRemove.push(index);
        }
    });
    
    // Remove level-up events in reverse order to maintain indices
    levelUpEventsToRemove.reverse().forEach(index => {
        state.levelUpEvents.splice(index, 1);
    });
    
    // Clear old AOE damage events (older than 1 second)
    const aoeDamageEventsToRemove: number[] = [];
    
    state.aoeDamageEvents.forEach((event, index) => {
        if (currentTime - event.timestamp > 1000) { // 1 second
            aoeDamageEventsToRemove.push(index);
        }
    });
    
    // Remove AOE damage events in reverse order to maintain indices
    aoeDamageEventsToRemove.reverse().forEach(index => {
        state.aoeDamageEvents.splice(index, 1);
    });
    
    // Handle passive healing
    handlePassiveHealing(state);
    
    // Process combat
    processCombat(state);
    
    // Check and spawn minion waves
    MinionManager.checkAndSpawnWave(state);
    
    // Move minions
    MinionManager.moveMinions(state);
    
    // Handle collisions
    handleCollisions(state);
    
    // Handle respawning and dead combatants
    handleDeadCombatants(state);
    
    // Check for game end conditions
    const gameEndResult = checkGameEndConditions(state);
    if (gameEndResult) {
        return gameEndResult;
    }
    
    return { newState: state };
}

function processCombat(state: GameState): void {
    const allCombatants = Array.from(state.combatants.values());
    const currentTime = state.gameTime;
    
    // Update targeting for all combatants
    allCombatants.forEach(attacker => {
        if (!CombatantUtils.isCombatantAlive(attacker)) return;
        
        updateCombatantTargeting(attacker, allCombatants);
    });
    
    // NEW: Wind-up attack system
    allCombatants.forEach(attacker => {
        if (!CombatantUtils.isCombatantAlive(attacker)) return;
        
        processWindUpAttack(attacker, allCombatants, state, currentTime);
    });
}

/**
 * Processes wind-up attack logic for a combatant
 */
function processWindUpAttack(attacker: any, allCombatants: any[], state: GameState, currentTime: number): void {
    // Check if attacker is stunned - stunned combatants cannot attack
    if (isCombatantStunned(attacker)) {
        // Clear target and reset attack ready time when stunned
        attacker.target = undefined;
        attacker.attackReadyAt = 0;
        return;
    }
    
    // Check if attacker has a target and can start wind-up
    if (attacker.target && attacker.attackReadyAt === 0) {
        // Check if attack is off cooldown
        const timeSinceLastAttack = currentTime - attacker.lastAttackTime;
        const attackCooldown = 1000 / attacker.getAttackSpeed(); // Convert to milliseconds
        
        if (timeSinceLastAttack >= attackCooldown) {
            // Start wind-up period
            attacker.attackReadyAt = currentTime + (attacker.getWindUp() * 1000); // Convert windUp to milliseconds
        }
    }
    
    // Check if wind-up is complete and attack can be performed
    // Allow immediate attacks when attackReadyAt is set to a past time
    if (attacker.attackReadyAt > 0 && currentTime >= attacker.attackReadyAt) {
        // Find the target
        const target = allCombatants.find(c => c.id === attacker.target);
        
        if (target && CombatantUtils.isCombatantAlive(target) && 
            CombatantUtils.areOpposingTeams(attacker, target) &&
            CombatantUtils.isInRange(attacker, target, attacker.getAttackRadius())) {
            
            // Perform the attack
            CombatantUtils.damageCombatant(target, attacker.getAttackStrength(), state, attacker.id, 'auto-attack');
            attacker.lastAttackTime = currentTime;
            attacker.attackReadyAt = 0; // Reset wind-up
            
            // Create attack event
            const attackEvent = new AttackEvent();
            attackEvent.sourceId = attacker.id;
            attackEvent.targetId = target.id;
            attackEvent.timestamp = currentTime;
            state.attackEvents.push(attackEvent);
        } else {
            // Target is no longer valid, reset wind-up
            attacker.attackReadyAt = 0;
        }
    }
}

/**
 * Checks if a combatant is stunned
 * @param combatant The combatant to check
 * @returns True if the combatant is stunned, false otherwise
 */
function isCombatantStunned(combatant: any): boolean {
    if (!combatant.effects || combatant.effects.length === 0) return false;
    
    return combatant.effects.some((effect: any) => effect.type === 'stun');
}

/**
 * Updates targeting for a combatant based on available enemies in range
 */
function updateCombatantTargeting(attacker: any, allCombatants: any[]): void {
    // Check for taunt effects first - they override normal targeting
    const tauntEffects = attacker.effects?.filter((effect: any) => effect.type === 'taunt') || [];
    if (tauntEffects.length > 0) {
        // Clean up taunt effects where the taunter is dead or missing
        const validTauntEffects = tauntEffects.filter((effect: any) => {
            const taunter = allCombatants.find(c => c.id === effect.taunterCombatantId);
            return taunter && CombatantUtils.isCombatantAlive(taunter) && 
                   CombatantUtils.areOpposingTeams(attacker, taunter);
        });
        
        // Remove invalid taunt effects immediately
        if (validTauntEffects.length !== tauntEffects.length) {
            attacker.effects = attacker.effects.filter((effect: any) => {
                if (effect.type !== 'taunt') return true;
                const taunter = allCombatants.find(c => c.id === effect.taunterCombatantId);
                return taunter && CombatantUtils.isCombatantAlive(taunter) && 
                       CombatantUtils.areOpposingTeams(attacker, taunter);
            });
        }
        
        // If we still have valid taunt effects, use the most recent one
        if (validTauntEffects.length > 0) {
            const latestTaunt = validTauntEffects[validTauntEffects.length - 1];
            const taunter = allCombatants.find(c => c.id === latestTaunt.taunterCombatantId);
            attacker.target = taunter.id;
            // Don't reset attackReadyAt - let the attack continue if already in progress
            return;
        }
    }

    // Check if attacker has hunter effect (ignores minions)
    const hasHunterEffect = attacker.effects?.some((effect: any) => effect.type === 'hunter');
    
    // Find alive enemies in attack range
    const enemiesInRange = allCombatants.filter(target => {
        if (!CombatantUtils.isCombatantAlive(target)) return false;
        if (!CombatantUtils.areOpposingTeams(attacker, target)) return false;
        
        // If attacker has hunter effect, ignore minions
        if (hasHunterEffect && target.type === 'minion') return false;
        
        return CombatantUtils.isInRange(attacker, target, attacker.getAttackRadius());
    });
    
    // If no enemies in range, clear target and reset attack ready time
    if (enemiesInRange.length === 0) {
        attacker.target = undefined;
        attacker.attackReadyAt = 0; // Reset wind-up when target is lost
        return;
    }
    
    // If we have no target but enemies are in range, set target to nearest enemy
    if (!attacker.target) {
        let nearestEnemy = enemiesInRange[0];
        let nearestDistance = CombatantUtils.getDistance(attacker, nearestEnemy);
        
        enemiesInRange.forEach(enemy => {
            const distance = CombatantUtils.getDistance(attacker, enemy);
            if (distance < nearestDistance) {
                nearestEnemy = enemy;
                nearestDistance = distance;
            }
        });
        
        attacker.target = nearestEnemy.id;
        return;
    }
    
    // Check if current target is still valid (alive, in range, and still exists)
    const currentTarget = allCombatants.find(c => c.id === attacker.target);
    if (!currentTarget || 
        !CombatantUtils.isCombatantAlive(currentTarget) || 
        !CombatantUtils.areOpposingTeams(attacker, currentTarget) ||
        !CombatantUtils.isInRange(attacker, currentTarget, attacker.getAttackRadius())) {
        // Current target is invalid, find new nearest target
        let nearestEnemy = enemiesInRange[0];
        let nearestDistance = CombatantUtils.getDistance(attacker, nearestEnemy);
        
        enemiesInRange.forEach(enemy => {
            const distance = CombatantUtils.getDistance(attacker, enemy);
            if (distance < nearestDistance) {
                nearestEnemy = enemy;
                nearestDistance = distance;
            }
        });
        
        attacker.target = nearestEnemy.id;
        attacker.attackReadyAt = 0; // Reset wind-up when target changes
    }
}

function handleCollisions(state: GameState): void {
    const allCombatants = Array.from(state.combatants.values());
    
    // Filter out combatants with nocollision effects for performance
    const collisionCombatants = allCombatants.filter(combatant => {
        if (!CombatantUtils.isCombatantAlive(combatant)) return false;
        
        // Check if combatant has nocollision effect
        if (combatant.effects && combatant.effects.length > 0) {
            const hasNoCollision = combatant.effects.some(effect => effect.type === 'nocollision');
            if (hasNoCollision) return false;
        }
        
        return true;
    });
    
    // Check each pair of combatants for collisions
    for (let i = 0; i < collisionCombatants.length; i++) {
        for (let j = i + 1; j < collisionCombatants.length; j++) {
            const combatant1 = collisionCombatants[i];
            const combatant2 = collisionCombatants[j];
            
            // Calculate distance between centers
            const distance = CombatantUtils.getDistance(combatant1, combatant2);
            const collisionThreshold = (combatant1.size + combatant2.size) * GAMEPLAY_CONFIG.COMBAT.COLLISION_THRESHOLD_MULTIPLIER;
            
            // Check if they're colliding
            if (distance < collisionThreshold) {
                resolveCollision(combatant1, combatant2, distance, collisionThreshold);
            }
        }
    }
}
function resolveCollision(combatant1: any, combatant2: any, distance: number, collisionThreshold: number): void {
    const isStructure1 = combatant1.type === COMBATANT_TYPES.CRADLE || combatant1.type === COMBATANT_TYPES.TURRET;
    const isStructure2 = combatant2.type === COMBATANT_TYPES.CRADLE || combatant2.type === COMBATANT_TYPES.TURRET;
    
    // If both are structures, ignore collision
    if (isStructure1 && isStructure2) {
        return;
    }
    
    // Calculate how much they're overlapping
    const overlap = collisionThreshold - distance;
    
    // Calculate direction vector from combatant1 to combatant2
    const dx = combatant2.x - combatant1.x;
    const dy = combatant2.y - combatant1.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    
    // Handle zero length (combatants at exact same position) to prevent NaN
    if (length === 0) {
        // Use a small random offset to separate them
        const offsetX = (Math.random() - 0.5) * 2;
        const offsetY = (Math.random() - 0.5) * 2;
        combatant1.x += offsetX;
        combatant1.y += offsetY;
        combatant2.x -= offsetX;
        combatant2.y -= offsetY;
        return;
    }
    
    // Normalize direction vector
    const dirX = dx / length;
    const dirY = dy / length;
    
    if (isStructure1 && !isStructure2) {
        // Structure vs unit: move unit away the full distance
        combatant2.x += dirX * overlap;
        combatant2.y += dirY * overlap;
    } else if (!isStructure1 && isStructure2) {
        // Unit vs structure: move unit away the full distance
        combatant1.x -= dirX * overlap;
        combatant1.y -= dirY * overlap;
    } else {
        // Unit vs unit: move proportionally based on size (larger units move less)
        const totalSize = combatant1.size + combatant2.size;
        const moveRatio1 = combatant2.size / totalSize; // Larger unit moves less
        const moveRatio2 = combatant1.size / totalSize; // Smaller unit moves more
        
        combatant1.x -= dirX * overlap * moveRatio1;
        combatant1.y -= dirY * overlap * moveRatio1;
        combatant2.x += dirX * overlap * moveRatio2;
        combatant2.y += dirY * overlap * moveRatio2;
    }
}

function handleDeadCombatants(state: GameState): void {
    const currentTime = state.gameTime;
    
    // Handle hero death and grant XP BEFORE respawn logic
    state.combatants.forEach((combatant, id) => {
        if (combatant.type === COMBATANT_TYPES.HERO) {
            const hero = combatant as Hero;
            if (hero.getHealth() <= 0 && hero.state === 'alive') {
                // Hero just died, grant XP to opposing team
                const heroKillXP = hero.level * GAMEPLAY_CONFIG.EXPERIENCE.HERO_KILL_MULTIPLIER;
                grantExperienceToTeamForUnitKill(heroKillXP, hero.team, state, hero);
            }
        }
    });
    
    // Handle player respawning and level ups
    state.combatants.forEach((combatant, id) => {
        if (combatant.type === COMBATANT_TYPES.HERO) {
            const hero = combatant as Hero;
            
            if (hero.getHealth() <= 0 && hero.state === 'alive') {
                // Hero died, start respawn
                startPlayerRespawn(hero, state);
            } else if (hero.state === 'respawning') {
                // Generate reward choices for respawning heroes who have unspent rewards but no choices
                if (hero.levelRewards.length > 0 && hero.rewardsForChoice.length === 0) {
                    const chestType = hero.levelRewards[0]; // Process the first chest
                    if (chestType) {
                        const rewards = RewardManager.generateRewardsFromChest(chestType);
                        hero.rewardsForChoice.push(...rewards);
                    }
                }
                
                // Check if respawn time has passed
                if (currentTime >= hero.respawnTime) {
                    // Check if hero has unspent level rewards - if so, don't respawn yet
                    if (hero.levelRewards.length > 0) {
                        // Keep hero in respawning state until rewards are spent
                        // The respawn time check will continue to pass, but respawn won't complete
                    } else {
                        // Respawn the hero
                        completePlayerRespawn(hero);
                    }
                }
            }
            
            // Check for level up (regardless of how experience was gained)
            const experienceNeeded = hero.level * GAMEPLAY_CONFIG.EXPERIENCE.LEVEL_UP_MULTIPLIER;
            if (hero.experience >= experienceNeeded) {
                levelUpPlayer(hero, state);
            }
        }
    });
    
    // Handle turret destruction and grant experience
    const turretsToRemove: string[] = [];
    state.combatants.forEach((combatant, id) => {
        if (combatant.type === COMBATANT_TYPES.TURRET) {
            if (!CombatantUtils.isCombatantAlive(combatant)) {
                grantExperienceToTeamForTurret(GAMEPLAY_CONFIG.EXPERIENCE.TOWER_DESTROYED, combatant.team, state, combatant.x, combatant.y);
                turretsToRemove.push(id);
            }
        }
    });
    
    // Remove destroyed turrets
    turretsToRemove.forEach(id => {
        state.combatants.delete(id);
    });
    
    // Handle minion death and grant experience
    const minionsToRemove: string[] = [];
    state.combatants.forEach((combatant, id) => {
        if (combatant.type === COMBATANT_TYPES.MINION) {
            if (!CombatantUtils.isCombatantAlive(combatant)) {
                grantExperienceToTeamForUnitKill(GAMEPLAY_CONFIG.EXPERIENCE.MINION_KILLED, combatant.team, state, combatant);
                minionsToRemove.push(id);
            }
        }
    });
    
    // Remove dead minions
    minionsToRemove.forEach(id => {
        state.combatants.delete(id);
    });
}

function startPlayerRespawn(player: Hero, state: GameState): void {
    player.state = 'respawning';
    player.respawnTime = state.gameTime + player.respawnDuration;
    
    // Clear all effects when hero dies
    if (player.effects && player.effects.length > 0) {
        player.effects.clear();
    }
    
    // Get all heroes on the same team, sorted by ID
    const teamHeroes = Array.from(state.combatants.values())
        .filter(combatant => combatant.type === COMBATANT_TYPES.HERO && combatant.team === player.team)
        .map(hero => hero.id)
        .sort();
    
    // Find the hero's position in the sorted list
    const heroIndex = teamHeroes.indexOf(player.id);
    
    // Move player to spawn location based on their position in the team
    if (player.team === 'blue') {
        const blueSpawnPositions = GAMEPLAY_CONFIG.HERO_SPAWN_POSITIONS.BLUE;
        const spawnIndex = Math.min(heroIndex, blueSpawnPositions.length - 1);
        const spawnPosition = blueSpawnPositions[spawnIndex];
        player.x = spawnPosition.x;
        player.y = spawnPosition.y;
    } else {
        const redSpawnPositions = GAMEPLAY_CONFIG.HERO_SPAWN_POSITIONS.RED;
        const spawnIndex = Math.min(heroIndex, redSpawnPositions.length - 1);
        const spawnPosition = redSpawnPositions[spawnIndex];
        player.x = spawnPosition.x;
        player.y = spawnPosition.y;
    }
}

function completePlayerRespawn(player: Hero): void {
    player.state = 'alive';
    player.health = player.getMaxHealth(); // Restore to max health, not base health
    player.lastDamageTime = 0; // Reset last damage time
    CombatantUtils.removePassiveHealingEffects(player); // Remove any existing passive healing effects
}

function grantExperienceToTeamForTurret(amount: number, enemyTeam: string, state: GameState, turretX?: number, turretY?: number): void {
    const opposingTeam = enemyTeam === 'blue' ? 'red' : 'blue';
    
    state.combatants.forEach((combatant, id) => {
        if (combatant.type === COMBATANT_TYPES.HERO && combatant.team === opposingTeam) {
            const hero = combatant as Hero;
            // Grant experience to all players on opposing team, even when dead/respawning
            grantExperience(hero, amount, state, turretX, turretY);
        }
    });
}

function grantExperienceToTeamForUnitKill(amount: number, enemyTeam: string, state: GameState, dyingUnit: Combatant): void {
    const opposingTeam = enemyTeam === 'blue' ? 'red' : 'blue';
    
    // Find the killer (last hit) from kill events
    let killerHero: Hero | null = null;
    const recentKillEvents = [...state.killEvents].sort((a, b) => b.timestamp - a.timestamp);
    
    // Find the most recent kill event for this specific unit
    const mostRecentKillEvent = recentKillEvents.find(killEvent => killEvent.targetId === dyingUnit.id);
    
    if (mostRecentKillEvent) {
        // Found the kill event for this unit, now find the killer
        const killer = state.combatants.get(mostRecentKillEvent.sourceId);
        if (killer && killer.type === COMBATANT_TYPES.HERO && killer.team === opposingTeam) {
            killerHero = killer as Hero;
        }
    }
    
    // Find all alive heroes in range and give XP to them
    const heroesInRange: Hero[] = [];
    state.combatants.forEach((combatant, id) => {
        if (combatant.type === COMBATANT_TYPES.HERO && combatant.team === opposingTeam) {
            const hero = combatant as Hero;
            if (hero.state === 'alive') {
                const distance = CombatantUtils.getDistance(hero, dyingUnit);
                if (distance <= GAMEPLAY_CONFIG.EXPERIENCE.UNIT_KILL_RADIUS) {
                    heroesInRange.push(hero);
                }
            }
        }
    });
    
    // If killer hero is not in range, add them to the list
    if (killerHero && !heroesInRange.find(hero => hero.id === killerHero!.id)) {
        heroesInRange.push(killerHero);
    }
    
    // If no heroes in range, no experience is granted
    if (heroesInRange.length === 0) {
        return;
    }
    
    // Calculate experience multiplier based on number of heroes
    // Formula: (100% + 40% * (number of heroes - 1)) / number of heroes
    const totalMultiplier = 1 + (0.4 * (heroesInRange.length - 1));
    const experiencePerHero = amount * totalMultiplier / heroesInRange.length;
    
    // Grant experience to each hero in range
    heroesInRange.forEach(hero => {
        let bonusExperience = 0;
        let xpType: string | undefined = undefined;
        
        // Grant additional bonus to the killer (ONLY if killer is a hero)
        if (killerHero && hero.id === killerHero.id) {
            bonusExperience = amount * GAMEPLAY_CONFIG.EXPERIENCE.LAST_HIT_BONUS_PERCENTAGE;
            
            // Set the type based on what was killed
            if (dyingUnit.type === COMBATANT_TYPES.MINION) {
                xpType = 'minionKill';
            } else if (dyingUnit.type === COMBATANT_TYPES.HERO) {
                xpType = 'heroKill';
            }
        }
        
        const totalExperience = experiencePerHero + bonusExperience;
        grantExperience(hero, totalExperience, state, dyingUnit.x, dyingUnit.y, xpType);
    });
}

function grantExperience(player: Hero, amount: number, state: GameState, xpX?: number, xpY?: number, type?: string): void {
    player.experience += amount;
    player.roundStats.totalExperience += amount;
    
    // Create XP event if position is provided
    if (xpX !== undefined && xpY !== undefined) {
        const xpEvent = new XPEvent();
        xpEvent.playerId = player.id;
        xpEvent.amount = amount;
        xpEvent.x = xpX;
        xpEvent.y = xpY;
        xpEvent.timestamp = state.gameTime;
        if (type) {
            xpEvent.type = type;
        }
        state.xpEvents.push(xpEvent);
    }
    
    // Check for level up(s) - loop to handle multiple level-ups
    while (true) {
        const experienceNeeded = player.level * GAMEPLAY_CONFIG.EXPERIENCE.LEVEL_UP_MULTIPLIER;
        if (player.experience >= experienceNeeded) {
            levelUpPlayer(player, state);
        } else {
            break; // No more level-ups possible
        }
    }
}

function levelUpPlayer(player: Hero, state: GameState): void {
    const boostMultiplier = 1 + GAMEPLAY_CONFIG.EXPERIENCE.STAT_BOOST_PERCENTAGE;
    const rangeBoostMultiplier = 1 + GAMEPLAY_CONFIG.EXPERIENCE.RANGE_BOOST_PERCENTAGE;
    const experienceNeeded = player.level * GAMEPLAY_CONFIG.EXPERIENCE.LEVEL_UP_MULTIPLIER;
    
    // Level up
    player.level++;
    player.experience -= experienceNeeded;
    
    // Store old max health to calculate health increase
    const oldMaxHealth = player.getMaxHealth();
    
    // Boost stats by the configured amount
    player.maxHealth = Math.round(player.maxHealth * boostMultiplier);
    
    // Increase current health by the same amount max health increased, but don't heal to full
    const healthIncrease = player.maxHealth - oldMaxHealth;
    player.health = Math.min(player.health + healthIncrease, player.maxHealth);
    
    player.attackStrength = Math.round(player.attackStrength * boostMultiplier);
    player.attackRadius = Math.round(player.attackRadius * rangeBoostMultiplier); // Use separate range scaling
    player.attackSpeed = player.attackSpeed * boostMultiplier;

    // Make respawn duration longer as a punishment for higher level deaths.
    player.respawnDuration = Math.round(player.respawnDuration * (1 + GAMEPLAY_CONFIG.EXPERIENCE.STAT_BOOST_PERCENTAGE)); // Increase respawn time
    
    // Boost ability strength using the AbilityLevelUpManager
    AbilityLevelUpManager.levelUpAbility(player.ability);
    
    // Add level reward chest
    const chestType = RewardManager.getChestTypeForLevel(player.level);
    player.levelRewards.push(chestType);
    
    // Create level-up event
    const levelUpEvent = new LevelUpEvent();
    levelUpEvent.playerId = player.id;
    levelUpEvent.newLevel = player.level;
    levelUpEvent.x = player.x;
    levelUpEvent.y = player.y;
    levelUpEvent.timestamp = state.gameTime;
    state.levelUpEvents.push(levelUpEvent);
}

function checkGameEndConditions(state: GameState): StateMachineResult | null {
    // Check if either cradle is destroyed
    const blueCradle = Array.from(state.combatants.values()).find(c => c.type === COMBATANT_TYPES.CRADLE && c.team === 'blue');
    const redCradle = Array.from(state.combatants.values()).find(c => c.type === COMBATANT_TYPES.CRADLE && c.team === 'red');
    
    if (blueCradle && !CombatantUtils.isCombatantAlive(blueCradle)) {
        state.gamePhase = 'finished';
        state.winningTeam = 'red';
        state.gameEndTime = state.gameTime;
        return {
            newState: state,
            events: [{ type: 'GAME_OVER', payload: { winningTeam: 'red' } }]
        };
    } else if (redCradle && !CombatantUtils.isCombatantAlive(redCradle)) {
        state.gamePhase = 'finished';
        state.winningTeam = 'blue';
        state.gameEndTime = state.gameTime;
        return {
            newState: state,
            events: [{ type: 'GAME_OVER', payload: { winningTeam: 'blue' } }]
        };
    }
    
    return null;
} 

/**
 * Handles passive healing for heroes based on the no-damage threshold
 */
function handlePassiveHealing(state: GameState): void {
    const currentTime = state.gameTime;
    const { PASSIVE_HEALING } = GAMEPLAY_CONFIG;
    
    state.combatants.forEach((combatant, id) => {
        // Only apply passive healing to heroes
        if (combatant.type !== COMBATANT_TYPES.HERO) return;
        
        const hero = combatant as Hero;
        
        // Skip if hero is dead, respawning, or at max health
        if (hero.getHealth() <= 0 || hero.state === 'respawning' || hero.getHealth() >= hero.getMaxHealth()) {
            // Remove passive healing effect if it exists
            CombatantUtils.removePassiveHealingEffects(hero);
            return;
        }
        
        // Check if enough time has passed since last damage
        const timeSinceLastDamage = currentTime - (hero.lastDamageTime || 0);
        const thresholdMs = PASSIVE_HEALING.NO_DAMAGE_THRESHOLD_SECONDS * 1000;
        
        if (timeSinceLastDamage >= thresholdMs) {
            // Check if passive healing effect already exists
            const hasPassiveHealing = hero.effects.some(effect => effect && effect.type === 'passive_healing');
            
            if (!hasPassiveHealing) {
                // Apply passive healing effect
                const passiveHealingEffect = new (require('../../../schema/Effects').PassiveHealingEffect)();
                passiveHealingEffect.type = 'passive_healing';
                passiveHealingEffect.duration = -1; // Permanent until removed
                passiveHealingEffect.appliedAt = currentTime;
                passiveHealingEffect.healPercentPerSecond = PASSIVE_HEALING.HEAL_PERCENT_PER_SECOND;
                hero.effects.push(passiveHealingEffect);
            }
            
            // Apply healing (percentage of max health per second, adjusted for update rate)
            const healAmount = (hero.getMaxHealth() * PASSIVE_HEALING.HEAL_PERCENT_PER_SECOND / 100) * (SERVER_CONFIG.UPDATE_RATE_MS / 1000);
            CombatantUtils.healCombatant(hero, healAmount);
        } else {
            // Remove passive healing effect if not enough time has passed
            CombatantUtils.removePassiveHealingEffects(hero);
        }
    });
} 


