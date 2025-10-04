import { GAMEPLAY_CONFIG } from '../../GameConfig';

// Superminions Disabled Gameplay Configuration
// Theme: Similar to default but with superminions disabled and only first turret per team
export const SUPERMINIONS_DISABLED_CONFIG = JSON.parse(JSON.stringify(GAMEPLAY_CONFIG));

// Disable super minions
SUPERMINIONS_DISABLED_CONFIG.SUPER_MINIONS.ENABLED = false;

// Only keep the first turret for each team (remove turrets 2 and 3)
SUPERMINIONS_DISABLED_CONFIG.TURRET_POSITIONS.BLUE = [
    { x: 250, y: 450 }  // Blue turret - on diagonal line from bottom-left to top-right
];
SUPERMINIONS_DISABLED_CONFIG.TURRET_POSITIONS.RED = [
    { x: 450, y: 250 }  // Red turret - on diagonal line from bottom-left to top-right
];
