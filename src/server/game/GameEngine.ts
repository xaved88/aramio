import { GameState, Player, Combatant } from '../schema/GameState';
import { CombatantUtils } from './combatants/CombatantUtils';

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
        // Add playing phase specific logic here
        // e.g., minion spawning, objective updates, etc.
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
     * Gets all combatants in the game (players + cradles)
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