import Phaser from 'phaser';
import { CLIENT_CONFIG } from '../../ClientConfig';
import { RewardCard } from './RewardCard';
import { HeroCombatant } from '../../shared/types/CombatantTypes';

/**
 * RewardCardManager handles the display and interaction of reward cards during respawn
 */
export class RewardCardManager {
    private scene: Phaser.Scene;
    private hudCamera: Phaser.Cameras.Scene2D.Camera | null = null;
    private cameraManager: any = null;
    private rewardCards: RewardCard[] = [];
    private chestNameText: Phaser.GameObjects.Text | null = null;
    private onRewardChosen?: (rewardId: string) => void;

    constructor(scene: Phaser.Scene, onRewardChosen?: (rewardId: string) => void) {
        this.scene = scene;
        this.onRewardChosen = onRewardChosen;
    }

    setHUDCamera(hudCamera: Phaser.Cameras.Scene2D.Camera): void {
        this.hudCamera = hudCamera;
    }

    setCameraManager(cameraManager: any): void {
        this.cameraManager = cameraManager;
    }

    updateRewards(hero: HeroCombatant): void {
        // Clear existing cards
        this.destroy();
        
        if (!hero.rewardsForChoice || hero.rewardsForChoice.length === 0) {
            return;
        }

        const cardWidth = 160;
        const cardHeight = 200;
        const cardSpacing = 30;
        const numCards = Math.min(3, hero.rewardsForChoice.length);
        const totalWidth = (cardWidth * numCards) + (cardSpacing * (numCards - 1));
        const startX = CLIENT_CONFIG.GAME_CANVAS_WIDTH / 2 - totalWidth / 2;
        const cardY = CLIENT_CONFIG.GAME_CANVAS_HEIGHT / 2 + 40;

        // Display chest name if available
        if (hero.levelRewards && hero.levelRewards.length > 0) {
            const chestType = hero.levelRewards[0];
            const chestName = this.getChestDisplayName(chestType);
            
            // Create chest name text at bottom of screen
            this.chestNameText = this.scene.add.text(
                CLIENT_CONFIG.GAME_CANVAS_WIDTH / 2,
                CLIENT_CONFIG.GAME_CANVAS_HEIGHT - 20,
                chestName,
                {
                    fontSize: '14px',
                    color: '#888888',
                    fontStyle: 'normal',
                    align: 'center',
                    stroke: '#000000',
                    strokeThickness: 1
                }
            );
            this.chestNameText.setOrigin(0.5);
            this.chestNameText.setDepth(CLIENT_CONFIG.RENDER_DEPTH.GAME_UI - 5);
            this.chestNameText.setScrollFactor(0, 0);
            
            // Only show on HUD camera - ignore on game camera
            if (this.cameraManager && this.cameraManager.gameCamera) {
                this.cameraManager.gameCamera.ignore(this.chestNameText);
            }
        }

        for (let i = 0; i < numCards; i++) {
            const cardX = startX + (cardWidth + cardSpacing) * i + cardWidth / 2;
            const rewardId = hero.rewardsForChoice[i];
            const rewardDisplay = CLIENT_CONFIG.REWARDS.DISPLAY[rewardId as keyof typeof CLIENT_CONFIG.REWARDS.DISPLAY];
            
            const card = new RewardCard(this.scene, {
                x: cardX,
                y: cardY,
                width: cardWidth,
                height: cardHeight,
                rewardId: rewardId,
                title: rewardDisplay?.title || `Reward ${i + 1}`,
                description: rewardDisplay?.description || 'Click to claim this reward',
                onClick: (rewardId: string) => {
                    if (this.onRewardChosen) {
                        this.onRewardChosen(rewardId);
                    }
                }
            });
            
            if (this.hudCamera) {
                card.setHUDCamera(this.hudCamera);
            }
            
            if (this.cameraManager) {
                card.setCameraManager(this.cameraManager);
            }
            
            this.rewardCards.push(card);
        }
    }

    setVisible(visible: boolean): void {
        this.rewardCards.forEach(card => {
            card.setVisible(visible);
            card.setInteractive(visible);
        });
        
        if (this.chestNameText) {
            this.chestNameText.setVisible(visible);
        }
    }

    destroy(): void {
        this.rewardCards.forEach(card => card.destroy());
        this.rewardCards = [];
        
        if (this.chestNameText) {
            this.chestNameText.destroy();
            this.chestNameText = null;
        }
    }

    private getChestDisplayName(chestType: string): string {
        const chestNames: { [key: string]: string } = {
            'common': 'Base Stats Chest',
            'ability_chest': 'Ability Chest',
            'ability_stats': 'Ability Stats Chest',
            'mainly_ability_stats': 'Mainly Ability Stats Chest',
            'mainly_normal_stats': 'Mainly Base Stats Chest'
        };
        
        return chestNames[chestType] || 'Reward Chest';
    }
}
