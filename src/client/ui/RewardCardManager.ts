import Phaser from 'phaser';
import { CLIENT_CONFIG } from '../../ClientConfig';
import { TextStyleHelper } from '../utils/TextStyleHelper';
import { getCanvasWidth, getCanvasHeight } from '../utils/CanvasSize';
import { RewardCard } from './RewardCard';
import { HeroCombatant } from '../../shared/types/CombatantTypes';
import { BotRewardPreferences } from '../../server/game/bots/BotRewardPreferences';

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
    private animationCount: number = 0; // Track how many times animations have been shown

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

    updateRewards(hero: HeroCombatant, state?: any): void {
        // Clear existing cards
        this.destroy();
        
        if (!hero.rewardsForChoice || hero.rewardsForChoice.length === 0) {
            // Reset animation count when no rewards (player respawned)
            this.animationCount = 0;
            return;
        }

        const cardWidth = 160;
        const cardHeight = 200;
        const cardSpacing = 30;
        const numCards = Math.min(3, hero.rewardsForChoice.length);
        const totalWidth = (cardWidth * numCards) + (cardSpacing * (numCards - 1));
        const startX = getCanvasWidth() / 2 - totalWidth / 2;
        const cardY = getCanvasHeight() / 2 + 90; // Moved down further

        // Display chest name if available
        if (hero.levelRewards && hero.levelRewards.length > 0) {
            const chestType = hero.levelRewards[0];
            const chestName = this.getChestDisplayName(chestType);
            
            // Create chest name text at bottom of screen
            this.chestNameText = this.scene.add.text(
                getCanvasWidth() / 2,
                getCanvasHeight() - 20,
                chestName,
                TextStyleHelper.getSubtleHintStyle()
            );
            this.chestNameText.setOrigin(0.5);
            this.chestNameText.setDepth(CLIENT_CONFIG.RENDER_DEPTH.GAME_UI - 5);
            this.chestNameText.setScrollFactor(0, 0);
            
            // Only show on HUD camera - ignore on game camera
            if (this.cameraManager && this.cameraManager.gameCamera) {
                this.cameraManager.gameCamera.ignore(this.chestNameText);
            }
        }

        // Determine which reward should be recommended based on hero's ability
        const recommendedRewardId = this.getRecommendedReward(hero);
        
        // Get team ability counts if state is available
        const teamAbilityCounts = state ? this.getTeamAbilityCounts(hero.team, state) : {};

        // Create cards off-screen initially
        for (let i = 0; i < numCards; i++) {
            const cardX = startX + (cardWidth + cardSpacing) * i + cardWidth / 2;
            const rewardId = hero.rewardsForChoice[i];
            const rewardDisplay = CLIENT_CONFIG.REWARDS.DISPLAY[rewardId as keyof typeof CLIENT_CONFIG.REWARDS.DISPLAY];
            const isRecommended = rewardId === recommendedRewardId;
            
            // Extract ability type from reward ID and get count
            let abilityCountText = '';
            if (rewardId.startsWith('ability:')) {
                const abilityType = rewardId.substring(8);
                const count = teamAbilityCounts[abilityType] || 0;
                abilityCountText = `Team: ${count}`;
            }
            
            const card = new RewardCard(this.scene, {
                x: cardX,
                y: getCanvasHeight() + 300, // Start off-screen at bottom
                width: cardWidth,
                height: cardHeight,
                rewardId: rewardId,
                title: rewardDisplay?.title || `Reward ${i + 1}`,
                description: rewardDisplay?.description || 'Click to claim this reward',
                isRecommended: isRecommended,
                teamAbilityCount: abilityCountText,
                onClick: (rewardId: string) => {
                    if (this.onRewardChosen) {
                        this.onRewardChosen(rewardId);
                    }
                }
            });
            
            // Make cards visible immediately (they're off-screen but visible)
            card.setVisible(true);
            // Keep cards non-interactive until animation completes
            card.setInteractive(false);
            
            if (this.hudCamera) {
                card.setHUDCamera(this.hudCamera);
            }
            
            if (this.cameraManager) {
                card.setCameraManager(this.cameraManager);
            }
            
            this.rewardCards.push(card);
        }

        // Animate cards sliding up from bottom one by one
        this.slideUpCards(cardY);
    }
    
    private getTeamAbilityCounts(team: string, state: any): Record<string, number> {
        const abilityCounts: Record<string, number> = {};
        
        // Count abilities for all heroes on the same team
        if (state.combatants) {
            state.combatants.forEach((combatant: any) => {
                if (combatant.type === 'hero' && combatant.team === team && combatant.ability) {
                    const abilityType = combatant.ability.type;
                    abilityCounts[abilityType] = (abilityCounts[abilityType] || 0) + 1;
                }
            });
        }
        
        return abilityCounts;
    }

    setVisible(visible: boolean): void {
        this.rewardCards.forEach(card => {
            card.setVisible(visible);
        });
        
        if (this.chestNameText) {
            this.chestNameText.setVisible(visible);
        }
    }
    
    updateTeamAbilityCounts(hero: HeroCombatant, state?: any): void {
        if (!state || !hero.rewardsForChoice) return;
        
        const teamAbilityCounts = this.getTeamAbilityCounts(hero.team, state);
        
        // Update each card's team ability count if it's an ability reward
        this.rewardCards.forEach((card, index) => {
            if (index < hero.rewardsForChoice.length) {
                const rewardId = hero.rewardsForChoice[index];
                if (rewardId.startsWith('ability:')) {
                    const abilityType = rewardId.substring(8);
                    const count = teamAbilityCounts[abilityType] || 0;
                    const abilityCountText = `Team: ${count}`;
                    card.updateTeamAbilityCount(abilityCountText);
                }
            }
        });
    }

    destroy(): void {
        this.rewardCards.forEach(card => card.destroy());
        this.rewardCards = [];
        
        if (this.chestNameText) {
            this.chestNameText.destroy();
            this.chestNameText = null;
        }
    }

    private slideUpCards(targetY: number): void {
        // Increment animation count
        this.animationCount++;
        
        // Use faster animations after the first time
        const isFirstAnimation = this.animationCount === 1;
        const baseDelay = isFirstAnimation ? 200 : 100; // Faster stagger after first
        const baseDuration = isFirstAnimation ? 500 : 350; // Much faster animation after first
        
        // Animate cards sliding up from bottom one by one
        this.rewardCards.forEach((card, index) => {
            // Check if card still exists
            if (!card.container) {
                return;
            }
            
            const container = card.container.getContainer();
            const delay = index * baseDelay; // Staggered animation
            
            this.scene.time.delayedCall(delay, () => {
                // Check if card still exists
                if (!card.container) {
                    return;
                }
                
                // Animate the card sliding up to its position
                this.scene.tweens.add({
                    targets: container,
                    y: targetY,
                    duration: baseDuration,
                    ease: 'Back.easeOut',
                    onComplete: () => {
                        // Check if card still exists before making it interactive
                        if (card.container) {
                            // Make the card interactive after it's fully animated
                            if (index === this.rewardCards.length - 1) {
                                // Last card - make all remaining cards interactive
                                this.rewardCards.forEach(c => {
                                    if (c.container) {
                                        c.setInteractive(true);
                                    }
                                });
                            }
                        }
                    }
                });
            });
        });
    }

    /**
     * Determines which reward should be recommended based on the hero's ability type
     * Uses bot preferences to find the highest-weighted reward
     * Only recommends for heroes with 5 or fewer permanent effects (newer to reward system)
     */
    private getRecommendedReward(hero: HeroCombatant): string | null {
        if (!hero.rewardsForChoice || hero.rewardsForChoice.length === 0) {
            return null;
        }

        // Only recommend for heroes with 9 or fewer permanent effects
        // This indicates they're newer to the reward system
        if (hero.permanentEffects && hero.permanentEffects.length > 9) {
            return null;
        }

        const abilityType = hero.ability?.type || 'default';
        let bestRewardId: string | null = null;
        let highestWeight = 0;

        // Find the reward with the highest weight based on bot preferences
        // Skip ability rewards - only recommend stat and ability_stat rewards
        for (const rewardId of hero.rewardsForChoice) {
            // Skip ability rewards from recommendations
            if (rewardId.startsWith('ability:')) {
                continue;
            }
            
            // Create a mock gameplay config for weight calculation
            // BotRewardPreferences only needs REWARDS.REWARD_TYPES structure
            const mockGameplayConfig = {
                REWARDS: {
                    REWARD_TYPES: {
                        // Create a minimal REWARD_TYPES structure for weight calculation
                        [rewardId]: {
                            type: rewardId.startsWith('stat:') ? 'stat' : 
                                  rewardId.startsWith('ability_stat:') ? 'ability_stat' : 'ability'
                        }
                    }
                }
            } as any;

            const weight = BotRewardPreferences.calculateSelectionWeight(rewardId, abilityType, mockGameplayConfig);
            
            if (weight > highestWeight) {
                highestWeight = weight;
                bestRewardId = rewardId;
            }
        }

        return bestRewardId;
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
