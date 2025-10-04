import Phaser from 'phaser';
import { CLIENT_CONFIG } from '../../ClientConfig';
import { isHeroCombatant } from '../../shared/types/CombatantTypes';

export class ColorManager {
    private scene: Phaser.Scene;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }

    /**
     * Initialize the color manager
     */
    initialize(): void {
        // Color manager is ready to use
    }

    /**
     * Apply team colors to a hero sprite using tinting
     */
    applyHeroColors(sprite: Phaser.GameObjects.Sprite, combatant: any): void {
        if (!isHeroCombatant(combatant)) {
            return;
        }

        // Update hero colors based on team and health
        this.updateHeroColors(sprite, combatant);
    }

    /**
     * Update hero colors based on team, health, and other factors
     */
    updateHeroColors(sprite: Phaser.GameObjects.Sprite, combatant: any): void {
        if (!isHeroCombatant(combatant)) {
            return;
        }

        // Calculate health factor (0.0 = low health, 1.0 = full health)
        const healthPercentage = combatant.health / combatant.maxHealth;
        const healthFactor = Math.max(0.0, Math.min(1.0, healthPercentage));

        // Check if this hero is controlled by the current player
        const isControlledByPlayer = this.scene.data?.get('playerSessionId') && 
                                   combatant.controller === this.scene.data.get('playerSessionId');

        let tintColor: number;

        if (isControlledByPlayer) {
            // Use purple palette for player-controlled heroes
            if (combatant.state === 'respawning') {
                // Darker purple for respawning
                tintColor = 0x4A0080; // Dark purple
            } else {
                // Normal purple for player, with health-based brightness
                const brightness = 0.5 + (healthFactor * 0.5); // 0.5 to 1.0
                tintColor = Phaser.Display.Color.GetColor(
                    Math.floor(106 * brightness), // 106 is base purple R
                    Math.floor(13 * brightness),  // 13 is base purple G
                    Math.floor(173 * brightness)  // 173 is base purple B
                );
            }
        } else {
            // Use team colors for other heroes
            if (combatant.state === 'respawning') {
                // Darker team colors for respawning
                tintColor = combatant.team === 'blue' ? 0x000080 : 0x800000;
            } else {
                // Normal team colors with health-based brightness
                if (combatant.team === 'blue') {
                    const brightness = 0.6 + (healthFactor * 0.4); // 0.6 to 1.0
                    tintColor = Phaser.Display.Color.GetColor(
                        Math.floor(0 * brightness),     // Blue R
                        Math.floor(100 * brightness),   // Blue G
                        Math.floor(255 * brightness)    // Blue B
                    );
                } else {
                    const brightness = 0.6 + (healthFactor * 0.4); // 0.6 to 1.0
                    tintColor = Phaser.Display.Color.GetColor(
                        Math.floor(255 * brightness),   // Red R
                        Math.floor(50 * brightness),    // Red G
                        Math.floor(50 * brightness)     // Red B
                    );
                }
            }
        }

        // Apply the tint color to the sprite
        sprite.setTint(tintColor);
    }

    /**
     * Set the player session ID for determining player-controlled heroes
     */
    setPlayerSessionId(sessionId: string | null): void {
        this.scene.data.set('playerSessionId', sessionId);
    }
}
