import { GameState as ColyseusGameState, Combatant as ColyseusCombatant, Player as ColyseusPlayer, Minion as ColyseusMinion } from '../../server/schema/GameState';
import { SharedGameState } from '../types/GameStateTypes';
import { Combatant, PlayerCombatant, CradleCombatant, TurretCombatant, MinionCombatant, AttackEvent, Projectile, COMBATANT_TYPES } from '../types/CombatantTypes';

export function convertToSharedGameState(colyseusState: ColyseusGameState): SharedGameState {
    const sharedCombatants = new Map<string, Combatant>();
    
    // Convert all combatants to shared types
    colyseusState.combatants.forEach((combatant: ColyseusCombatant, id: string) => {
        const sharedCombatant = convertToSharedCombatant(combatant);
        sharedCombatants.set(id, sharedCombatant);
    });
    
    // Convert projectiles
    const sharedProjectiles = new Map<string, Projectile>();
    colyseusState.projectiles.forEach((projectile: any, id: string) => {
        sharedProjectiles.set(id, {
            id: projectile.id,
            ownerId: projectile.ownerId,
            x: projectile.x,
            y: projectile.y,
            directionX: projectile.directionX,
            directionY: projectile.directionY,
            speed: projectile.speed,
            strength: projectile.strength,
            team: projectile.team
        });
    });
    
    // Convert attack events
    const sharedAttackEvents: AttackEvent[] = colyseusState.attackEvents.map(event => ({
        sourceId: event.sourceId,
        targetId: event.targetId,
        timestamp: event.timestamp
    }));
    
    return {
        gameTime: colyseusState.gameTime,
        gamePhase: colyseusState.gamePhase,
        currentWave: colyseusState.currentWave,
        winningTeam: colyseusState.winningTeam,
        gameEndTime: colyseusState.gameEndTime,
        combatants: sharedCombatants,
        attackEvents: sharedAttackEvents,
        projectiles: sharedProjectiles
    };
}

function convertToSharedCombatant(colyseusCombatant: ColyseusCombatant): Combatant {
    const baseCombatant = {
        id: colyseusCombatant.id,
        type: colyseusCombatant.type as any, // We trust the type is correct
        x: colyseusCombatant.x,
        y: colyseusCombatant.y,
        team: colyseusCombatant.team,
        health: colyseusCombatant.health,
        maxHealth: colyseusCombatant.maxHealth,
        attackRadius: colyseusCombatant.attackRadius,
        attackStrength: colyseusCombatant.attackStrength,
        attackSpeed: colyseusCombatant.attackSpeed,
        lastAttackTime: colyseusCombatant.lastAttackTime
    };
    
    switch (colyseusCombatant.type) {
        case COMBATANT_TYPES.PLAYER:
            const player = colyseusCombatant as ColyseusPlayer;
            return {
                ...baseCombatant,
                type: COMBATANT_TYPES.PLAYER,
                state: player.state,
                respawnTime: player.respawnTime,
                respawnDuration: player.respawnDuration,
                experience: player.experience,
                level: player.level,
                ability: {
                    type: player.ability.type,
                    cooldown: player.ability.cooldown,
                    lastUsedTime: player.ability.lastUsedTime
                }
            } as PlayerCombatant;
            
        case COMBATANT_TYPES.CRADLE:
            return {
                ...baseCombatant,
                type: COMBATANT_TYPES.CRADLE
            } as CradleCombatant;
            
        case COMBATANT_TYPES.TURRET:
            return {
                ...baseCombatant,
                type: COMBATANT_TYPES.TURRET
            } as TurretCombatant;
            
        case COMBATANT_TYPES.MINION:
            const minion = colyseusCombatant as ColyseusMinion;
            return {
                ...baseCombatant,
                type: COMBATANT_TYPES.MINION,
                minionType: minion.minionType
            } as MinionCombatant;
            
        default:
            throw new Error(`Unknown combatant type: ${colyseusCombatant.type}`);
    }
} 