import Phaser from 'phaser';
import { Combatant, COMBATANT_TYPES, isHeroCombatant, MINION_TYPES, isMinionCombatant } from '../../shared/types/CombatantTypes';
import { CLIENT_CONFIG } from '../../ClientConfig';
import { CombatantRenderer } from './CombatantRenderer';
import { ShapeRenderer } from './ShapeRenderer';

export class SVGRenderer implements CombatantRenderer {
    private scene: Phaser.Scene;
    private shapeRenderer: ShapeRenderer;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.shapeRenderer = new ShapeRenderer();
    }

    renderCombatant(
        combatant: Combatant,
        graphics: Phaser.GameObjects.Graphics,
        primaryColor: number,
        respawnColor: number,
        healthPercentage: number,
        size: number
    ): void {
        if (combatant.type === COMBATANT_TYPES.HERO) {
            this.renderHeroSVG(graphics, primaryColor, respawnColor, healthPercentage, size);
        } else {
            // Fallback to shape renderer for unsupported types
            this.shapeRenderer.renderCombatant(combatant, graphics, primaryColor, respawnColor, healthPercentage, size);
        }
    }

    renderProjectile(projectile: any, graphics: Phaser.GameObjects.Graphics, color: number, radius: number, state?: any): void {
        // For now, projectiles still use shape rendering
        this.shapeRenderer.renderProjectile(projectile, graphics, color, radius, state);
    }

    private renderHeroSVG(graphics: Phaser.GameObjects.Graphics, primaryColor: number, respawnColor: number, healthPercentage: number, size: number): void {
        graphics.clear();
        
        // For now, render as a simple circle with SVG-style border
        // This will be replaced with actual PNG sprite rendering later
        const radius = size;
        
        // Draw the hero as a simple circle (placeholder for PNG sprite)
        graphics.fillStyle(primaryColor, 1);
        graphics.fillCircle(0, 0, radius);
        
        // Add border to mimic SVG stroke
        graphics.lineStyle(2, 0x000000, 1);
        graphics.strokeCircle(0, 0, radius);
        
        // Render health bar underneath the hero
        this.renderHealthBar(graphics, primaryColor, respawnColor, healthPercentage, size);
    }

    private renderHealthBar(graphics: Phaser.GameObjects.Graphics, primaryColor: number, respawnColor: number, healthPercentage: number, heroSize: number): void {
        // Health bar dimensions
        const barWidth = heroSize * 1.5; // Slightly wider than the hero
        const barHeight = 4; // Thin bar
        const barY = heroSize + 8; // Position below the hero
        
        // Draw background bar (total health) - lighter color
        graphics.fillStyle(respawnColor, 0.6);
        graphics.fillRect(-barWidth / 2, barY, barWidth, barHeight);
        
        // Draw current health bar - darker color
        const currentHealthWidth = barWidth * healthPercentage;
        graphics.fillStyle(primaryColor, 1);
        graphics.fillRect(-barWidth / 2, barY, currentHealthWidth, barHeight);
        
        // Add border to health bar
        graphics.lineStyle(1, 0x000000, 0.8);
        graphics.strokeRect(-barWidth / 2, barY, barWidth, barHeight);
    }
}
