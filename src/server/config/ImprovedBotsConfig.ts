import { GAMEPLAY_CONFIG } from '../../GameConfig';

// Extended config with improved bot behavior enabled
export const IMPROVED_BOTS_CONFIG = {
    ...GAMEPLAY_CONFIG,
    BOTS: {
        ...GAMEPLAY_CONFIG.BOTS,
        BOT_BEHAVIOR: 'improved'
    }
};
