import Phaser from 'phaser';
import { CLIENT_CONFIG } from '../../Config';
import { RewardCard } from './RewardCard';
import { HeroCombatant } from '../../shared/types/CombatantTypes';

/**
 * RewardCardManager handles the display and interaction of reward cards during respawn
 */
export class RewardCardManager {
    private scene: Phaser.Scene;
    private rewardCards: RewardCard[] = [];
    private onRewardChosen?: (rewardId: string) => void;

    constructor(scene: Phaser.Scene, onRewardChosen?: (rewardId: string) => void) {
        this.scene = scene;
        this.onRewardChosen = onRewardChosen;
    }

    updateRewards(hero: HeroCombatant): void {
        // Clear existing cards
        this.destroy();
        
        if (!hero.rewardsForChoice || hero.rewardsForChoice.length === 0) {
            return;
        }

        const cardWidth = 120;
        const cardHeight = 160;
        const cardSpacing = 20;
        const totalWidth = (cardWidth * 3) + (cardSpacing * 2);
        const startX = CLIENT_CONFIG.GAME_CANVAS_WIDTH / 2 - totalWidth / 2;
        const cardY = CLIENT_CONFIG.GAME_CANVAS_HEIGHT / 2 + 50;

        for (let i = 0; i < Math.min(3, hero.rewardsForChoice.length); i++) {
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
