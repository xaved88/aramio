import Phaser from 'phaser';
import { Combatant, COMBATANT_TYPES, isHeroCombatant, MINION_TYPES, isMinionCombatant } from '../../shared/types/CombatantTypes';
import { CLIENT_CONFIG } from '../../ClientConfig';
import { CombatantRenderer } from './CombatantRenderer';

export class ShapeRenderer implements CombatantRenderer {
    renderCombatant(
        combatant: Combatant,
        graphics: Phaser.GameObjects.Graphics,
        primaryColor: number,
        respawnColor: number,
        healthPercentage: number,
        size: number
    ): void {
        switch (combatant.type) {
            case COMBATANT_TYPES.HERO:
                this.renderHeroGraphics(graphics, primaryColor, respawnColor, healthPercentage, size);
                break;
            case COMBATANT_TYPES.CRADLE:
                this.renderCradleGraphics(graphics, primaryColor, respawnColor, healthPercentage);
                break;
            case COMBATANT_TYPES.TURRET:
                this.renderTurretGraphics(graphics, primaryColor, respawnColor, healthPercentage, combatant);
                break;
            case COMBATANT_TYPES.MINION:
                this.renderMinionGraphics(graphics, primaryColor, respawnColor, healthPercentage, combatant);
                break;
        }
    }

    renderProjectile(projectile: any, graphics: Phaser.GameObjects.Graphics, color: number, radius: number, state?: any): void {
        graphics.clear();
        
        switch (projectile.type) {
            case 'hook':
                this.renderHookProjectile(graphics, color, radius, projectile, state);
                break;
            case 'fireball':
                this.renderFireballProjectile(graphics, color, radius, projectile);
                break;
            case 'sniper':
                this.renderSniperProjectile(graphics, color, radius, projectile);
                break;
            case 'default':
            default:
                this.renderDefaultProjectile(graphics, color, radius, projectile, state);
                break;
        }
    }

    private renderHeroGraphics(graphics: Phaser.GameObjects.Graphics, primaryColor: number, respawnColor: number, healthPercentage: number, size: number): void {
        const radius = size;
        
        if (healthPercentage < 1) {
            graphics.fillStyle(respawnColor, 1);
            graphics.fillCircle(0, 0, radius);
            
            const remainingRadius = radius * Math.sqrt(healthPercentage);
            graphics.fillStyle(primaryColor, 1);
            graphics.fillCircle(0, 0, remainingRadius);
        } else {
            graphics.fillStyle(primaryColor, 1);
            graphics.fillCircle(0, 0, radius);
        }
    }

    private renderCradleGraphics(graphics: Phaser.GameObjects.Graphics, primaryColor: number, respawnColor: number, healthPercentage: number): void {
        const size = CLIENT_CONFIG.CRADLE_SIZE;
        const halfSize = size / 2;
        
        if (healthPercentage < 1) {
            graphics.fillStyle(respawnColor, 1);
            graphics.fillRect(-halfSize, -halfSize, size, size);
            
            const remainingSize = size * Math.sqrt(healthPercentage);
            const remainingHalfSize = remainingSize / 2;
            graphics.fillStyle(primaryColor, 1);
            graphics.fillRect(-remainingHalfSize, -remainingHalfSize, remainingSize, remainingSize);
        } else {
            graphics.fillStyle(primaryColor, 1);
            graphics.fillRect(-halfSize, -halfSize, size, size);
        }
    }

    private renderTurretGraphics(graphics: Phaser.GameObjects.Graphics, primaryColor: number, respawnColor: number, healthPercentage: number, combatant: Combatant): void {
        if (combatant.health > 0) {
            const width = CLIENT_CONFIG.TURRET_SIZE.width;
            const height = CLIENT_CONFIG.TURRET_SIZE.height;
            const halfWidth = width / 2;
            const halfHeight = height / 2;
            
            if (healthPercentage < 1) {
                graphics.fillStyle(respawnColor, 1);
                graphics.fillRect(-halfWidth, -halfHeight, width, height);
                
                const remainingWidth = width * Math.sqrt(healthPercentage);
                const remainingHeight = height * Math.sqrt(healthPercentage);
                const remainingHalfWidth = remainingWidth / 2;
                const remainingHalfHeight = remainingHeight / 2;
                graphics.fillStyle(primaryColor, 1);
                graphics.fillRect(-remainingHalfWidth, -remainingHalfHeight, remainingWidth, remainingHeight);
            } else {
                graphics.fillStyle(primaryColor, 1);
                graphics.fillRect(-halfWidth, -halfHeight, width, height);
            }
            
            graphics.setVisible(true);
        } else {
            graphics.setVisible(false);
        }
    }

