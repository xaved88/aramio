import Phaser from 'phaser';
import { HeroCombatant } from '../../shared/types/CombatantTypes';
import { CLIENT_CONFIG } from '../../ClientConfig';
import { IconManager } from '../utils/IconManager';

export class StatProgressionDisplay {
    private scene: Phaser.Scene;
    private hudContainer: any = null;
    private background: Phaser.GameObjects.Graphics | null = null;
    private iconImages: Phaser.GameObjects.Image[] = [];
    private isVisible = false;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }

    setHUDContainer(container: any): void {
        this.hudContainer = container;
    }

    updateDisplay(hero: HeroCombatant): void {
        this.clearDisplay();
        
        if (!hero.permanentEffects || hero.permanentEffects.length === 0) {
            return;
        }

        const config = CLIENT_CONFIG.HUD.PERMANENT_EFFECTS;
        const iconManager = IconManager.getInstance();
        
        // Filter for stat modification effects
        const statEffects = hero.permanentEffects.filter(effect => 
            effect.type === 'statmod'
        );

        if (statEffects.length === 0) {
            return;
        }

        // Calculate background size
        const iconsPerRow = config.MAX_ICONS_PER_ROW;
        const rows = Math.ceil(statEffects.length / iconsPerRow);
        const totalWidth = Math.min(statEffects.length, iconsPerRow) * (config.ICON_SIZE + config.SPACING) - config.SPACING;
        const totalHeight = rows * (config.ICON_SIZE + config.SPACING) - config.SPACING;
        
        // Create background
        this.background = this.scene.add.graphics();
        this.background.fillStyle(config.BACKGROUND_COLOR, config.BACKGROUND_ALPHA);
        this.background.fillRoundedRect(
            config.X - config.BACKGROUND_PADDING,
            config.Y - config.BACKGROUND_PADDING,
            totalWidth + config.BACKGROUND_PADDING * 2,
            totalHeight + config.BACKGROUND_PADDING * 2,
            4
        );
        this.background.setDepth(CLIENT_CONFIG.RENDER_DEPTH.HUD);
        this.background.setScrollFactor(0, 0);
        if (this.hudContainer) {
            this.hudContainer.add(this.background);
        }

        // Create icons for each stat effect
        statEffects.forEach((effect, index) => {
            const statName = (effect as any).stat;
            const row = Math.floor(index / iconsPerRow);
            const col = index % iconsPerRow;
            
            const x = config.X + col * (config.ICON_SIZE + config.SPACING) + config.ICON_SIZE / 2;
            const y = config.Y + row * (config.ICON_SIZE + config.SPACING) + config.ICON_SIZE / 2;
            
            // Map stat names to reward IDs
            const rewardId = this.mapStatToRewardId(statName);
            
            const iconImage = iconManager.createIconImage(this.scene, x, y, rewardId, config.ICON_SIZE);
            if (iconImage) {
                iconImage.setDepth(CLIENT_CONFIG.RENDER_DEPTH.HUD);
                iconImage.setScrollFactor(0, 0);
                if (this.hudContainer) {
                    this.hudContainer.add(iconImage);
                }
                this.iconImages.push(iconImage);
            }
        });

        this.isVisible = true;
    }

    clearDisplay(): void {
        if (this.background) {
            this.background.destroy();
            this.background = null;
        }
        
        this.iconImages.forEach(icon => {
            if (icon) {
                icon.destroy();
            }
        });
        this.iconImages = [];
        
        this.isVisible = false;
    }

    setVisible(visible: boolean): void {
        if (this.background) {
            this.background.setVisible(visible);
        }
        this.iconImages.forEach(icon => {
            if (icon) {
                icon.setVisible(visible);
            }
        });
        this.isVisible = visible;
    }

    destroy(): void {
        this.clearDisplay();
    }

    private mapStatToRewardId(statName: string): string {
        const statToRewardMap: Record<string, string> = {
            'maxHealth': 'stat:health',
            'attackStrength': 'stat:damage',
            'attackSpeed': 'stat:attack_speed',
            'attackRadius': 'stat:attack_range',
            'moveSpeed': 'stat:move_speed',
            'bulletArmor': 'stat:defense',
            'abilityArmor': 'stat:defense'
        };
        return statToRewardMap[statName] || statName;
    }
}
