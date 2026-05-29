import { MapSchema, ArraySchema } from '@colyseus/schema';
import { ObjectiveManager } from '../ObjectiveManager';
import { GameState } from '../../../schema/GameState';
import { NeutralObjective } from '../../../schema/NeutralObjective';
import { Hero } from '../../../schema/Combatants';
import { RoundStats } from '../../../schema/Events';
import { TEST_GAMEPLAY_CONFIG } from '../../../config/TestGameplayConfig';
import { COMBATANT_TYPES } from '../../../../shared/types/CombatantTypes';
import { CombatantUtils } from '../../combatants/CombatantUtils';

function makeHero(id: string, team: string, x: number, y: number, health = 100): Hero {
    const hero = new Hero();
    hero.id = id;
    hero.type = COMBATANT_TYPES.HERO;
    hero.team = team;
    hero.x = x;
    hero.y = y;
    hero.health = health;
    hero.maxHealth = 100;
    hero.state = 'alive';
    hero.size = 15;
    hero.effects = new ArraySchema();
    hero.permanentEffects = new ArraySchema();
    hero.roundStats = new RoundStats();
    hero.bulletArmor = 0;
    hero.abilityArmor = 0;
    hero.lastDamageTime = 0;
    hero.getHealth = () => hero.health;
    hero.getMaxHealth = () => hero.maxHealth;
    return hero;
}

function makeState(gameTime = 0): GameState {
    const state = new GameState();
    state.gameTime = gameTime;
    return state;
}

const cfg = TEST_GAMEPLAY_CONFIG;
const SPAWN_INTERVAL = cfg.NEUTRAL_OBJECTIVES.SPAWN_INTERVAL_MS;
const TICK_RATE = cfg.NEUTRAL_OBJECTIVES.TICK_RATE_MS;
const POINTS_TO_WIN = cfg.NEUTRAL_OBJECTIVES.POINTS_TO_WIN;
const RADIUS = cfg.NEUTRAL_OBJECTIVES.RADIUS;