    private renderMinionGraphics(graphics: Phaser.GameObjects.Graphics, primaryColor: number, respawnColor: number, healthPercentage: number, combatant: Combatant): void {
        if (!isMinionCombatant(combatant)) return;
        
        if (combatant.health > 0) {
            const size = CLIENT_CONFIG.MINION_SIZE;
            
            if (combatant.minionType === MINION_TYPES.WARRIOR) {
                this.renderDiamond(graphics, primaryColor, respawnColor, healthPercentage, size);
            } else if (combatant.minionType === MINION_TYPES.ARCHER) {
                this.renderTriangle(graphics, primaryColor, respawnColor, healthPercentage, size);
            }
            
            graphics.setVisible(true);
        } else {
            graphics.setVisible(false);
        }
    }

    private renderDiamond(graphics: Phaser.GameObjects.Graphics, primaryColor: number, respawnColor: number, healthPercentage: number, size: number): void {
        if (healthPercentage < 1) {
            graphics.fillStyle(respawnColor, 1);
            graphics.beginPath();
            graphics.moveTo(0, -size);
            graphics.lineTo(size, 0);
            graphics.lineTo(0, size);
            graphics.lineTo(-size, 0);
            graphics.closePath();
            graphics.fillPath();
            
            const remainingSize = size * Math.sqrt(healthPercentage);
            graphics.fillStyle(primaryColor, 1);
            graphics.beginPath();
            graphics.moveTo(0, -remainingSize);
            graphics.lineTo(remainingSize, 0);
            graphics.lineTo(0, remainingSize);
            graphics.lineTo(-remainingSize, 0);
            graphics.closePath();
            graphics.fillPath();
        } else {
            graphics.fillStyle(primaryColor, 1);
            graphics.beginPath();
            graphics.moveTo(0, -size);
            graphics.lineTo(size, 0);
            graphics.lineTo(0, size);
            graphics.lineTo(-size, 0);
            graphics.closePath();
            graphics.fillPath();
        }
    }

    private renderTriangle(graphics: Phaser.GameObjects.Graphics, primaryColor: number, respawnColor: number, healthPercentage: number, size: number): void {
        if (healthPercentage < 1) {
            graphics.fillStyle(respawnColor, 1);
            graphics.beginPath();
            graphics.moveTo(0, -size);
            graphics.lineTo(size, size);
            graphics.lineTo(-size, size);
            graphics.closePath();
            graphics.fillPath();
            
            const remainingSize = size * Math.sqrt(healthPercentage);
            graphics.fillStyle(primaryColor, 1);
            graphics.beginPath();
            graphics.moveTo(0, -remainingSize);
            graphics.lineTo(remainingSize, remainingSize);
            graphics.lineTo(-remainingSize, remainingSize);
            graphics.closePath();
            graphics.fillPath();
        } else {
            graphics.fillStyle(primaryColor, 1);
            graphics.beginPath();
            graphics.moveTo(0, -size);
            graphics.lineTo(size, size);
            graphics.lineTo(-size, size);
            graphics.closePath();
            graphics.fillPath();
        }
    }

    private renderHookProjectile(graphics: Phaser.GameObjects.Graphics, color: number, radius: number, projectile: any, state?: any): void {
        graphics.lineStyle(2, CLIENT_CONFIG.PROJECTILE.BORDER_COLOR, 1);
        graphics.strokeCircle(0, 0, radius);
        graphics.fillStyle(color, 1);
        graphics.fillCircle(0, 0, radius);
        
        const trailCount = 25;
        const trailSpacing = radius * 1.2;
        const directionX = projectile.directionX || 0;
        const directionY = projectile.directionY || 0;
        const currentGameTime = state?.gameTime || 0;
        const projectileAge = currentGameTime - (projectile.createdAt || currentGameTime);
        const ageInSeconds = projectileAge / 1000;
        const estimatedDistance = (projectile.speed || 200) * ageInSeconds;
        const maxTrailDistance = Math.max(estimatedDistance * 0.80, radius * 3);
        
        for (let i = 1; i <= trailCount; i++) {
            const trailDistance = i * trailSpacing;
            if (trailDistance > maxTrailDistance) break;
            
            const trailOffsetX = -trailDistance * directionX;
            const trailOffsetY = -trailDistance * directionY;
            const projectileSize = radius * 0.6;
            const alpha = 0.5;
            
            graphics.lineStyle(2, CLIENT_CONFIG.PROJECTILE.BORDER_COLOR, alpha);
            graphics.strokeCircle(trailOffsetX, trailOffsetY, projectileSize);
            graphics.fillStyle(color, alpha);
            graphics.fillCircle(trailOffsetX, trailOffsetY, projectileSize);
        }
    }

