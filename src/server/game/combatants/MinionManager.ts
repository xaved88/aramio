import { GameState } from '../../schema/GameState';
import { Minion } from '../../schema/Combatants';
import { GAMEPLAY_CONFIG } from '../../../Config';
import { COMBATANT_TYPES, MINION_TYPES, MinionType } from '../../../shared/types/CombatantTypes';
import { CombatantUtils } from './CombatantUtils';

export class MinionManager {
    static moveMinions(state: GameState): void {
        const allCombatants = Array.from(state.combatants.values());
        
        allCombatants.forEach(combatant => {
            if (combatant.type !== COMBATANT_TYPES.MINION) return;
            if (!CombatantUtils.isCombatantAlive(combatant)) return;
            
            const minion = combatant as Minion;
            this.moveMinion(minion, allCombatants);
        });
    }
    
    private static moveMinion(minion: Minion, allCombatants: any[]): void {
        // Check if minion is stunned - stunned minions cannot move
        if (this.isCombatantStunned(minion)) {
            return;
        }
        
        // Check if minion has enemies in attack range
        const enemiesInRange = allCombatants.filter(target => {
            if (!CombatantUtils.isCombatantAlive(target)) return false;
            if (!CombatantUtils.areOpposingTeams(minion, target)) return false;
            return CombatantUtils.isInRange(minion, target, minion.attackRadius);
        });
        
        // If enemies in range, stand still
        if (enemiesInRange.length > 0) {
            return;
        }
        
        // Otherwise, move towards enemy cradle
        const enemyCradle = this.findEnemyCradle(minion.team, allCombatants);
        if (!enemyCradle) return;
        
        this.moveTowardsTarget(minion, enemyCradle.x, enemyCradle.y);
    }
    
    /**
     * Checks if a combatant is stunned
     * @param combatant The combatant to check
     * @returns True if the combatant is stunned, false otherwise
     */
    private static isCombatantStunned(combatant: any): boolean {
        if (!combatant.effects || combatant.effects.length === 0) return false;
        
        return combatant.effects.some((effect: any) => effect.type === 'stun');
    }
    
    private static findEnemyCradle(minionTeam: string, allCombatants: any[]): any | null {
        const enemyTeam = minionTeam === 'blue' ? 'red' : 'blue';
        return allCombatants.find(combatant => 
            combatant.type === COMBATANT_TYPES.CRADLE && 
            combatant.team === enemyTeam &&
            CombatantUtils.isCombatantAlive(combatant)
        ) || null;
    }
    
    private static moveTowardsTarget(minion: Minion, targetX: number, targetY: number): void {
        // Calculate direction vector
        const dx = targetX - minion.x;
        const dy = targetY - minion.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // If we're close enough, don't move
        if (distance < GAMEPLAY_CONFIG.PLAYER_STOP_DISTANCE) {
            return;
        }
        
        // Normalize direction and apply speed
        const normalizedDx = dx / distance;
        const normalizedDy = dy / distance;
        
        // Calculate new position using modified move speed
        const moveSpeed = minion.getMoveSpeed();
        const newX = minion.x + normalizedDx * moveSpeed;
        const newY = minion.y + normalizedDy * moveSpeed;
        
        // Clamp to game bounds
        minion.x = Math.max(GAMEPLAY_CONFIG.GAME_BOUNDS.MIN_X, Math.min(GAMEPLAY_CONFIG.GAME_BOUNDS.MAX_X, newX));
        minion.y = Math.max(GAMEPLAY_CONFIG.GAME_BOUNDS.MIN_Y, Math.min(GAMEPLAY_CONFIG.GAME_BOUNDS.MAX_Y, newY));
    }

    static spawnMinionWave(state: GameState): void {
        // Spawn warriors for both teams first
        this.spawnTeamWarriors(state, 'blue');
        this.spawnTeamWarriors(state, 'red');
        
        // Track when warriors were spawned for this wave
        state.warriorSpawnTimes.set(state.currentWave.toString(), state.gameTime);
    }

    private static spawnTeamWarriors(state: GameState, team: string): void {
        const cradlePosition = team === 'blue' 
            ? GAMEPLAY_CONFIG.CRADLE_POSITIONS.BLUE 
            : GAMEPLAY_CONFIG.CRADLE_POSITIONS.RED;

        // Spawn warriors
        for (let i = 0; i < GAMEPLAY_CONFIG.MINION_SPAWNING.WARRIORS_PER_WAVE; i++) {
            this.spawnMinion(state, team, MINION_TYPES.WARRIOR, cradlePosition);
        }
    }

    private static spawnTeamArchers(state: GameState, team: string): void {
        const cradlePosition = team === 'blue' 
            ? GAMEPLAY_CONFIG.CRADLE_POSITIONS.BLUE 
            : GAMEPLAY_CONFIG.CRADLE_POSITIONS.RED;

        // Spawn archers
        for (let i = 0; i < GAMEPLAY_CONFIG.MINION_SPAWNING.ARCHERS_PER_WAVE; i++) {
            this.spawnMinion(state, team, MINION_TYPES.ARCHER, cradlePosition);
        }
    }

