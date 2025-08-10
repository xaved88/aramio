import { GameState as ColyseusGameState } from '../../server/schema/GameState';
import { Combatant as ColyseusCombatant, Hero as ColyseusHero, Minion as ColyseusMinion } from '../../server/schema/Combatants';
import { SharedGameState, XPEvent, LevelUpEvent, AOEDamageEvent } from '../types/GameStateTypes';
import { Combatant, HeroCombatant, CradleCombatant, TurretCombatant, MinionCombatant, AttackEvent, DamageEvent, KillEvent, Projectile, DefaultAbility, HookshotAbility, MercenaryAbility, PyromancerAbility, ThorndiveAbility, COMBATANT_TYPES, CombatantId, ProjectileId } from '../types/CombatantTypes';
import { applyStatModifications } from './StatModification';

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
            targetX: projectile.targetX,
            targetY: projectile.targetY,
            aoeRadius: projectile.aoeRadius,
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
    
    // Convert AOE damage events
    const sharedAOEDamageEvents: AOEDamageEvent[] = colyseusState.aoeDamageEvents.map(event => ({
        sourceId: event.sourceId,
        x: event.x,
        y: event.y,
        radius: event.radius,
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
        projectiles: sharedProjectiles,
        aoeDamageEvents: sharedAOEDamageEvents
    };
}

function convertToSharedCombatant(colyseusCombatant: ColyseusCombatant, id: CombatantId): Combatant {
    const baseCombatant = {
        id: id,
        type: colyseusCombatant.type as any, // We trust the type is correct
        x: colyseusCombatant.x,
        y: colyseusCombatant.y,
        team: colyseusCombatant.team,
        health: applyStatModifications('health', colyseusCombatant.health, Array.from(colyseusCombatant.effects).filter(e => e != null)),
        maxHealth: applyStatModifications('maxHealth', colyseusCombatant.maxHealth, Array.from(colyseusCombatant.effects).filter(e => e != null)),
        attackRadius: applyStatModifications('attackRadius', colyseusCombatant.attackRadius, Array.from(colyseusCombatant.effects).filter(e => e != null)),
        attackStrength: applyStatModifications('attackStrength', colyseusCombatant.attackStrength, Array.from(colyseusCombatant.effects).filter(e => e != null)),
        attackSpeed: applyStatModifications('attackSpeed', colyseusCombatant.attackSpeed, Array.from(colyseusCombatant.effects).filter(e => e != null)),
        bulletArmor: applyStatModifications('bulletArmor', colyseusCombatant.bulletArmor, Array.from(colyseusCombatant.effects).filter(e => e != null)),
        abilityArmor: applyStatModifications('abilityArmor', colyseusCombatant.abilityArmor, Array.from(colyseusCombatant.effects).filter(e => e != null)),
        lastAttackTime: colyseusCombatant.lastAttackTime,
        size: colyseusCombatant.size,
        target: colyseusCombatant.target,
        windUp: applyStatModifications('windUp', colyseusCombatant.windUp, Array.from(colyseusCombatant.effects).filter(e => e != null)),
        attackReadyAt: colyseusCombatant.attackReadyAt,
        moveSpeed: applyStatModifications('moveSpeed', colyseusCombatant.moveSpeed, Array.from(colyseusCombatant.effects).filter(e => e != null)),
        effects: colyseusCombatant.effects ? colyseusCombatant.effects.map(effect => {
            const baseEffect = {
                type: effect.type,
                duration: effect.duration,
                appliedAt: effect.appliedAt || Date.now()
            };
            
            // Handle specific effect types
            switch (effect.type) {
                case 'move':
                    return {
                        ...baseEffect,
                        type: 'move',
                        moveTargetX: (effect as any).moveTargetX,
                        moveTargetY: (effect as any).moveTargetY,
                        moveSpeed: (effect as any).moveSpeed
                    };
                case 'stun':
                case 'nocollision':
                case 'statmod':
                case 'reflect':
                case 'hunter':
                    return baseEffect;
                default:
                    return baseEffect;
            }
        }) : []
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
                    strength: (hero.ability as any).strength,
                    radius: (hero.ability as any).radius,
                    range: (hero.ability as any).range,
                    landingRadius: (hero.ability as any).landingRadius
                } as DefaultAbility | HookshotAbility | MercenaryAbility | PyromancerAbility | ThorndiveAbility,
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
