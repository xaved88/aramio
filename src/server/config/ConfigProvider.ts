import { GAMEPLAY_CONFIG } from '../../GameConfig';
import { TUTORIAL_CONFIG } from './TutorialConfig';
import { HIGHER_LEVEL_TESTING_CONFIG } from './HigherLevelTestingConfig';
import { DEATH_EFFECTS_TESTING_CONFIG } from './DeathEffectsTestingConfig';
import { STATIONARY_CONFIG } from './StationaryConfig';
import { STATIONARY_NORMAL_RANGE_CONFIG } from './StationaryNormalRangeConfig';
import { MERCENARY_ONLY_CONFIG } from './MercenaryOnlyConfig';
import { PRACTICE_CONFIG } from './PracticeConfig';
import { IMPROVED_BOTS_CONFIG } from './ImprovedBotsConfig';
import { PROJECTILE_SPEED_TESTING_CONFIG } from './ProjectileSpeedTestingConfig';

export type GameplayConfig = any; // Type alias for now, will be made strict later

export class ConfigProvider {
    private configs: Map<string, GameplayConfig> = new Map();

    constructor() {
        // Register available configs
        this.registerConfig('default', GAMEPLAY_CONFIG);
        this.registerConfig('tutorial', TUTORIAL_CONFIG);
        this.registerConfig('practice', PRACTICE_CONFIG);
        this.registerConfig('improved-bots', IMPROVED_BOTS_CONFIG);
        this.registerConfig('test: higher-level', HIGHER_LEVEL_TESTING_CONFIG);
        this.registerConfig('test: death-effects', DEATH_EFFECTS_TESTING_CONFIG);
        this.registerConfig('test: no-move', STATIONARY_NORMAL_RANGE_CONFIG);
        this.registerConfig('test: no-move-high-range', STATIONARY_CONFIG);
        this.registerConfig('test: mercenary-only', MERCENARY_ONLY_CONFIG);
        this.registerConfig('test: projectile-speed', PROJECTILE_SPEED_TESTING_CONFIG);
    }

    registerConfig(name: string, config: GameplayConfig): void {
        this.configs.set(name, config);
    }

    loadConfig(name: string): GameplayConfig {
        const config = this.configs.get(name);
        if (!config) {
            throw new Error(`Config '${name}' not found. Available configs: ${Array.from(this.configs.keys()).join(', ')}`);
        }
        return config;
    }

    getAvailableConfigs(): string[] {
        return Array.from(this.configs.keys());
    }
}

// Shared singleton for accessing configs across rooms
export const configProvider = new ConfigProvider();