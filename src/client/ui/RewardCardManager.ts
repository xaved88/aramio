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
    }

    destroy(): void {
        this.rewardCards.forEach(card => card.destroy());
        this.rewardCards = [];
    }
}
