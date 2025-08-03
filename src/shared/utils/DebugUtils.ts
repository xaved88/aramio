import { GameState, Hero } from '../../server/schema/GameState';

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
        const heroes = combatants.filter(c => c.type === 'hero');
        const turrets = combatants.filter(c => c.type === 'turret');
        
        if (heroes.length > 0) {
            lines.push(`  HEROES (${heroes.length}):`);
            heroes.forEach(hero => {
                const heroObj = hero as Hero;
                lines.push(`    ${hero.id} (${hero.team}) - HP: ${hero.health}/${hero.maxHealth} - Pos: (${hero.x}, ${hero.y}) - Level: ${heroObj.level} - XP: ${heroObj.experience} - Controller: ${heroObj.controller}`);
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
