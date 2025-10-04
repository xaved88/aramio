import Phaser from 'phaser';
import { Combatant } from '../../shared/types/CombatantTypes';

export interface CombatantRenderer {
    renderCombatant(
        combatant: Combatant,
        graphics: Phaser.GameObjects.Graphics,
        primaryColor: number,
        respawnColor: number,
        healthPercentage: number,
        size: number
    ): void;
    
    renderProjectile(
        projectile: any,
        graphics: Phaser.GameObjects.Graphics,
        color: number,
        radius: number,
        state?: any
    ): void;
}
