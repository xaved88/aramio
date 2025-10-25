import Phaser from 'phaser';
import { CLIENT_CONFIG } from '../../ClientConfig';
import { hexToColorString } from '../utils/ColorUtils';
import { ColorManager } from '../shaders/ColorManager';

/**
 * EntityFactory creates the appropriate graphics objects for different entity types
 */
export class EntityFactory {
    private scene: Phaser.Scene;
    private colorManager: ColorManager;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.colorManager = new ColorManager(scene);
        this.colorManager.initialize();
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
            color: hexToColorString(0x000000)
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
     * Creates a sprite for hero entities
     */
    createHeroSprite(abilityType: string = 'default', combatant?: any): Phaser.GameObjects.Sprite {
        const textureKey = this.getHeroTextureKey(abilityType);
        const sprite = this.scene.add.sprite(0, 0, textureKey);
        sprite.setDepth(CLIENT_CONFIG.RENDER_DEPTH.HEROES);
        sprite.setOrigin(0.5, 0.5);
        
        // Apply colors if combatant data is provided
        if (combatant) {
            this.colorManager.applyHeroColors(sprite, combatant);
        }
        
        return sprite;
    }

    /**
     * Creates a shadow sprite for any entity
     */
    createShadowSprite(entitySprite: Phaser.GameObjects.Sprite, entityX: number, entityY: number, entityType?: string): Phaser.GameObjects.Sprite {
        if (!CLIENT_CONFIG.DROP_SHADOW.ENABLED) {
            return this.scene.add.sprite(0, 0, 'blank'); // Return invisible sprite if shadows disabled
        }

        // Create a shadow sprite using the same texture as the entity
        const shadowSprite = this.scene.add.sprite(0, 0, entitySprite.texture.key);
        
        // Set depth based on entity type - hero/minion shadows behind structure shadows
        if (entityType === 'cradle' || entityType === 'turret') {
            // Structure shadows
            shadowSprite.setDepth(CLIENT_CONFIG.RENDER_DEPTH.SHADOWS_STRUCTURE);
        } else {
            // Hero/minion shadows render behind structure shadows
            shadowSprite.setDepth(CLIENT_CONFIG.RENDER_DEPTH.SHADOWS_HERO_MINION);
        }
        
        shadowSprite.setOrigin(0.5, 0.5);
        
        // Apply shadow styling
        shadowSprite.setTint(CLIENT_CONFIG.DROP_SHADOW.COLOR);
        shadowSprite.setAlpha(CLIENT_CONFIG.DROP_SHADOW.ALPHA);
        
        // Set initial position with offset using the provided coordinates
        shadowSprite.setPosition(
            entityX + CLIENT_CONFIG.DROP_SHADOW.OFFSET_X,
            entityY + CLIENT_CONFIG.DROP_SHADOW.OFFSET_Y
        );
        
        // Initial scale - will be updated by EntityManager after proper scaling
        shadowSprite.setScale(1, 1);
        
        return shadowSprite;
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

    /**
     * Creates a sprite for minion entities
     */
    createMinionSprite(minionType: string, combatant?: any): Phaser.GameObjects.Sprite {
        const isBuffed = combatant?.isBuffed || false;
        const textureKey = this.getMinionTextureKey(minionType, isBuffed);
        const sprite = this.scene.add.sprite(0, 0, textureKey);
        sprite.setDepth(CLIENT_CONFIG.RENDER_DEPTH.MINIONS);
        sprite.setOrigin(0.5, 0.5);
        
        // Apply colors if combatant data is provided
        if (combatant) {
            this.colorManager.applyMinionColors(sprite, combatant);
        }
        
        return sprite;
    }

    /**
     * Gets the appropriate texture key based on minion type
     */
    private getMinionTextureKey(minionType: string, isBuffed: boolean = false): string {
        if (isBuffed) {
            switch (minionType) {
                case 'warrior':
                    return 'super-minion-warrior';
                case 'archer':
                    return 'super-minion-archer';
                default:
                    return 'super-minion-warrior';
            }
        } else {
            switch (minionType) {
                case 'warrior':
                    return 'minion-warrior';
                case 'archer':
                    return 'minion-archer';
                default:
                    return 'minion-warrior';
            }
        }
    }

    /**
     * Creates a sprite for structure entities
     */
    createStructureSprite(structureType: string, combatant?: any): Phaser.GameObjects.Sprite {
        const textureKey = this.getStructureTextureKey(structureType);
        const sprite = this.scene.add.sprite(0, 0, textureKey);
        sprite.setDepth(CLIENT_CONFIG.RENDER_DEPTH.STRUCTURES);
        sprite.setOrigin(0.5, 0.5);
        
        // Apply colors if combatant data is provided
        if (combatant) {
            this.colorManager.applyStructureColors(sprite, combatant);
        }
        
        return sprite;
    }

    /**
     * Gets the appropriate texture key based on structure type
     */
    private getStructureTextureKey(structureType: string): string {
        switch (structureType) {
            case 'cradle':
                return 'structure-cradle';
            case 'turret':
                return 'structure-turret';
            default:
                return 'structure-cradle';
        }
    }

    /**
     * Gets the color manager for external use
     */
    getColorManager(): ColorManager {
        return this.colorManager;
    }
} 
