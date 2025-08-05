import { GameState as ColyseusGameState, Combatant as ColyseusCombatant, Hero as ColyseusHero, Minion as ColyseusMinion } from '../../server/schema/GameState';
import { SharedGameState, XPEvent, LevelUpEvent } from '../types/GameStateTypes';
import { Combatant, HeroCombatant, CradleCombatant, TurretCombatant, MinionCombatant, AttackEvent, DamageEvent, KillEvent, Projectile, RoundStats, COMBATANT_TYPES } from '../types/CombatantTypes';

export function convertToSharedGameState(colyseusState: ColyseusGameState): SharedGameState {
    const sharedCombatants = new Map<string, Combatant>();
    
    // Convert all combatants to shared types
    colyseusState.combatants.forEach((combatant: ColyseusCombatant, id: string) => {
        const sharedCombatant = convertToSharedCombatant(combatant, id);
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
    
    // Convert XP events
    const sharedXPEvents: XPEvent[] = colyseusState.xpEvents.map(event => ({
        playerId: event.playerId,
        amount: event.amount,
        x: event.x,
        y: event.y,
        timestamp: event.timestamp
    }));
    
    // Convert level-up events
    const sharedLevelUpEvents: LevelUpEvent[] = colyseusState.levelUpEvents.map(event => ({
        playerId: event.playerId,
        newLevel: event.newLevel,
        x: event.x,
        y: event.y,
        timestamp: event.timestamp
    }));
    
    // Convert damage events
    const sharedDamageEvents: DamageEvent[] = colyseusState.damageEvents.map(event => ({
        sourceId: event.sourceId,
        targetId: event.targetId,
        targetType: event.targetType,
        amount: event.amount,
        timestamp: event.timestamp
    }));
    
    // Convert kill events
    const sharedKillEvents: KillEvent[] = colyseusState.killEvents.map(event => ({
        sourceId: event.sourceId,
        targetId: event.targetId,
        targetType: event.targetType,
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
        xpEvents: sharedXPEvents,
        levelUpEvents: sharedLevelUpEvents,
        damageEvents: sharedDamageEvents,
        killEvents: sharedKillEvents,
        projectiles: sharedProjectiles
    };
}

function convertToSharedCombatant(colyseusCombatant: ColyseusCombatant, id: string): Combatant {
    const baseCombatant = {
        id: id,
        type: colyseusCombatant.type as any, // We trust the type is correct
        x: colyseusCombatant.x,
        y: colyseusCombatant.y,
        team: colyseusCombatant.team,
        health: colyseusCombatant.health,
        maxHealth: colyseusCombatant.maxHealth,
        attackRadius: colyseusCombatant.attackRadius,
        attackStrength: colyseusCombatant.attackStrength,
        attackSpeed: colyseusCombatant.attackSpeed,
        lastAttackTime: colyseusCombatant.lastAttackTime,
        size: colyseusCombatant.size,
        target: colyseusCombatant.target,
        windUp: colyseusCombatant.windUp,
        attackReadyAt: colyseusCombatant.attackReadyAt
    };
    
    switch (colyseusCombatant.type) {
        case COMBATANT_TYPES.HERO:
            const hero = colyseusCombatant as ColyseusHero;
            return {
                id: id,
                type: COMBATANT_TYPES.HERO,
                state: hero.state,
                respawnTime: hero.respawnTime,
                respawnDuration: hero.respawnDuration,
                experience: hero.experience,
                level: hero.level,
                roundStats: {
                    totalExperience: hero.roundStats.totalExperience,
                    minionKills: hero.roundStats.minionKills,
                    heroKills: hero.roundStats.heroKills,
                    turretKills: hero.roundStats.turretKills,
                    damageTaken: hero.roundStats.damageTaken,
                    damageDealt: hero.roundStats.damageDealt
                },
                ability: {
                    type: hero.ability.type,
                    cooldown: hero.ability.cooldown,
                    lastUsedTime: hero.ability.lastUsedTime,
                    strength: hero.ability.strength
                },
                controller: hero.controller,
                team: colyseusCombatant.team,
                x: colyseusCombatant.x,
                y: colyseusCombatant.y,
                health: colyseusCombatant.health,
                maxHealth: colyseusCombatant.maxHealth,
                attackRadius: colyseusCombatant.attackRadius,
                attackStrength: colyseusCombatant.attackStrength,
                attackSpeed: colyseusCombatant.attackSpeed,
                lastAttackTime: colyseusCombatant.lastAttackTime,
                size: colyseusCombatant.size,
                target: colyseusCombatant.target,
                windUp: colyseusCombatant.windUp,
                attackReadyAt: colyseusCombatant.attackReadyAt
            } as HeroCombatant;
            
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