    private static spawnTeamMinions(state: GameState, team: string): void {
        const cradlePosition = team === 'blue' 
            ? GAMEPLAY_CONFIG.CRADLE_POSITIONS.BLUE 
            : GAMEPLAY_CONFIG.CRADLE_POSITIONS.RED;

        // Spawn warriors
        for (let i = 0; i < GAMEPLAY_CONFIG.MINION_SPAWNING.WARRIORS_PER_WAVE; i++) {
            this.spawnMinion(state, team, MINION_TYPES.WARRIOR, cradlePosition);
        }

        // Spawn archers
        for (let i = 0; i < GAMEPLAY_CONFIG.MINION_SPAWNING.ARCHERS_PER_WAVE; i++) {
            this.spawnMinion(state, team, MINION_TYPES.ARCHER, cradlePosition);
        }
    }

    private static spawnMinion(state: GameState, team: string, minionType: MinionType, cradlePosition: { x: number, y: number }): void {
        const minion = new Minion();
        minion.id = `${team}-${minionType}-${Date.now()}-${Math.random()}`;
        minion.type = COMBATANT_TYPES.MINION;
        minion.team = team;
        minion.minionType = minionType;
        minion.health = GAMEPLAY_CONFIG.COMBAT.MINION[minionType.toUpperCase() as keyof typeof GAMEPLAY_CONFIG.COMBAT.MINION].HEALTH;
        minion.maxHealth = minion.health;
        minion.attackRadius = GAMEPLAY_CONFIG.COMBAT.MINION[minionType.toUpperCase() as keyof typeof GAMEPLAY_CONFIG.COMBAT.MINION].ATTACK_RADIUS;
        minion.attackStrength = GAMEPLAY_CONFIG.COMBAT.MINION[minionType.toUpperCase() as keyof typeof GAMEPLAY_CONFIG.COMBAT.MINION].ATTACK_STRENGTH;
        minion.attackSpeed = GAMEPLAY_CONFIG.COMBAT.MINION[minionType.toUpperCase() as keyof typeof GAMEPLAY_CONFIG.COMBAT.MINION].ATTACK_SPEED;
        minion.windUp = GAMEPLAY_CONFIG.COMBAT.MINION[minionType.toUpperCase() as keyof typeof GAMEPLAY_CONFIG.COMBAT.MINION].WIND_UP;
        minion.moveSpeed = GAMEPLAY_CONFIG.MINION_MOVE_SPEED;
        minion.attackReadyAt = 0; // Initialize to 0 (no wind-up in progress)
        minion.size = GAMEPLAY_CONFIG.COMBAT.MINION[minionType.toUpperCase() as keyof typeof GAMEPLAY_CONFIG.COMBAT.MINION].SIZE;
        minion.lastAttackTime = 0;
        minion.bulletArmor = 0;
        minion.abilityArmor = 0;

        // Random position near cradle
        const angle = Math.random() * 2 * Math.PI;
        const distance = Math.random() * GAMEPLAY_CONFIG.MINION_SPAWNING.SPAWN_RADIUS;
        minion.x = cradlePosition.x + Math.cos(angle) * distance;
        minion.y = cradlePosition.y + Math.sin(angle) * distance;

        // Clamp to game bounds
        minion.x = Math.max(GAMEPLAY_CONFIG.GAME_BOUNDS.MIN_X, Math.min(GAMEPLAY_CONFIG.GAME_BOUNDS.MAX_X, minion.x));
        minion.y = Math.max(GAMEPLAY_CONFIG.GAME_BOUNDS.MIN_Y, Math.min(GAMEPLAY_CONFIG.GAME_BOUNDS.MAX_Y, minion.y));

        state.combatants.set(minion.id, minion);
    }

    static checkAndSpawnWave(state: GameState): void {
        const currentTime = state.gameTime;
        const firstWaveTime = GAMEPLAY_CONFIG.MINION_SPAWNING.FIRST_WAVE_DELAY_MS;
        const waveInterval = GAMEPLAY_CONFIG.MINION_SPAWNING.WAVE_INTERVAL_MS;

        // Calculate expected wave number
        let expectedWave = 0;
        if (currentTime >= firstWaveTime) {
            expectedWave = Math.floor((currentTime - firstWaveTime) / waveInterval) + 1;
        }

        // If we're behind on waves, spawn new ones
        while (state.currentWave < expectedWave) {
            state.currentWave++;
            this.spawnMinionWave(state);
        }

        // Check if it's time to spawn archers for any waves
        this.checkAndSpawnArchers(state);
    }

    private static checkAndSpawnArchers(state: GameState): void {
        const currentTime = state.gameTime;
        const archerDelay = GAMEPLAY_CONFIG.MINION_SPAWNING.ARCHER_SPAWN_DELAY_MS;

        // Check each wave to see if archers should be spawned
        for (let wave = 1; wave <= state.currentWave; wave++) {
            const waveKey = wave.toString();
            const warriorSpawnTime = state.warriorSpawnTimes.get(waveKey);
            const archersAlreadySpawned = state.archerSpawned.get(waveKey) || false;
            
            if (warriorSpawnTime && !archersAlreadySpawned && currentTime >= warriorSpawnTime + archerDelay) {
                // Spawn archers for this wave
                this.spawnTeamArchers(state, 'blue');
                this.spawnTeamArchers(state, 'red');
                
                // Mark that archers have been spawned for this wave
                state.archerSpawned.set(waveKey, true);
            }
        }
    }
} 
