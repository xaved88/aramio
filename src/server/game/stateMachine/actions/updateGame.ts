import { GameState, Hero, XPEvent } from '../../../schema/GameState';
import { UpdateGameAction, StateMachineResult } from '../types';
import { GAMEPLAY_CONFIG } from '../../../../Config';
import { COMBATANT_TYPES } from '../../../../shared/types/CombatantTypes';
import { CombatantUtils } from '../../combatants/CombatantUtils';
import { AttackEvent } from '../../../schema/GameState';
import { MinionManager } from '../../combatants/MinionManager';

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
    
    allCombatants.forEach(attacker => {
        if (attacker.health <= 0) return;
        if (attacker.type === COMBATANT_TYPES.HERO && (attacker as Hero).state === 'respawning') return;
        
        // Check if attacker can attack (based on attack speed)
        const timeSinceLastAttack = currentTime - attacker.lastAttackTime;
        const attackCooldown = 1000 / attacker.attackSpeed; // Convert to milliseconds
        
        if (timeSinceLastAttack >= attackCooldown) {
            // Find enemies in range
            const enemiesInRange = allCombatants.filter(target => {
                if (!CombatantUtils.isCombatantAlive(target)) return false;
                if (!CombatantUtils.areOpposingTeams(attacker, target)) return false;
                return CombatantUtils.isInRange(attacker, target, attacker.attackRadius);
            });
            
            // Find the nearest enemy in range
            if (enemiesInRange.length > 0) {
                let nearestEnemy = enemiesInRange[0];
                let nearestDistance = CombatantUtils.getDistance(attacker, nearestEnemy);
                
                enemiesInRange.forEach(enemy => {
                    const distance = CombatantUtils.getDistance(attacker, enemy);
                    if (distance < nearestDistance) {
                        nearestEnemy = enemy;
                        nearestDistance = distance;
                    }
                });
                
                // Attack the nearest enemy
                CombatantUtils.damageCombatant(nearestEnemy, attacker.attackStrength);
                attacker.lastAttackTime = currentTime;
                
                // Create attack event
                const attackEvent = new AttackEvent();
                attackEvent.sourceId = attacker.id;
                attackEvent.targetId = nearestEnemy.id;
                attackEvent.timestamp = currentTime;
                state.attackEvents.push(attackEvent);
            }
        }
    });
}

