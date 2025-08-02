import { GameState, Player, AttackEvent } from '../../../schema/GameState';
import { UpdateGameAction, StateMachineResult } from '../types';
import { GAMEPLAY_CONFIG } from '../../../../Config';
import { COMBATANT_TYPES } from '../../../../shared/types/CombatantTypes';
import { CombatantUtils } from '../../combatants/CombatantUtils';
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
    
    // Process combat
    processCombat(state);
    
    // Check and spawn minion waves
    MinionManager.checkAndSpawnWave(state);
    
    // Move minions
    MinionManager.moveMinions(state);
    
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
        if (!CombatantUtils.isCombatantAlive(attacker)) return;
        
        // Skip respawning players
        if (attacker.type === COMBATANT_TYPES.PLAYER && (attacker as Player).state === 'respawning') return;
        
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
            
            // Attack the first enemy in range
            if (enemiesInRange.length > 0) {
                const target = enemiesInRange[0];
                CombatantUtils.damageCombatant(target, attacker.attackStrength);
                attacker.lastAttackTime = currentTime;
                
                // Create attack event
                const attackEvent = new AttackEvent();
                attackEvent.sourceId = attacker.id;
                attackEvent.targetId = target.id;
                attackEvent.timestamp = currentTime;
                state.attackEvents.push(attackEvent);
            }
        }
    });
}

function handleDeadCombatants(state: GameState): void {
    const currentTime = state.gameTime;
    
    // Handle player respawning and level ups
    state.combatants.forEach((combatant, id) => {
        if (combatant.type === COMBATANT_TYPES.PLAYER) {
            const player = combatant as Player;
            
            if (!CombatantUtils.isCombatantAlive(player) && player.state === 'alive') {
                // Player just died, start respawn process
                startPlayerRespawn(player, state);
            } else if (player.state === 'respawning' && currentTime >= player.respawnTime) {
                // Respawn timer completed
                completePlayerRespawn(player);
            }
            
            // Check for level up (regardless of how experience was gained)
            const experienceNeeded = player.level * GAMEPLAY_CONFIG.EXPERIENCE.LEVEL_UP_MULTIPLIER;
            if (player.experience >= experienceNeeded) {
                levelUpPlayer(player);
            }
        }
    });
    
    // Handle turret destruction and grant experience
    const turretsToRemove: string[] = [];
    state.combatants.forEach((combatant, id) => {
        if (combatant.type === COMBATANT_TYPES.TURRET) {
            if (!CombatantUtils.isCombatantAlive(combatant)) {
                grantExperienceToTeam(GAMEPLAY_CONFIG.EXPERIENCE.TOWER_DESTROYED, combatant.team, state);
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
                grantExperienceToTeam(GAMEPLAY_CONFIG.EXPERIENCE.MINION_KILLED, combatant.team, state);
                minionsToRemove.push(id);
            }
        }
    });
    
    // Remove dead minions
    minionsToRemove.forEach(id => {
        state.combatants.delete(id);
    });
}

function startPlayerRespawn(player: Player, state: GameState): void {
    player.state = 'respawning';
    player.respawnTime = state.gameTime + player.respawnDuration;
    
    // Move player to spawn location
    if (player.team === 'blue') {
        player.x = GAMEPLAY_CONFIG.CRADLE_POSITIONS.BLUE.x + GAMEPLAY_CONFIG.PLAYER_SPAWN_OFFSET;
        player.y = GAMEPLAY_CONFIG.CRADLE_POSITIONS.BLUE.y - GAMEPLAY_CONFIG.PLAYER_SPAWN_OFFSET;
    } else {
        player.x = GAMEPLAY_CONFIG.CRADLE_POSITIONS.RED.x - GAMEPLAY_CONFIG.PLAYER_SPAWN_OFFSET;
        player.y = GAMEPLAY_CONFIG.CRADLE_POSITIONS.RED.y + GAMEPLAY_CONFIG.PLAYER_SPAWN_OFFSET;
    }
}

function completePlayerRespawn(player: Player): void {
    player.state = 'alive';
    player.health = player.maxHealth; // Restore to max health, not base health
}

function grantExperienceToTeam(amount: number, enemyTeam: string, state: GameState): void {
    const opposingTeam = enemyTeam === 'blue' ? 'red' : 'blue';
    
    state.combatants.forEach((combatant, id) => {
        if (combatant.type === COMBATANT_TYPES.PLAYER && combatant.team === opposingTeam) {
            const player = combatant as Player;
            // Only grant experience to alive players, not respawning ones
            if (player.state === 'alive') {
                grantExperience(player, amount);
            }
        }
    });
}

function grantExperience(player: Player, amount: number): void {
    player.experience += amount;
    
    // Check for level up immediately when experience is granted
    const experienceNeeded = player.level * GAMEPLAY_CONFIG.EXPERIENCE.LEVEL_UP_MULTIPLIER;
    if (player.experience >= experienceNeeded) {
        levelUpPlayer(player);
    }
}

function levelUpPlayer(player: Player): void {
    const boostMultiplier = 1 + GAMEPLAY_CONFIG.EXPERIENCE.STAT_BOOST_PERCENTAGE;
    const abilityBoostMultiplier = 1 + GAMEPLAY_CONFIG.EXPERIENCE.ABILITY_STRENGTH_BOOST_PERCENTAGE;
    const experienceNeeded = player.level * GAMEPLAY_CONFIG.EXPERIENCE.LEVEL_UP_MULTIPLIER;
    
    // Level up
    player.level++;
    player.experience -= experienceNeeded;
    
    // Boost stats by the configured amount
    player.maxHealth = Math.round(player.maxHealth * boostMultiplier);
    player.health = player.maxHealth; // Restore health on level up
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