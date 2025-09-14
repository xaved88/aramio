import { GAMEPLAY_CONFIG } from '../../GameConfig';

export type GameplayConfig = any; // Type alias for now, will be made strict later

export class ConfigProvider {
    private configs: Map<string, GameplayConfig> = new Map();

    constructor() {
        // Register default config
        this.registerConfig('default', GAMEPLAY_CONFIG);
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