describe('ObjectiveManager', () => {
    let manager: ObjectiveManager;
    let state: GameState;

    beforeEach(() => {
        manager = new ObjectiveManager();
        state = makeState(0);
    });

    // ── 1. No spawn before interval ──────────────────────────────────────────
    it('does not spawn an objective before the interval elapses', () => {
        state.gameTime = SPAWN_INTERVAL - 1;
        manager.checkAndSpawn(state, cfg);
        expect(state.neutralObjectives.size).toBe(0);
    });

    // ── 2. Spawns at interval ────────────────────────────────────────────────
    it('spawns an objective at the spawn interval', () => {
        state.gameTime = SPAWN_INTERVAL;
        manager.checkAndSpawn(state, cfg);
        expect(state.neutralObjectives.size).toBe(1);

        const obj = Array.from(state.neutralObjectives.values())[0];
        expect(obj.state).toBe('active');
        expect(obj.radius).toBe(RADIUS);
        expect(cfg.NEUTRAL_OBJECTIVES.OBJECTIVE_BUFFS).toContain(obj.buffType);
        const siteNames = cfg.NEUTRAL_OBJECTIVES.SITES.map((s: any) => s.name);
        expect(siteNames).toContain(obj.name);
    });

    // ── 3. Control point accumulation ───────────────────────────────────────
    it('accumulates control points for heroes inside the zone each tick', () => {
        state.gameTime = SPAWN_INTERVAL;
        manager.checkAndSpawn(state, cfg);
        const obj = Array.from(state.neutralObjectives.values())[0];

        // Place 2 blue and 1 red hero inside the zone
        const b1 = makeHero('b1', 'blue', obj.x, obj.y);
        const b2 = makeHero('b2', 'blue', obj.x + 10, obj.y);
        const r1 = makeHero('r1', 'red', obj.x, obj.y + 10);
        state.combatants.set('b1', b1);
        state.combatants.set('b2', b2);
        state.combatants.set('r1', r1);

        // Advance game time past one tick
        state.gameTime = SPAWN_INTERVAL + TICK_RATE;
        manager.update(state, cfg);

        expect(obj.blueControlPoints).toBe(2);
        expect(obj.redControlPoints).toBe(1);
    });

    // ── 4. Heroes outside zone don't count ──────────────────────────────────
    it('does not count heroes outside the zone radius', () => {
        state.gameTime = SPAWN_INTERVAL;
        manager.checkAndSpawn(state, cfg);
        const obj = Array.from(state.neutralObjectives.values())[0];

        // Hero just outside the radius
        const outside = makeHero('out', 'blue', obj.x + RADIUS + 1, obj.y);
        state.combatants.set('out', outside);

        state.gameTime = SPAWN_INTERVAL + TICK_RATE;
        manager.update(state, cfg);

        expect(obj.blueControlPoints).toBe(0);
    });

    // ── 5. Win condition triggers correctly ──────────────────────────────────
    it('triggers a win when a team has a lead >= POINTS_TO_WIN', () => {
        state.gameTime = SPAWN_INTERVAL;
        manager.checkAndSpawn(state, cfg);
        const obj = Array.from(state.neutralObjectives.values())[0];

        // Manually set score so next tick pushes blue over the threshold
        obj.blueControlPoints = POINTS_TO_WIN - 1;
        obj.redControlPoints = 0;

        const blueHero = makeHero('b1', 'blue', obj.x, obj.y);
        blueHero.permanentEffects = new ArraySchema();
        state.combatants.set('b1', blueHero);

        state.gameTime = SPAWN_INTERVAL + TICK_RATE;
        manager.update(state, cfg);

        expect(obj.state).toBe('won');
        expect(obj.wonByTeam).toBe('blue');
    });

    // ── 6. Buff applied to alive team members ────────────────────────────────
    it('applies permanent buff to all alive heroes on the winning team', () => {
        state.gameTime = SPAWN_INTERVAL;
        manager.checkAndSpawn(state, cfg);
        const obj = Array.from(state.neutralObjectives.values())[0];
        obj.buffType = 'stat:health'; // deterministic for testing

        obj.blueControlPoints = POINTS_TO_WIN - 1;
        obj.redControlPoints = 0;

        const blueHero1 = makeHero('b1', 'blue', obj.x, obj.y);
        const blueHero2 = makeHero('b2', 'blue', obj.x + 5, obj.y + 5);
        const redHero = makeHero('r1', 'red', obj.x, obj.y);
        state.combatants.set('b1', blueHero1);
        state.combatants.set('b2', blueHero2);
        state.combatants.set('r1', redHero);

        state.gameTime = SPAWN_INTERVAL + TICK_RATE;
        manager.update(state, cfg);

        // Both blue heroes should have gained a permanent effect
        expect(blueHero1.permanentEffects.length).toBeGreaterThan(0);
        expect(blueHero2.permanentEffects.length).toBeGreaterThan(0);
        // Red hero should not have received a buff
        expect(redHero.permanentEffects.length).toBe(0);

        // The buff should be marked as coming from 'objective'
        const effect = blueHero1.permanentEffects[0] as any;
        expect(effect.source).toBe('objective');
    });

    // ── 7. Dead heroes don't receive buff ───────────────────────────────────
    it('does not apply buff to dead heroes on the winning team', () => {
        state.gameTime = SPAWN_INTERVAL;
        manager.checkAndSpawn(state, cfg);
        const obj = Array.from(state.neutralObjectives.values())[0];
        obj.buffType = 'stat:health';
        obj.blueControlPoints = POINTS_TO_WIN - 1;
        obj.redControlPoints = 0;

        const deadHero = makeHero('dead', 'blue', obj.x, obj.y, 0); // health = 0
        const aliveHero = makeHero('alive', 'blue', obj.x, obj.y);
        state.combatants.set('dead', deadHero);
        state.combatants.set('alive', aliveHero);

        state.gameTime = SPAWN_INTERVAL + TICK_RATE;
        manager.update(state, cfg);

        expect(deadHero.permanentEffects.length).toBe(0);
        expect(aliveHero.permanentEffects.length).toBeGreaterThan(0);
    });

    // ── 8. Fixed spawn schedule regardless of capture time ───────────────────
    it('spawns on a fixed 2-minute schedule even after early capture', () => {
        // First spawn at t=SPAWN_INTERVAL
        state.gameTime = SPAWN_INTERVAL;
        manager.checkAndSpawn(state, cfg);
        expect(state.neutralObjectives.size).toBe(1);

        // Capture it early (well before the next interval)
        const obj = Array.from(state.neutralObjectives.values())[0];
        obj.buffType = 'stat:health';
        obj.blueControlPoints = POINTS_TO_WIN - 1;
        const blueHero = makeHero('b1', 'blue', obj.x, obj.y);
        state.combatants.set('b1', blueHero);
        state.gameTime = SPAWN_INTERVAL + TICK_RATE;
        manager.update(state, cfg); // triggers capture, won state
        expect(obj.state).toBe('won');

        // Clean up won objective (simulating the 2-second post-win delay)
        state.neutralObjectives.delete(obj.id);

        // Just after capture: should not spawn yet (fixed interval not elapsed)
        state.gameTime = SPAWN_INTERVAL + TICK_RATE + 1;
        manager.checkAndSpawn(state, cfg);
        expect(state.neutralObjectives.size).toBe(0);

        // At exactly 2× the interval: new objective spawns
        state.gameTime = SPAWN_INTERVAL * 2;
        manager.checkAndSpawn(state, cfg);
        expect(state.neutralObjectives.size).toBe(1);
    });

    // ── 8b. Unclaimed objective is expired when timer fires ──────────────────
    it('expires an unclaimed active objective when the next interval fires', () => {
        // First spawn
        state.gameTime = SPAWN_INTERVAL;
        manager.checkAndSpawn(state, cfg);
        const firstId = Array.from(state.neutralObjectives.keys())[0];
        expect(state.neutralObjectives.size).toBe(1);

        // Nobody captures it — next interval fires with it still active
        state.gameTime = SPAWN_INTERVAL * 2;
        manager.checkAndSpawn(state, cfg);

        // Old objective should be gone, new one spawned
        expect(state.neutralObjectives.has(firstId)).toBe(false);
        expect(state.neutralObjectives.size).toBe(1);
    });

    // ── 9. Bot move target helper ────────────────────────────────────────────
    it('getObjectiveMoveTarget returns objective coords when active and bot is outside', () => {
        state.gameTime = SPAWN_INTERVAL;
        manager.checkAndSpawn(state, cfg);
        const obj = Array.from(state.neutralObjectives.values())[0];

        const bot = { x: 0, y: 0, size: 15 };
        const target = CombatantUtils.getObjectiveMoveTarget(bot, state, cfg);

        expect(target).not.toBeNull();
        expect(target!.x).toBe(obj.x);
        expect(target!.y).toBe(obj.y);
    });

    it('getObjectiveMoveTarget returns null when no objective is active', () => {
        const bot = { x: 0, y: 0, size: 15 };
        const target = CombatantUtils.getObjectiveMoveTarget(bot, state, cfg);
        expect(target).toBeNull();
    });

    it('getObjectiveMoveTarget returns null when bot is already inside the zone', () => {
        state.gameTime = SPAWN_INTERVAL;
        manager.checkAndSpawn(state, cfg);
        const obj = Array.from(state.neutralObjectives.values())[0];

        // Bot at the center of the objective, well inside radius
        const bot = { x: obj.x, y: obj.y, size: 15 };
        const target = CombatantUtils.getObjectiveMoveTarget(bot, state, cfg);
        expect(target).toBeNull();
    });
});
