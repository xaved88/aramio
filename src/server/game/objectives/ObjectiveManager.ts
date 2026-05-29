import { GameState } from '../../schema/GameState';
import { NeutralObjective } from '../../schema/NeutralObjective';
import { StatModEffect } from '../../schema/Effects';
import { COMBATANT_EFFECT_TYPES, COMBATANT_TYPES } from '../../../shared/types/CombatantTypes';
import { GameplayConfig } from '../../config/ConfigProvider';

let objectiveCounter = 0;

export class ObjectiveManager {
    private lastSpawnTime: number = 0; // first spawn happens when gameTime >= SPAWN_INTERVAL_MS

    checkAndSpawn(state: GameState, config: GameplayConfig): void {
        const objConfig = config.NEUTRAL_OBJECTIVES;

        const elapsed = state.gameTime - this.lastSpawnTime;
        if (elapsed < objConfig.SPAWN_INTERVAL_MS) return;

        // Expire any unclaimed active objective without awarding a buff
        state.neutralObjectives.forEach((obj, id) => {
            if (obj.state === 'active') state.neutralObjectives.delete(id);
        });

        const sites: Array<{ id: string; name: string; x: number; y: number }> = objConfig.SITES;
        const site = sites[Math.floor(Math.random() * sites.length)];
        const buffs: string[] = objConfig.OBJECTIVE_BUFFS;
        const buffType = buffs[Math.floor(Math.random() * buffs.length)];

        const obj = new NeutralObjective();
        obj.id = `objective-${++objectiveCounter}`;
        obj.name = site.name;
        obj.x = site.x;
        obj.y = site.y;
        obj.radius = objConfig.RADIUS;
        obj.state = 'active';
        obj.blueControlPoints = 0;
        obj.redControlPoints = 0;
        obj.wonByTeam = '';
        obj.buffType = buffType;
        obj.spawnedAt = state.gameTime;
        obj.lastTickTime = state.gameTime;

        state.neutralObjectives.set(obj.id, obj);
        this.lastSpawnTime = state.gameTime;
    }

    update(state: GameState, config: GameplayConfig): void {
        const objConfig = config.NEUTRAL_OBJECTIVES;

        // Tick active objectives
        state.neutralObjectives.forEach((obj) => {
            if (obj.state === 'won') return; // cleanup handled below

            // Tick control points once per TICK_RATE_MS
            if (state.gameTime - obj.lastTickTime < objConfig.TICK_RATE_MS) return;
            obj.lastTickTime = state.gameTime;

            // Count alive heroes of each team inside the zone
            let blueIn = 0;
            let redIn = 0;
            state.combatants.forEach((combatant: any) => {
                if (combatant.type !== COMBATANT_TYPES.HERO) return;
                if (combatant.health <= 0 || combatant.state === 'respawning') return;

                const dx = combatant.x - obj.x;
                const dy = combatant.y - obj.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > obj.radius) return;

                if (combatant.team === 'blue') blueIn++;
                else if (combatant.team === 'red') redIn++;
            });

            obj.blueControlPoints += blueIn;
            obj.redControlPoints += redIn;

            // Check win condition: 20-point lead
            const lead = obj.blueControlPoints - obj.redControlPoints;
            if (Math.abs(lead) >= objConfig.POINTS_TO_WIN) {
                const winner = lead > 0 ? 'blue' : 'red';
                obj.state = 'won';
                obj.wonByTeam = winner;
                // Reuse lastTickTime as "won at" timestamp for cleanup timing
                obj.lastTickTime = state.gameTime;
                this.applyTeamBuff(state, winner, obj.buffType, config);
            }
        });

        // Remove objectives that have been in 'won' state for 2 seconds (clients have had time to animate)
        const toDelete: string[] = [];
        state.neutralObjectives.forEach((obj, id) => {
            if (obj.state === 'won' && state.gameTime - obj.lastTickTime >= 2000) {
                toDelete.push(id);
            }
        });
        toDelete.forEach(id => state.neutralObjectives.delete(id));
    }

    private applyTeamBuff(state: GameState, team: string, buffType: string, config: GameplayConfig): void {
        const rewardTypes = config.REWARDS.REWARD_TYPES;
        const rewardType = rewardTypes[buffType as keyof typeof rewardTypes];
        if (!rewardType || rewardType.type !== 'stat') return;

        state.combatants.forEach((combatant: any) => {
            if (combatant.type !== COMBATANT_TYPES.HERO) return;
            if (combatant.team !== team) return;
            if (combatant.health <= 0 || combatant.state === 'respawning') return;

            rewardType.stats.forEach((statConfig: any) => {
                const effect = new StatModEffect();
                effect.type = COMBATANT_EFFECT_TYPES.STATMOD;
                effect.stat = statConfig.stat;
                effect.operator = statConfig.modifier.type === 'flat' ? 'relative' : 'percent';
                effect.amount = statConfig.modifier.value;
                effect.duration = -1; // permanent
                effect.appliedAt = state.gameTime;
                effect.source = 'objective';
                combatant.permanentEffects.push(effect);
            });
        });
    }
}
