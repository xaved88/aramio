import { GameState as ColyseusGameState } from '../../server/schema/GameState';
import { Combatant as ColyseusCombatant, Hero as ColyseusHero, Minion as ColyseusMinion } from '../../server/schema/Combatants';
import { SharedGameState, XPEvent, LevelUpEvent, AOEDamageEvent, DeathEffectEvent, ProjectileMissEvent, KillStreakEvent } from '../types/GameStateTypes';
import { Combatant, HeroCombatant, CradleCombatant, TurretCombatant, MinionCombatant, AttackEvent, DamageEvent, KillEvent, Projectile, DefaultAbility, HookshotAbility, MercenaryAbility, PyromancerAbility, ThorndiveAbility, SniperAbility, COMBATANT_TYPES, CombatantId, ProjectileId } from '../types/CombatantTypes';
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
        originalAmount: event.originalAmount,
        timestamp: event.timestamp,
        damageSource: event.damageSource
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
    
    // Convert death effect events
    const sharedDeathEffectEvents: DeathEffectEvent[] = (colyseusState.deathEffectEvents || []).map(event => ({
        targetId: event.targetId,
        targetType: event.targetType,
        x: event.x,
        y: event.y,
        team: event.team,
        timestamp: event.timestamp
    }));
    
    // Convert projectile miss events
    const sharedProjectileMissEvents: ProjectileMissEvent[] = (colyseusState.projectileMissEvents || []).map(event => ({
        projectileId: event.projectileId,
        x: event.x,
        y: event.y,
        team: event.team,
        ownerId: event.ownerId,
        timestamp: event.timestamp
    }));
    
    // Convert kill streak events
    const sharedKillStreakEvents: KillStreakEvent[] = (colyseusState.killStreakEvents || []).map(event => ({
        heroId: event.heroId,
        heroName: event.heroName,
        team: event.team,
        killStreak: event.killStreak,
        timestamp: event.timestamp
    }));
    
    // Convert zones
    const sharedZones = new Map<string, any>();
    if (colyseusState.zones) {
        colyseusState.zones.forEach((zone: any, id: string) => {
            sharedZones.set(id, {
                id: zone.id,
                ownerId: zone.ownerId,
                x: zone.x,
                y: zone.y,
                radius: zone.radius,
                team: zone.team,
                type: zone.type,
                duration: zone.duration,
                createdAt: zone.createdAt,
                tickRate: zone.tickRate,
                lastTickTime: zone.lastTickTime
            });
        });
    }
    
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
        zones: sharedZones,
        aoeDamageEvents: sharedAOEDamageEvents,
        deathEffectEvents: sharedDeathEffectEvents,
        projectileMissEvents: sharedProjectileMissEvents,
        killStreakEvents: sharedKillStreakEvents,
        blueSuperMinionsTriggered: colyseusState.blueSuperMinionsTriggered,
        redSuperMinionsTriggered: colyseusState.redSuperMinionsTriggered
    };
}

