import Phaser from 'phaser';
import { CLIENT_CONFIG } from '../../ClientConfig';
import { hexToColorString } from '../utils/ColorUtils';

/**
 * EntityFactory creates the appropriate graphics objects for different entity types
 */
export class EntityFactory {
    private scene: Phaser.Scene;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }

    /**
     * Creates the main graphics object for an entity
     */
    createEntityGraphics(): Phaser.GameObjects.Graphics {
        const graphics = this.scene.add.graphics();
        graphics.setDepth(0); // Default depth
        return graphics;
    }

    /**
     * Creates the text object for displaying entity information (health, etc.)
     */
    createEntityText(): Phaser.GameObjects.Text {
        const text = this.scene.add.text(0, 0, '', {
            fontSize: CLIENT_CONFIG.UI.FONTS.MEDIUM,
            color: hexToColorString(CLIENT_CONFIG.UI.COLORS.TEXT_SECONDARY)
        }).setOrigin(0.5);
        return text;
    }

    /**
     * Creates the radius indicator for showing attack ranges
     */
    createRadiusIndicator(): Phaser.GameObjects.Graphics {
        const indicator = this.scene.add.graphics();
        indicator.setDepth(CLIENT_CONFIG.RENDER_DEPTH.BACKGROUND);
        return indicator;
    }

    /**
     * Creates the respawn ring for players
     */
    createRespawnRing(): Phaser.GameObjects.Graphics {
        const ring = this.scene.add.graphics();
        ring.setDepth(CLIENT_CONFIG.RENDER_DEPTH.BACKGROUND);
        return ring;
    }

    /**
     * Creates the ability ready indicator for players
     */
    createAbilityReadyIndicator(): Phaser.GameObjects.Graphics {
        const indicator = this.scene.add.graphics();
        indicator.setDepth(CLIENT_CONFIG.RENDER_DEPTH.ABILITY_INDICATORS);
        return indicator;
    }

    /**
     * Creates a sprite for hero entities
     */
    createHeroSprite(abilityType: string = 'default'): Phaser.GameObjects.Sprite {
        const textureKey = this.getHeroTextureKey(abilityType);
        const sprite = this.scene.add.sprite(0, 0, textureKey);
        sprite.setDepth(CLIENT_CONFIG.RENDER_DEPTH.HEROES);
        sprite.setOrigin(0.5, 0.5);
        return sprite;
    }

    /**
     * Gets the appropriate texture key based on hero ability type
     */
    private getHeroTextureKey(abilityType: string): string {
        switch (abilityType) {
            case 'hookshot':
                return 'hero-hookshot';
            case 'mercenary':
                return 'hero-mercenary';
            case 'pyromancer':
                return 'hero-pyromancer';
            case 'sniper':
                return 'hero-sniper';
            case 'thorndive':
                return 'hero-thorndive';
            case 'default':
            default:
                return 'hero-base';
        }
    }

    /**
     * Creates a health bar graphics object for heroes
     */
    createHealthBar(): Phaser.GameObjects.Graphics {
        const graphics = this.scene.add.graphics();
        graphics.setDepth(CLIENT_CONFIG.RENDER_DEPTH.HEROES + 1); // Slightly above heroes
        return graphics;
    }
} 
