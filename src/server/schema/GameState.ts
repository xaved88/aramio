import { Schema, type, MapSchema, ArraySchema } from '@colyseus/schema';
import { CombatantId } from '../../shared/types/CombatantTypes';
import { ObstacleId } from '../../shared/types/ObstacleTypes';
import { Combatant } from './Combatants';
import { AttackEvent, XPEvent, LevelUpEvent, DamageEvent, KillEvent, AOEDamageEvent, DeathEffectEvent, ProjectileMissEvent, SuperMinionTriggerEvent, KillStreakEvent } from './Events';
import { Projectile } from './Projectiles';
import { Zone } from './Zones';
import { Obstacle } from './Obstacles';

export class GameState extends Schema {
    @type('number') gameTime = 0;
    @type('string') gamePhase = 'playing';
    @type('number') currentWave = 0;
    @type('string') winningTeam = '';
    @type('number') gameEndTime = 0;
    @type('boolean') isPaused = false;
    @type('string') gameplayConfig = ''; // Serialized gameplay configuration for client
    @type({ map: Combatant }) combatants = new MapSchema<Combatant, CombatantId>();
    @type([AttackEvent]) attackEvents = new ArraySchema<AttackEvent>();
    @type([XPEvent]) xpEvents = new ArraySchema<XPEvent>();
    @type([LevelUpEvent]) levelUpEvents = new ArraySchema<LevelUpEvent>();
    @type([DamageEvent]) damageEvents = new ArraySchema<DamageEvent>();
    @type([KillEvent]) killEvents = new ArraySchema<KillEvent>();
    @type([AOEDamageEvent]) aoeDamageEvents = new ArraySchema<AOEDamageEvent>();
    @type([DeathEffectEvent]) deathEffectEvents = new ArraySchema<DeathEffectEvent>();
    @type([ProjectileMissEvent]) projectileMissEvents = new ArraySchema<ProjectileMissEvent>();
    @type([KillStreakEvent]) killStreakEvents = new ArraySchema<KillStreakEvent>();
    @type({ map: Projectile }) projectiles = new MapSchema<Projectile>();
    @type({ map: Zone }) zones = new MapSchema<Zone>();
    @type({ map: Obstacle }) obstacles = new MapSchema<Obstacle, ObstacleId>();
    @type({ map: 'number' }) warriorSpawnTimes = new MapSchema<number>(); // Track when warriors were spawned for each wave
    @type({ map: 'boolean' }) archerSpawned = new MapSchema<boolean>(); // Track if archers have been spawned for each wave
    @type('boolean') blueSuperMinionsTriggered = false; // Track if blue super minions are triggered
    @type('boolean') redSuperMinionsTriggered = false; // Track if red super minions are triggered
} 
