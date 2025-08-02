import Phaser from 'phaser';
import { CLIENT_CONFIG } from '../../Config';
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
        return this.scene.add.graphics();
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
        indicator.setDepth(-1); // Put behind other elements
        return indicator;
    }

    /**
     * Creates the respawn ring for players
     */
    createRespawnRing(): Phaser.GameObjects.Graphics {
        const ring = this.scene.add.graphics();
        ring.setDepth(-2); // Put behind radius indicators
        return ring;
    }
} 