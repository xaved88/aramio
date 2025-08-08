import { GameState as ColyseusGameState, Combatant as ColyseusCombatant, Hero as ColyseusHero, Minion as ColyseusMinion } from '../../server/schema/GameState';
import { SharedGameState, XPEvent, LevelUpEvent } from '../types/GameStateTypes';
import { Combatant, HeroCombatant, CradleCombatant, TurretCombatant, MinionCombatant, AttackEvent, DamageEvent, KillEvent, Projectile, RoundStats, DefaultAbility, HookshotAbility, COMBATANT_TYPES, CombatantId, ControllerId, ProjectileId, CombatantEffect } from '../types/CombatantTypes';

export function convertToSharedGameState(colyseusState: ColyseusGameState): SharedGameState {
    const sharedCombatants = new Map<CombatantId, Combatant>();
    
    // Convert all combatants to shared types
    colyseusState.combatants.forEach((combatant: ColyseusCombatant, id: string) => {
        const sharedCombatant = convertToSharedCombatant(combatant, id);
        sharedCombatants.set(id, sharedCombatant);
    });
    
    // Convert projectiles
    const sharedProjectiles = new Map<ProjectileId, Projectile>();
    colyseusState.projectiles.forEach((projectile: any, id: string) => {
        sharedProjectiles.set(id, {
            id: projectile.id,
            ownerId: projectile.ownerId,
            x: projectile.x,
            y: projectile.y,
            directionX: projectile.directionX,
            directionY: projectile.directionY,
            speed: projectile.speed,
            team: projectile.team,
            type: projectile.type || 'default', // Default to 'default' if not set
            duration: projectile.duration || -1, // Default to -1 (infinite) if not set
            createdAt: projectile.createdAt || Date.now(), // Default to current time if not set
            effects: projectile.effects ? projectile.effects.map((effect: any) => {
                switch (effect.effectType) {
                    case 'applyDamage':
                        return {
                            type: 'applyDamage',
                            damage: effect.damage || 0
                        };
                    case 'applyEffect':
                        return {
                            type: 'applyEffect',
                            combatantEffect: {
                                type: effect.combatantEffect?.type || 'stun',
                                duration: effect.combatantEffect?.duration || 0
                            }
                        };
                    default:
                        return null;
                }
            }).filter(Boolean) : []
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
        timestamp: event.timestamp,
        type: event.type
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

function convertToSharedCombatant(colyseusCombatant: ColyseusCombatant, id: CombatantId): Combatant {
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
        attackReadyAt: colyseusCombatant.attackReadyAt,
        effects: colyseusCombatant.effects ? colyseusCombatant.effects.map(effect => ({
            type: effect.type,
            duration: effect.duration,
            appliedAt: effect.appliedAt || Date.now(),
            moveData: effect.moveTargetX && effect.moveTargetY && effect.moveSpeed ? {
                targetX: effect.moveTargetX,
                targetY: effect.moveTargetY,
                speed: effect.moveSpeed
            } : undefined
        })) : []
    };
    
    switch (colyseusCombatant.type) {
        case COMBATANT_TYPES.HERO:
            const hero = colyseusCombatant as ColyseusHero;
            return {
                ...baseCombatant,
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
                    cooldown: (hero.ability as any).cooldown,
                    lastUsedTime: (hero.ability as any).lastUsedTime,
                    strength: (hero.ability as any).strength
                } as DefaultAbility | HookshotAbility,
                controller: hero.controller
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