function handleCollisions(state: GameState): void {
    const allCombatants = Array.from(state.combatants.values());
    
    // Check each pair of combatants for collisions
    for (let i = 0; i < allCombatants.length; i++) {
        for (let j = i + 1; j < allCombatants.length; j++) {
            const combatant1 = allCombatants[i];
            const combatant2 = allCombatants[j];
            
            // Skip if either combatant is dead
            if (!CombatantUtils.isCombatantAlive(combatant1) || !CombatantUtils.isCombatantAlive(combatant2)) {
                continue;
            }

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
            if (hero.health <= 0 && hero.state === 'alive') {
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
            
            if (hero.health <= 0 && hero.state === 'alive') {
                // Hero died, start respawn
                startPlayerRespawn(hero, state);
            } else if (hero.state === 'respawning' && currentTime >= hero.respawnTime) {
                // Respawn the hero
                completePlayerRespawn(hero);
            }
            
            // Check for level up (regardless of how experience was gained)
            const experienceNeeded = hero.level * GAMEPLAY_CONFIG.EXPERIENCE.LEVEL_UP_MULTIPLIER;
            if (hero.experience >= experienceNeeded) {
                levelUpPlayer(hero);
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
    
    // Get all heroes on the same team, sorted by ID
    const teamHeroes = Array.from(state.combatants.values())
        .filter(combatant => combatant.type === COMBATANT_TYPES.HERO && combatant.team === player.team)
        .map(hero => hero.id)
        .sort();
    
    // Find the hero's position in the sorted list
    const heroIndex = teamHeroes.indexOf(player.id);
    
    // Move player to spawn location based on their position in the team
    if (player.team === 'blue') {
        const blueSpawnPositions = GAMEPLAY_CONFIG.PLAYER_SPAWN_POSITIONS.BLUE;
        const spawnIndex = Math.min(heroIndex, blueSpawnPositions.length - 1);
        player.x = blueSpawnPositions[spawnIndex].x;
        player.y = blueSpawnPositions[spawnIndex].y;
    } else {
        const redSpawnPositions = GAMEPLAY_CONFIG.PLAYER_SPAWN_POSITIONS.RED;
        const spawnIndex = Math.min(heroIndex, redSpawnPositions.length - 1);
        player.x = redSpawnPositions[spawnIndex].x;
        player.y = redSpawnPositions[spawnIndex].y;
    }
}

function completePlayerRespawn(player: Hero): void {
    player.state = 'alive';
    player.health = player.maxHealth; // Restore to max health, not base health
}

function grantExperienceToTeam(amount: number, enemyTeam: string, state: GameState): void {
    const opposingTeam = enemyTeam === 'blue' ? 'red' : 'blue';
    
    state.combatants.forEach((combatant, id) => {
        if (combatant.type === COMBATANT_TYPES.HERO && combatant.team === opposingTeam) {
            const hero = combatant as Hero;
            // Only grant experience to alive players, not respawning ones
            if (hero.state === 'alive') {
                grantExperience(hero, amount, state);
            }
        }
    });
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

function grantExperienceToTeamForUnitKill(amount: number, enemyTeam: string, state: GameState, dyingUnit: any): void {
    const opposingTeam = enemyTeam === 'blue' ? 'red' : 'blue';
    
    // Find all alive heroes in range
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
        grantExperience(hero, experiencePerHero, state, dyingUnit.x, dyingUnit.y);
    });
}

function grantExperience(player: Hero, amount: number, state: GameState, xpX?: number, xpY?: number): void {
    player.experience += amount;
    
    // Create XP event if position is provided
    if (xpX !== undefined && xpY !== undefined) {
        const xpEvent = new XPEvent();
        xpEvent.playerId = player.id;
        xpEvent.amount = amount;
        xpEvent.x = xpX;
        xpEvent.y = xpY;
        xpEvent.timestamp = state.gameTime;
        state.xpEvents.push(xpEvent);
    }
    
    // Check for level up immediately when experience is granted
    const experienceNeeded = player.level * GAMEPLAY_CONFIG.EXPERIENCE.LEVEL_UP_MULTIPLIER;
    if (player.experience >= experienceNeeded) {
        levelUpPlayer(player);
    }
}

function levelUpPlayer(player: Hero): void {
    const boostMultiplier = 1 + GAMEPLAY_CONFIG.EXPERIENCE.STAT_BOOST_PERCENTAGE;
    const abilityBoostMultiplier = 1 + GAMEPLAY_CONFIG.EXPERIENCE.ABILITY_STRENGTH_BOOST_PERCENTAGE;
    const experienceNeeded = player.level * GAMEPLAY_CONFIG.EXPERIENCE.LEVEL_UP_MULTIPLIER;
    
    // Level up
    player.level++;
    player.experience -= experienceNeeded;
    
    // Store old max health to calculate health increase
    const oldMaxHealth = player.maxHealth;
    
    // Boost stats by the configured amount
    player.maxHealth = Math.round(player.maxHealth * boostMultiplier);
    
    // Increase current health by the same amount max health increased, but don't heal to full
    const healthIncrease = player.maxHealth - oldMaxHealth;
    player.health = Math.min(player.health + healthIncrease, player.maxHealth);
    
    player.attackStrength = Math.round(player.attackStrength * boostMultiplier);
    player.attackRadius = Math.round(player.attackRadius * boostMultiplier);
    player.attackSpeed = player.attackSpeed * boostMultiplier;

    // Make respawn duration longer as a punishment for higher level deaths.
    player.respawnDuration = Math.round(player.respawnDuration * (1 + GAMEPLAY_CONFIG.EXPERIENCE.STAT_BOOST_PERCENTAGE)); // Increase respawn time
    
    // Boost ability strength by different configurable percentage
    player.ability.strength = Math.round(player.ability.strength * abilityBoostMultiplier);
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

