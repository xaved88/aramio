import { GAMEPLAY_CONFIG } from '../../GameConfig';

// Mercenary-Only Gameplay Configuration
// Theme: All heroes spawn as mercenaries with a different level 3 reward
export const MERCENARY_ONLY_CONFIG = JSON.parse(JSON.stringify(GAMEPLAY_CONFIG));

// All heroes spawn as mercenaries
MERCENARY_ONLY_CONFIG.BOTS.ABILITY_TYPES = ['mercenary'];

// Change level 3 chest from ability_chest to mainly_normal_stats
MERCENARY_ONLY_CONFIG.REWARDS.LEVEL_CHESTS[3] = "mainly_normal_stats";
