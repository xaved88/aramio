import Phaser from 'phaser';
import { HeroCombatant } from '../../shared/types/CombatantTypes';
import { CLIENT_CONFIG } from '../../ClientConfig';
import { IconManager } from '../utils/IconManager';

export class PermanentEffectsDisplay {
    private scene: Phaser.Scene;
    private hudContainer: any = null;
    private cameraManager: any = null;
    private backgrounds: Phaser.GameObjects.Graphics[] = [];
    private iconImages: Phaser.GameObjects.Image[] = [];
    private isVisible = false;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }

    setHUDContainer(container: any): void {
        this.hudContainer = container;
    }

    setCameraManager(cameraManager: any): void {
        this.cameraManager = cameraManager;
        // Ensure all existing elements are assigned to HUD camera
        this.backgrounds.forEach(background => {
            if (background && cameraManager) {
                cameraManager.assignToHUDCamera(background);
            }
        });
        this.iconImages.forEach(icon => {
            if (icon && cameraManager) {
                cameraManager.assignToHUDCamera(icon);
            }
        });
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

        // Create individual backgrounds and icons for each stat effect
        statEffects.forEach((effect, index) => {
            const statName = (effect as any).stat;
            const iconsPerRow = config.MAX_ICONS_PER_ROW;
            const row = Math.floor(index / iconsPerRow);
            const col = index % iconsPerRow;
            
            // Calculate right-aligned position (start from right, go left)
            const x = config.START_X - col * (config.ICON_SIZE + config.SPACING) - config.ICON_SIZE / 2;
            const y = config.Y + row * (config.ICON_SIZE + config.SPACING) + config.ICON_SIZE / 2;
            
            // Create individual background for this icon
            const background = this.scene.add.graphics();
            background.fillStyle(config.BACKGROUND_COLOR, config.BACKGROUND_ALPHA);
            background.fillRoundedRect(
                x - config.ICON_SIZE / 2 - config.BACKGROUND_PADDING,
                y - config.ICON_SIZE / 2 - config.BACKGROUND_PADDING,
                config.ICON_SIZE + config.BACKGROUND_PADDING * 2,
                config.ICON_SIZE + config.BACKGROUND_PADDING * 2,
                4
            );
            background.setDepth(CLIENT_CONFIG.RENDER_DEPTH.HUD);
            background.setScrollFactor(0, 0);
            if (this.hudContainer) {
                this.hudContainer.add(background);
            }
            if (this.cameraManager) {
                this.cameraManager.assignToHUDCamera(background);
            }
            this.backgrounds.push(background);
            
            // Map stat names to reward IDs
            const rewardId = this.mapStatToRewardId(statName);
            
            const iconImage = iconManager.createIconImage(this.scene, x, y, rewardId, config.ICON_SIZE);
            if (iconImage) {
                iconImage.setDepth(CLIENT_CONFIG.RENDER_DEPTH.HUD);
                iconImage.setScrollFactor(0, 0);
                if (this.hudContainer) {
                    this.hudContainer.add(iconImage);
                }
                if (this.cameraManager) {
                    this.cameraManager.assignToHUDCamera(iconImage);
                }
                this.iconImages.push(iconImage);
            }
        });

        this.isVisible = true;
    }

    clearDisplay(): void {
        this.backgrounds.forEach(background => {
            if (background) {
                background.destroy();
            }
        });
        this.backgrounds = [];
        
        this.iconImages.forEach(icon => {
            if (icon) {
                icon.destroy();
            }
        });
        this.iconImages = [];
        
        this.isVisible = false;
    }

    setVisible(visible: boolean): void {
        this.backgrounds.forEach(background => {
            if (background) {
                background.setVisible(visible);
            }
        });
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
            'bulletArmor': 'stat:bullet_armor',
            'abilityArmor': 'stat:ability_armor'
        };
        return statToRewardMap[statName] || statName;
    }
}
