import Phaser from 'phaser';
import { HeroCombatant } from '../../shared/types/CombatantTypes';
import { CLIENT_CONFIG } from '../../ClientConfig';
import { TextStyleHelper } from '../utils/TextStyleHelper';
import { getCanvasWidth, getCanvasHeight } from '../utils/CanvasSize';
import { IconManager } from '../utils/IconManager';

export class PermanentEffectsDisplay {
    private scene: Phaser.Scene;
    private hudContainer: any = null;
    private cameraManager: any = null;
    private backgrounds: Phaser.GameObjects.Graphics[] = [];
    private iconImages: Phaser.GameObjects.Image[] = [];
    private tooltips: Phaser.GameObjects.Container[] = [];
    private isVisible = false;
    private lastEffectIds: string[] = []; // Track effect IDs to avoid unnecessary updates

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
        this.tooltips.forEach(tooltip => {
            if (tooltip && cameraManager) {
                cameraManager.assignToHUDCamera(tooltip);
            }
        });
    }

    updateDisplay(hero: HeroCombatant): void {
        if (!hero.permanentEffects || hero.permanentEffects.length === 0) {
            this.clearDisplay();
            return;
        }

        const config = CLIENT_CONFIG.HUD.PERMANENT_EFFECTS;
        const iconManager = IconManager.getInstance();
        
        // Filter for stat modification effects
        const statEffects = hero.permanentEffects.filter(effect => 
            effect.type === 'statmod'
        );

        if (statEffects.length === 0) {
            this.clearDisplay();
            return;
        }

        // Group effects by stat type and operator to handle stacking
        const groupedEffects = new Map<string, {
            stat: string;
            operator: string;
            totalAmount: number;
            count: number;
            effects: any[];
        }>();

        statEffects.forEach(effect => {
            const statName = (effect as any).stat;
            const operator = (effect as any).operator;
            const amount = (effect as any).amount;
            const key = `${statName}_${operator}`;
            
            if (groupedEffects.has(key)) {
                const group = groupedEffects.get(key)!;
                group.count++;
                group.effects.push(effect);
            } else {
                groupedEffects.set(key, {
                    stat: statName,
                    operator,
                    totalAmount: amount,
                    count: 1,
                    effects: [effect]
                });
            }
        });

        // Create effect IDs to check if we need to update
        const currentEffectIds = Array.from(groupedEffects.entries()).map(([key, group]) => 
            `${key}_${group.count}`
        );

        // Only recreate if effects have changed
        const effectsChanged = currentEffectIds.length !== this.lastEffectIds.length ||
            currentEffectIds.some((id, index) => id !== this.lastEffectIds[index]);

        if (!effectsChanged && this.isVisible) {
            return; // No need to update
        }

        // Clear and recreate if effects changed
        if (effectsChanged) {
            this.clearDisplay();
        }

        // Create stacked icons for each unique stat effect
        let index = 0;
        groupedEffects.forEach((group) => {
            const statName = group.stat;
            const operator = group.operator;
            const count = group.count;
            const iconsPerRow = config.MAX_ICONS_PER_ROW;
            const row = Math.floor(index / iconsPerRow);
            const col = index % iconsPerRow;
            
            // Calculate right-aligned position (start from right, go left)
            const baseX = getCanvasWidth() - 20 - col * (config.ICON_SIZE + config.SPACING) - config.ICON_SIZE / 2;
            const baseY = config.Y + row * (config.ICON_SIZE + config.SPACING) + config.ICON_SIZE / 2;
            
            // Create stacked icons with slight offsets to show stacking (going down)
            const stackOffset = 3; // Pixels to offset each stack layer
            const maxVisibleStacks = count; // Show all layers
            
            for (let stackLayer = 0; stackLayer < maxVisibleStacks; stackLayer++) {
                const x = baseX; // Keep X the same to avoid overlapping other stacks
                const y = baseY + stackLayer * stackOffset; // Stack downward
                
                // Create individual background for this stack layer
                const background = this.scene.add.graphics();
                
                // Determine styling based on stat type
                const isAbilityStat = statName.startsWith('ability:') || statName === 'abilityPower';
                const backgroundColor = isAbilityStat ? 0x4a5568 : 0x4a5568; // Light gray background for both
                const borderColor = isAbilityStat ? 0x3182ce : 0x38a169; // Darker blue for ability stats, darker green for base stats
                const borderWidth = 1
                
                background.fillStyle(backgroundColor, 1.0); // Full opacity
                background.lineStyle(borderWidth, borderColor, 1.0);
                background.fillRoundedRect(
                    x - config.ICON_SIZE / 2 - config.BACKGROUND_PADDING,
                    y - config.ICON_SIZE / 2 - config.BACKGROUND_PADDING,
                    config.ICON_SIZE + config.BACKGROUND_PADDING * 2,
                    config.ICON_SIZE + config.BACKGROUND_PADDING * 2,
                    4
                );
                background.strokeRoundedRect(
                    x - config.ICON_SIZE / 2 - config.BACKGROUND_PADDING,
                    y - config.ICON_SIZE / 2 - config.BACKGROUND_PADDING,
                    config.ICON_SIZE + config.BACKGROUND_PADDING * 2,
                    config.ICON_SIZE + config.BACKGROUND_PADDING * 2,
                    4
                );
                background.setDepth(CLIENT_CONFIG.RENDER_DEPTH.HUD + stackLayer);
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
                    iconImage.setDepth(CLIENT_CONFIG.RENDER_DEPTH.HUD + stackLayer);
                    iconImage.setScrollFactor(0, 0);
                    if (this.hudContainer) {
                        this.hudContainer.add(iconImage);
                    }
                    if (this.cameraManager) {
                        this.cameraManager.assignToHUDCamera(iconImage);
                    }
                    this.iconImages.push(iconImage);
                    
                    // Create tooltip for the top layer only (most visible)
                    if (stackLayer === maxVisibleStacks - 1) {
                        this.createTooltip(iconImage, rewardId, operator, group.totalAmount, x, y, count);
                    }
                }
            }
            
            
            index++;
        });

        // Track the current effect IDs
        this.lastEffectIds = currentEffectIds;
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
        
        this.tooltips.forEach(tooltip => {
            if (tooltip) {
                tooltip.destroy();
            }
        });
        this.tooltips = [];
        
        this.lastEffectIds = [];
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
        this.tooltips.forEach(tooltip => {
            if (tooltip) {
                tooltip.setVisible(visible);
            }
        });
        this.isVisible = visible;
    }

    destroy(): void {
        this.clearDisplay();
    }

    private mapStatToRewardId(statName: string): string {
        const statToRewardMap: Record<string, string> = {
            // Base stats
            'maxHealth': 'stat:health',
            'attackStrength': 'stat:damage',
            'attackSpeed': 'stat:attack_speed',
            'attackRadius': 'stat:attack_range',
            'moveSpeed': 'stat:move_speed',
            'bulletArmor': 'stat:bullet_armor',
            'abilityArmor': 'stat:ability_armor',
            'abilityPower': 'ability_stat:strength',
            // Ability stats
            'ability:range': 'ability_stat:range',
            'ability:cooldown': 'ability_stat:cooldown',
            'ability:duration': 'ability_stat:duration',
            'ability:speed': 'ability_stat:speed',
            'ability:mercenaryRageSpeed': 'ability_stat:mercenary_rage_speed',
            'ability:pyromancerRadius': 'ability_stat:pyromancer_radius'
        };
        return statToRewardMap[statName] || statName;
    }

    private createTooltip(iconImage: Phaser.GameObjects.Image, rewardId: string, operator: string, amount: number, x: number, y: number, count?: number): void {
        // Get reward display info
        const rewardDisplay = CLIENT_CONFIG.REWARDS.DISPLAY[rewardId as keyof typeof CLIENT_CONFIG.REWARDS.DISPLAY];
        if (!rewardDisplay) return;

        // Create tooltip container
        const tooltip = this.scene.add.container(0, 0);
        tooltip.setDepth(CLIENT_CONFIG.RENDER_DEPTH.HUD + 100); // Above everything else
        tooltip.setScrollFactor(0, 0);
        tooltip.setVisible(false);

        // Create tooltip background
        const tooltipBg = this.scene.add.graphics();
        tooltipBg.fillStyle(0x000000, 0.9);
        tooltipBg.lineStyle(1, 0xffffff, 0.8);
        
        // Calculate tooltip text and dimensions
        const title = count && count > 1 ? `${rewardDisplay.title} (×${count})` : rewardDisplay.title;
        const description = this.formatEffectDescription(rewardDisplay.description, operator, amount);
        
        // Create temporary text to measure dimensions
        const tempTitle = this.scene.add.text(0, 0, title, 
            TextStyleHelper.getStyle('BODY_MEDIUM'));
        const tempDesc = this.scene.add.text(0, 0, description, 
            TextStyleHelper.getStyleWithCustom('BODY_SMALL', {
                wordWrap: { width: 200 }
            }));
        
        const titleWidth = tempTitle.width;
        const descWidth = Math.max(tempDesc.width, 150);
        const totalWidth = Math.max(titleWidth, descWidth) + 20;
        const totalHeight = 60;
        
        // Position tooltip to the left of the icon
        const tooltipX = x - totalWidth - 10;
        const tooltipY = y - totalHeight / 2;
        
        tooltipBg.fillRoundedRect(tooltipX, tooltipY, totalWidth, totalHeight, 4);
        tooltipBg.strokeRoundedRect(tooltipX, tooltipY, totalWidth, totalHeight, 4);
        
        // Create actual tooltip text
        const titleText = this.scene.add.text(tooltipX + 10, tooltipY + 10, title, 
            TextStyleHelper.getStyle('BODY_MEDIUM'));
        
        const descText = this.scene.add.text(tooltipX + 10, tooltipY + 30, description, 
            TextStyleHelper.getStyleWithCustom('BODY_SMALL', {
                wordWrap: { width: totalWidth - 20 }
            }));
        
        // Clean up temporary text
        tempTitle.destroy();
        tempDesc.destroy();
        
        // Add elements to tooltip container
        tooltip.add([tooltipBg, titleText, descText]);
        
        // Add to HUD container and camera manager
        if (this.hudContainer) {
            this.hudContainer.add(tooltip);
        }
        if (this.cameraManager) {
            this.cameraManager.assignToHUDCamera(tooltip);
        }
        
        // Make icon interactive
        iconImage.setInteractive({ useHandCursor: false });
        
        // Show tooltip on hover
        iconImage.on('pointerover', () => {
            tooltip.setVisible(true);
        });
        
        iconImage.on('pointerout', () => {
            tooltip.setVisible(false);
        });
        
        this.tooltips.push(tooltip);
    }

    private formatEffectDescription(baseDescription: string, operator: string, amount: number): string {
        // Extract the base description without the old amount
        // e.g., "+15% max health" -> "max health"
        let cleanDescription = baseDescription;
        
        // Remove common prefixes
        cleanDescription = cleanDescription.replace(/^\+?\d+%?\s*/, '');
        cleanDescription = cleanDescription.replace(/^\+?\d+\s*/, '');
        
        // Format the new amount based on operator
        let formattedAmount: string;
        if (operator === 'percent') {
            const percentage = Math.round((amount - 1) * 100);
            formattedAmount = `${percentage > 0 ? '+' : ''}${percentage}%`;
        } else {
            formattedAmount = `+${Math.round(amount)}`;
        }
        
        return `${formattedAmount} ${cleanDescription}`;
    }
}
