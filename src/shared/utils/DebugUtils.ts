import { GameState, Player } from '../../server/schema/GameState';

export function gameStateToString(gameState: GameState): string {
    const lines: string[] = [];
    
    lines.push(`=== GAME STATE DEBUG ===`);
    lines.push(`Game Time: ${gameState.gameTime}ms`);
    lines.push(`Game Phase: ${gameState.gamePhase}`);
    lines.push(``);
    
    // Combatants breakdown
    lines.push(`COMBATANTS (${gameState.combatants.size} total):`);
    if (gameState.combatants.size === 0) {
        lines.push(`  No combatants`);
    } else {
        const combatants = Array.from(gameState.combatants.values());
        const players = combatants.filter(c => c.type === 'player');
        const turrets = combatants.filter(c => c.type === 'turret');
        
        if (players.length > 0) {
            lines.push(`  PLAYERS (${players.length}):`);
            players.forEach(player => {
                const playerObj = player as Player;
                lines.push(`    ${player.id} (${player.team}) - HP: ${player.health}/${player.maxHealth} - Pos: (${player.x}, ${player.y}) - Level: ${playerObj.level} - XP: ${playerObj.experience}`);
            });
        }
        
        if (turrets.length > 0) {
            lines.push(`  TURRETS (${turrets.length}):`);
            turrets.forEach(turret => {
                lines.push(`    ${turret.id} (${turret.team}) - HP: ${turret.health}/${turret.maxHealth} - Pos: (${turret.x}, ${turret.y})`);
            });
        }
    }
    
    // Attack events
    lines.push(``);
    lines.push(`ATTACK EVENTS (${gameState.attackEvents.length}):`);
    if (gameState.attackEvents.length === 0) {
        lines.push(`  No recent attacks`);
    } else {
        gameState.attackEvents.slice(-5).forEach(event => {
            lines.push(`  ${event.sourceId} -> ${event.targetId} at ${event.timestamp}ms`);
        });
    }
    
    // Summary stats
    lines.push(``);
    const totalHealth = Array.from(gameState.combatants.values())
        .reduce((total, c) => total + c.health, 0);
    const totalMaxHealth = Array.from(gameState.combatants.values())
        .reduce((total, c) => total + c.maxHealth, 0);
    lines.push(`SUMMARY:`);
    lines.push(`  Total Health: ${totalHealth}/${totalMaxHealth}`);
    lines.push(`  Health Percentage: ${totalMaxHealth > 0 ? Math.round((totalHealth / totalMaxHealth) * 100) : 0}%`);
    
    return lines.join('\n');
}

export function getTotalCombatantHealth(gameState: GameState): number {
    return Array.from(gameState.combatants.values())
        .reduce((total, combatant) => total + combatant.health, 0);
} 