    private renderFireballProjectile(graphics: Phaser.GameObjects.Graphics, color: number, radius: number, projectile: any): void {
        const directionX = projectile.directionX || 0;
        const directionY = projectile.directionY || 0;
        
        graphics.lineStyle(CLIENT_CONFIG.PROJECTILE.BORDER_WIDTH, CLIENT_CONFIG.PROJECTILE.BORDER_COLOR, 1);
        graphics.strokeCircle(0, 0, radius);
        graphics.fillStyle(color, 1);
        graphics.fillCircle(0, 0, radius);
        
        const trailCount = 4;
        const trailSpacing = radius * 0.8;
        
        for (let i = 1; i <= trailCount; i++) {
            const trailDistance = i * trailSpacing;
            const trailOffsetX = -trailDistance * directionX;
            const trailOffsetY = -trailDistance * directionY;
            const trailSize = radius * (0.6 - i * 0.1);
            const alpha = 0.8 - (i * 0.15);
            
            graphics.lineStyle(1, CLIENT_CONFIG.PROJECTILE.BORDER_COLOR, alpha);
            graphics.strokeCircle(trailOffsetX, trailOffsetY, trailSize);
            graphics.fillStyle(color, alpha);
            graphics.fillCircle(trailOffsetX, trailOffsetY, trailSize);
        }
        
        graphics.lineStyle(1, 0xffffff, 0.4);
        graphics.strokeCircle(0, 0, radius * 0.6);
    }

    private renderDefaultProjectile(graphics: Phaser.GameObjects.Graphics, color: number, radius: number, projectile: any, state?: any): void {
        const directionX = projectile.directionX || 0;
        const directionY = projectile.directionY || 0;
        const angle = Math.atan2(directionY, directionX);
        
        const swordLength = radius * 2.0;
        const swordWidth = radius * 1.5;
        
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        
        const bladeTipX = swordLength * cos;
        const bladeTipY = swordLength * sin;
        const bladeBaseX = 0;
        const bladeBaseY = 0;
        
        const perpX = -sin * swordWidth / 2;
        const perpY = cos * swordWidth / 2;
        
        const bladeTopX = bladeBaseX + perpX;
        const bladeTopY = bladeBaseY + perpY;
        const bladeBottomX = bladeBaseX - perpX;
        const bladeBottomY = bladeBaseY - perpY;
        
        graphics.lineStyle(CLIENT_CONFIG.PROJECTILE.BORDER_WIDTH + 1, CLIENT_CONFIG.PROJECTILE.BORDER_COLOR, 1);
        graphics.beginPath();
        graphics.moveTo(bladeTipX, bladeTipY);
        graphics.lineTo(bladeTopX, bladeTopY);
        graphics.lineTo(bladeBottomX, bladeBottomY);
        graphics.closePath();
        graphics.strokePath();
        
        graphics.fillStyle(color, 1);
        graphics.fillPath();
    }

    private renderSniperProjectile(graphics: Phaser.GameObjects.Graphics, color: number, radius: number, projectile: any): void {
        const directionX = projectile.directionX || 0;
        const directionY = projectile.directionY || 0;
        const angle = Math.atan2(directionY, directionX);
        
        const length = radius * 2.0;
        const width = radius * 0.8;
        
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        
        const frontX = (length / 2) * cos;
        const frontY = (length / 2) * sin;
        const backX = (-length / 2) * cos;
        const backY = (-length / 2) * sin;
        const rightX = (width / 2) * (-sin);
        const rightY = (width / 2) * cos;
        const leftX = (-width / 2) * (-sin);
        const leftY = (-width / 2) * cos;
        
        graphics.lineStyle(CLIENT_CONFIG.PROJECTILE.BORDER_WIDTH, CLIENT_CONFIG.PROJECTILE.BORDER_COLOR, 1);
        graphics.beginPath();
        graphics.moveTo(frontX + rightX, frontY + rightY);
        graphics.lineTo(backX + rightX, backY + rightY);
        graphics.lineTo(backX + leftX, backY + leftY);
        graphics.lineTo(frontX + leftX, frontY + leftY);
        graphics.closePath();
        graphics.strokePath();
        
        graphics.fillStyle(color, 1);
        graphics.fillPath();
    }
}
