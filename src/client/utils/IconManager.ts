import Phaser from 'phaser';

export class IconManager {
    private static instance: IconManager;
    private icons: Map<string, string> = new Map();
    private loaded = false;

    private constructor() {}

    static getInstance(): IconManager {
        if (!IconManager.instance) {
            IconManager.instance = new IconManager();
        }
        return IconManager.instance;
    }

    async loadIconsAndTextures(scene?: Phaser.Scene): Promise<void> {
        if (this.loaded) return;

        const iconMappings = {
            // Stat icons - mapping to actual file names
            'stat:health': 'stats/health_plus',
            'stat:defense': 'stats/attack_armor_shield_sword', 
            'stat:damage': 'stats/attack_power_sword',
            'stat:attack_speed': 'stats/attack_speed_sword_lines',
            'stat:attack_range': 'stats/attack_range_bow_arrow',
            'stat:move_speed': 'stats/move_speed_boots',
            
            // Ability icons - these would need to be created
            'ability:thorndive': 'thorndive',
            'ability:pyromancer': 'pyromancer',
            'ability:hookshot': 'hookshot',
            'ability:mercenary': 'mercenary',
            'ability:sniper': 'sniper',
            
            // Ability stat upgrade icons
            'ability_stat:range': 'stats/ability_range_waves',
            
            // Direct stat names for other uses
            'health': 'stats/health_plus',
            'defense': 'stats/attack_armor_shield_sword',
            'damage': 'stats/attack_power_sword',
            'attack_speed': 'stats/attack_speed_sword_lines',
            'attack_range': 'stats/attack_range_bow_arrow',
            'move_speed': 'stats/move_speed_boots',
            'thorndive': 'thorndive',
            'pyromancer': 'pyromancer',
            'hookshot': 'hookshot',
            'mercenary': 'mercenary',
            'sniper': 'sniper'
        };

        for (const [key, iconName] of Object.entries(iconMappings)) {
            try {
                const response = await fetch(`/assets/icons/${iconName}.svg`);
                if (response.ok) {
                    const svgContent = await response.text();
                    this.icons.set(key, svgContent);
                    
                    // Pre-generate texture if scene is provided
                    if (scene) {
                        const textureKey = `icon_${key}`;
                        if (!scene.textures.exists(textureKey)) {
                            scene.textures.addBase64(textureKey, this.svgToBase64(svgContent));
                        }
                    }
                } else {
                    console.warn(`Failed to load icon: ${iconName}.svg`);
                }
            } catch (error) {
                console.warn(`Error loading icon ${iconName}.svg:`, error);
            }
        }

        this.loaded = true;
    }

    getIcon(rewardId: string): string | null {
        return this.icons.get(rewardId) || null;
    }

    createIconImage(scene: Phaser.Scene, x: number, y: number, rewardId: string, size: number = 32): Phaser.GameObjects.Image | null {
        const textureKey = `icon_${rewardId}`;
        
        if (!scene.textures.exists(textureKey)) {
            console.warn(`Texture not found for ${rewardId}, icons may not be preloaded`);
            
            // Create a "missing image" fallback
            const fallbackKey = `missing_${rewardId}`;
            if (!scene.textures.exists(fallbackKey)) {
                const graphics = scene.add.graphics();
                graphics.fillStyle(0xcccccc);
                graphics.fillRect(0, 0, size, size);
                graphics.lineStyle(2, 0x999999);
                graphics.strokeRect(0, 0, size, size);
                graphics.generateTexture(fallbackKey, size, size);
                graphics.destroy();
            }
            
            return scene.add.image(x, y, fallbackKey).setDisplaySize(size, size);
        }

        return scene.add.image(x, y, textureKey).setDisplaySize(size, size);
    }

    private svgToBase64(svgContent: string): string {
        const blob = new Blob([svgContent], { type: 'image/svg+xml' });
        return URL.createObjectURL(blob);
    }
}
