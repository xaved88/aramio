import { GameState, Player, Combatant, AttackEvent } from '../schema/GameState';
import { CombatantUtils } from './combatants/CombatantUtils';
import { GAMEPLAY_CONFIG } from '../../Config';

export enum GamePhase {
    WAITING = 'waiting',
    PLAYING = 'playing',
    FINISHED = 'finished'
}

export class GameEngine {
    private gameState: GameState;

    constructor(gameState: GameState) {
        this.gameState = gameState;
    }

    /**
     * Updates the game state for one frame
     * @param deltaTime Time since last update in milliseconds
     */
    update(deltaTime: number): void {
        this.gameState.gameTime += deltaTime;
        
        // Clear old attack events (older than 1 second)
        this.clearOldAttackEvents();
        
        // Check for game end conditions
        this.checkGameEndConditions();
        
        // Update game phase specific logic
        switch (this.gameState.gamePhase) {
            case GamePhase.PLAYING:
                this.updatePlayingPhase();
                break;
            case GamePhase.FINISHED:
                this.updateFinishedPhase();
                break;
        }
    }

    /**
     * Clears attack events older than 1 second
     */
    private clearOldAttackEvents(): void {
        const currentTime = this.gameState.gameTime;
        const eventsToRemove: number[] = [];
        
        this.gameState.attackEvents.forEach((event, index) => {
            if (currentTime - event.timestamp > 1000) { // 1 second
                eventsToRemove.push(index);
            }
        });
        
        // Remove events in reverse order to maintain indices
        eventsToRemove.reverse().forEach(index => {
            this.gameState.attackEvents.splice(index, 1);
        });
    }

    /**
     * Checks if the game should end
     */
    private checkGameEndConditions(): void {
        // Check if either cradle is destroyed
        if (!CombatantUtils.isCombatantAlive(this.gameState.blueCradle)) {
            this.endGame('red');
        } else if (!CombatantUtils.isCombatantAlive(this.gameState.redCradle)) {
            this.endGame('blue');
        }
    }

    /**
     * Updates logic specific to the playing phase
     */
    private updatePlayingPhase(): void {
        // Process combat
        this.processCombat();
        
        // Remove dead combatants
        this.removeDeadCombatants();
    }

    /**
     * Processes combat between all combatants
     */
    private processCombat(): void {
        const allCombatants = this.getAllCombatants();
        const currentTime = this.gameState.gameTime;
        
        allCombatants.forEach(attacker => {
            if (!CombatantUtils.isCombatantAlive(attacker)) return;
            
            // Skip respawning players
            if (attacker instanceof Player && attacker.state === 'respawning') return;
            
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
                    this.gameState.attackEvents.push(attackEvent);
                    
                    console.log(`${attacker.id} attacked ${target.id} for ${attacker.attackStrength} damage`);
                }
            }
        });
    }

    /**
     * Handles player respawning and removes dead combatants
     */
    private removeDeadCombatants(): void {
        const currentTime = this.gameState.gameTime;
        
        // Handle player respawning
        this.gameState.players.forEach((player, playerId) => {
            if (!CombatantUtils.isCombatantAlive(player) && player.state === 'alive') {
                // Player just died, start respawn process
                this.startPlayerRespawn(player);
            } else if (player.state === 'respawning' && currentTime >= player.respawnTime) {
                // Respawn timer completed
                this.completePlayerRespawn(player);
            }
        });
    }

    /**
     * Starts the respawn process for a player
     * @param player The player to respawn
     */
    private startPlayerRespawn(player: Player): void {
        player.state = 'respawning';
        player.respawnTime = this.gameState.gameTime + player.respawnDuration;
        
        // Move player to spawn location
        if (player.team === 'blue') {
            player.x = GAMEPLAY_CONFIG.CRADLE_POSITIONS.BLUE.x + GAMEPLAY_CONFIG.PLAYER_SPAWN_OFFSET;
            player.y = GAMEPLAY_CONFIG.CRADLE_POSITIONS.BLUE.y - GAMEPLAY_CONFIG.PLAYER_SPAWN_OFFSET;
        } else {
            player.x = GAMEPLAY_CONFIG.CRADLE_POSITIONS.RED.x - GAMEPLAY_CONFIG.PLAYER_SPAWN_OFFSET;
            player.y = GAMEPLAY_CONFIG.CRADLE_POSITIONS.RED.y + GAMEPLAY_CONFIG.PLAYER_SPAWN_OFFSET;
        }
        
        console.log(`Player ${player.id} started respawning`);
    }

    /**
     * Completes the respawn process for a player
     * @param player The player to complete respawn for
     */
    private completePlayerRespawn(player: Player): void {
        player.state = 'alive';
        player.health = GAMEPLAY_CONFIG.COMBAT.PLAYER.HEALTH;
        console.log(`Player ${player.id} respawned`);
    }

    /**
     * Updates logic specific to the finished phase
     */
    private updateFinishedPhase(): void {
        // Add finished phase specific logic here
        // e.g., victory screen, restart timer, etc.
    }

    /**
     * Ends the game with the specified winner
     * @param winningTeam The team that won ('blue' or 'red')
     */
    private endGame(winningTeam: string): void {
        this.gameState.gamePhase = GamePhase.FINISHED;
        console.log(`Game ended! ${winningTeam} team wins!`);
    }

    /**
     * Gets all combatants in the game (players + cradles + turrets)
     */
    getAllCombatants(): Combatant[] {
        const combatants: Combatant[] = [];
        
        // Add all players
        this.gameState.players.forEach((player: Player) => {
            combatants.push(player);
        });
        
        // Add cradles
        combatants.push(this.gameState.blueCradle);
        combatants.push(this.gameState.redCradle);
        
        // Add turrets
        combatants.push(this.gameState.blueTurret);
        combatants.push(this.gameState.redTurret);
        
        return combatants;
    }

    /**
     * Gets all combatants of a specific team
     * @param team The team to get combatants for ('blue' or 'red')
     */
    getCombatantsByTeam(team: string): Combatant[] {
        return this.getAllCombatants().filter(combatant => combatant.team === team);
    }

    /**
     * Gets all enemy combatants for a given team
     * @param team The team to get enemies for ('blue' or 'red')
     */
    getEnemyCombatants(team: string): Combatant[] {
        return this.getAllCombatants().filter(combatant => combatant.team !== team);
    }

    /**
     * Finds the closest enemy combatant to a given position
     * @param x X coordinate
     * @param y Y coordinate
     * @param team The team to find enemies for
     * @returns The closest enemy combatant, or null if none found
     */
    getClosestEnemy(x: number, y: number, team: string): Combatant | null {
        const enemies = this.getEnemyCombatants(team);
        if (enemies.length === 0) return null;

        let closest: Combatant | null = null;
        let closestDistance = Infinity;

        enemies.forEach(enemy => {
            const distance = Math.sqrt((x - enemy.x) ** 2 + (y - enemy.y) ** 2);
            if (distance < closestDistance) {
                closestDistance = distance;
                closest = enemy;
            }
        });

        return closest;
    }
} 