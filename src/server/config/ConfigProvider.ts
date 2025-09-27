import { GAMEPLAY_CONFIG } from '../../GameConfig';
import { GLASS_CANNON_CONFIG } from './GlassCannonConfig';
import { QUICK_WIN_CONFIG } from './QuickWinConfig';
import { HIGHER_LEVEL_TESTING_CONFIG } from './HigherLevelTestingConfig';

export type GameplayConfig = any; // Type alias for now, will be made strict later

export class ConfigProvider {
    private configs: Map<string, GameplayConfig> = new Map();

    constructor() {
        // Register available configs
        this.registerConfig('default', GAMEPLAY_CONFIG);
        this.registerConfig('glass-cannon', GLASS_CANNON_CONFIG);
        this.registerConfig('quick-win', QUICK_WIN_CONFIG);
        this.registerConfig('higher-level-testing', HIGHER_LEVEL_TESTING_CONFIG);
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