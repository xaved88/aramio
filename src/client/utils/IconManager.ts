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
            // Ability icons (PNG - preloaded in GameScene)
            'ability:default': 'ability_default',
            'ability:thorndive': 'thorndive',
            'ability:pyromancer': 'pyromancer',
            'ability:hookshot': 'hookshot',
            'ability:mercenary': 'mercenary',
            'ability:sniper': 'sniper'
        };

        for (const [key, iconName] of Object.entries(iconMappings)) {
            // Check if texture is already preloaded in scene
            if (scene && scene.textures.exists(`icon_${key}`)) {
                // Texture is already loaded as PNG, just mark it as available
                this.icons.set(key, `preloaded:${key}`);
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
            console.warn(`Texture not found for ${rewardId}, creating fallback`);
            
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
            
            return this.createImageWithAspectRatio(scene, x, y, fallbackKey, size);
        }

        return this.createImageWithAspectRatio(scene, x, y, textureKey, size);
    }

    private createImageWithAspectRatio(scene: Phaser.Scene, x: number, y: number, textureKey: string, maxSize: number): Phaser.GameObjects.Image {
        const image = scene.add.image(x, y, textureKey);
        
        // Get the original texture dimensions
        const texture = scene.textures.get(textureKey);
        const originalWidth = texture.source[0].width;
        const originalHeight = texture.source[0].height;
        
        // Calculate the scale to fit within maxSize while maintaining aspect ratio
        const scaleX = maxSize / originalWidth;
        const scaleY = maxSize / originalHeight;
        const scale = Math.min(scaleX, scaleY); // Use the smaller scale to ensure it fits
        
        // Set the display size maintaining aspect ratio
        image.setDisplaySize(originalWidth * scale, originalHeight * scale);
        
        return image;
    }


}