function convertToSharedCombatant(colyseusCombatant: ColyseusCombatant, id: CombatantId): Combatant {
    // For heroes, we need to include permanent effects in stat calculations
    const allEffects = colyseusCombatant.type === COMBATANT_TYPES.HERO 
        ? [
            ...Array.from(colyseusCombatant.effects).filter(e => e != null),
            ...Array.from((colyseusCombatant as any).permanentEffects || []).filter(e => e != null)
          ]
        : Array.from(colyseusCombatant.effects).filter(e => e != null);

    const baseCombatant = {
        id: id,
        type: colyseusCombatant.type as any, // We trust the type is correct
        x: colyseusCombatant.x,
        y: colyseusCombatant.y,
        team: colyseusCombatant.team,
        health: applyStatModifications('health', colyseusCombatant.health, allEffects),
        maxHealth: applyStatModifications('maxHealth', colyseusCombatant.maxHealth, allEffects),
        attackRadius: applyStatModifications('attackRadius', colyseusCombatant.attackRadius, allEffects),
        attackStrength: applyStatModifications('attackStrength', colyseusCombatant.attackStrength, allEffects),
        attackSpeed: applyStatModifications('attackSpeed', colyseusCombatant.attackSpeed, allEffects),
        bulletArmor: applyStatModifications('bulletArmor', colyseusCombatant.bulletArmor, allEffects),
        abilityArmor: applyStatModifications('abilityArmor', colyseusCombatant.abilityArmor, allEffects),
        lastAttackTime: colyseusCombatant.lastAttackTime,
        size: colyseusCombatant.size,
        target: colyseusCombatant.target,
        windUp: applyStatModifications('windUp', colyseusCombatant.windUp, allEffects),
        attackReadyAt: colyseusCombatant.attackReadyAt,
        moveSpeed: applyStatModifications('moveSpeed', colyseusCombatant.moveSpeed, allEffects),
        lastDamageTime: colyseusCombatant.lastDamageTime || 0,
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
                case 'passive_healing':
                    return {
                        ...baseEffect,
                        healPercentPerSecond: (effect as any).healPercentPerSecond || 0
                    };
                case 'stun':
                case 'nocollision':
                case 'statmod':
                case 'reflect':
                case 'hunter':
                default:
                    return baseEffect;
            }
        }) : []
    };
    
    switch (colyseusCombatant.type) {
        case COMBATANT_TYPES.HERO:
            const hero = colyseusCombatant as ColyseusHero;
            const abilityPower = applyStatModifications('abilityPower', (hero as any).abilityPower || 10, allEffects);
            const strengthRatio = (hero.ability as any).strengthRatio || 0;
            return {
                ...baseCombatant,
                type: COMBATANT_TYPES.HERO,
                state: hero.state,
                respawnTime: hero.respawnTime,
                respawnDuration: hero.respawnDuration,
                experience: hero.experience,
                level: hero.level,
                experienceNeeded: hero.experienceNeeded,
                abilityPower: abilityPower,
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
                    cooldown: applyStatModifications('ability:cooldown', (hero.ability as any).cooldown, allEffects),
                    lastUsedTime: (hero.ability as any).lastUsedTime,
                    strength: abilityPower * strengthRatio,
                    strengthRatio: strengthRatio,
                    radius: (hero.ability as any).radius,
                    range: applyStatModifications('ability:range', (hero.ability as any).range || 0, allEffects),
                    duration: applyStatModifications('ability:duration', (hero.ability as any).duration || 0, allEffects),
                    tauntDuration: (hero.ability as any).tauntDuration,
                    landingRadius: (hero.ability as any).landingRadius,
                    fireballRadius: applyStatModifications('ability:pyromancerRadius', (hero.ability as any).fireballRadius || 0, allEffects),
                    mercenaryRageSpeedBoost: applyStatModifications('ability:mercenaryRageSpeed', (hero.ability as any).mercenaryRageSpeedBoost || 1.0, allEffects),
                    speed: applyStatModifications('ability:speed', (hero.ability as any).speed || 0, allEffects),
                } as DefaultAbility | HookshotAbility | MercenaryAbility | PyromancerAbility | ThorndiveAbility | SniperAbility,
                controller: hero.controller,
                displayName: hero.displayName,
                levelRewards: hero.levelRewards ? Array.from(hero.levelRewards) : [],
                rewardsForChoice: hero.rewardsForChoice ? Array.from(hero.rewardsForChoice) : [],
                permanentEffects: hero.permanentEffects ? hero.permanentEffects.map(effect => {
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
                        case 'passive_healing':
                            return {
                                ...baseEffect,
                                healPercentPerSecond: (effect as any).healPercentPerSecond || 0
                            };
                        case 'stun':
                        case 'nocollision':
                        case 'statmod':
                            return {
                                ...baseEffect,
                                stat: (effect as any).stat,
                                operator: (effect as any).operator,
                                amount: (effect as any).amount
                            };
                        case 'reflect':
                        case 'hunter':
                        default:
                            return baseEffect;
                    }
                }) : []
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
                minionType: minion.minionType,
                isBuffed: minion.isBuffed // TODO: Not used yet, but will be for visual distinction of buffed minions
            } as MinionCombatant;
            
        default:
            throw new Error(`Unknown combatant type: ${colyseusCombatant.type}`);
    }
} 
