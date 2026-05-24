import Phaser from 'phaser';
import { GameState } from '../../server/schema/GameState';
import { CLIENT_CONFIG } from '../../ClientConfig';
import { convertToSharedGameState } from '../../shared/utils/StateConverter';
import { ControllerId, CombatantId } from '../../shared/types/CombatantTypes';
import { drawDashedCircle } from '../utils/DashedCircleGraphics';

const ABILITY_TYPES_WITH_RANGE_RING = new Set([
    'default',
    'hookshot',
    'mercenary',
    'pyromancer',
    'sniper',
    'thorndive',
]);

export type AbilityRangeIndicatorUpdateParams = {
    gameState: GameState;
    playerSessionId: ControllerId | null;
    pointerScreenX: number;
    pointerScreenY: number;
    screenToWorld: (screenX: number, screenY: number) => { x: number; y: number };
    getEntityGraphics: (
        entityId: CombatantId
    ) => Phaser.GameObjects.Graphics | Phaser.GameObjects.Sprite | undefined;
};

/**
 * World-space graphics for max cast range (dashed ring), readiness tint, optional pulse, and targeting preview.
 */
export class AbilityRangeIndicator {
    constructor(private readonly graphics: Phaser.GameObjects.Graphics) {}

    isVisible(): boolean {
        return this.graphics.visible;
    }

    hide(): void {
        this.graphics.setVisible(false);
    }

    update(params: AbilityRangeIndicatorUpdateParams): void {
        const { gameState, playerSessionId, pointerScreenX, pointerScreenY, screenToWorld, getEntityGraphics } =
            params;

        if (!playerSessionId) {
            this.hide();
            return;
        }

        const sharedState = convertToSharedGameState(gameState);
        let currentHero: any = null;
        for (const combatant of sharedState.combatants.values()) {
            if (combatant.type === 'hero' && combatant.controller === playerSessionId) {
                currentHero = combatant;
                break;
            }
        }

        if (
            !currentHero ||
            currentHero.state === 'respawning' ||
            !ABILITY_TYPES_WITH_RANGE_RING.has(currentHero.ability.type)
        ) {
            this.hide();
            return;
        }

        const heroGraphics = getEntityGraphics(currentHero.id);
        if (!heroGraphics) {
            this.hide();
            return;
        }

        let castRange: number;
        if (currentHero.ability.type === 'mercenary') {
            castRange = 15;
        } else {
            castRange = currentHero.ability.range;
        }

        const rangeColor = this.getRangeColor(gameState, currentHero);
        this.graphics.setPosition(heroGraphics.x, heroGraphics.y);
        this.graphics.clear();

        const ringCfg = CLIENT_CONFIG.ABILITY_RANGE_INDICATOR;
        const abilityReady = this.isAbilityReady(gameState, currentHero);
        const pulse = abilityReady
            ? Math.sin(gameState.gameTime * ringCfg.RING_ALPHA_PULSE_RADIANS_PER_MS) *
              ringCfg.RING_ALPHA_PULSE_AMPLITUDE
            : 0;
        const ringAlpha = abilityReady
            ? Math.min(1, Math.max(0.22, ringCfg.RING_ALPHA_READY_CENTER + pulse))
            : ringCfg.RING_ALPHA_COOLDOWN;

        drawDashedCircle(this.graphics, 0, 0, castRange, rangeColor, ringAlpha, ringCfg.RING_LINE_THICKNESS, 0);

        const mouseWorldPos = screenToWorld(pointerScreenX, pointerScreenY);
        const dx = mouseWorldPos.x - heroGraphics.x;
        const dy = mouseWorldPos.y - heroGraphics.y;
        const mouseDistance = Math.sqrt(dx * dx + dy * dy);

        let targetX: number;
        let targetY: number;
        if (mouseDistance <= castRange) {
            targetX = dx;
            targetY = dy;
        } else if (mouseDistance === 0) {
            targetX = 0;
            targetY = 0;
        } else {
            const directionX = dx / mouseDistance;
            const directionY = dy / mouseDistance;
            targetX = directionX * castRange;
            targetY = directionY * castRange;
        }

        this.drawTargetingVisual(currentHero, targetX, targetY, rangeColor);
        this.graphics.setVisible(true);
    }

    private isAbilityReady(gameState: GameState, hero: any): boolean {
        const currentTime = gameState.gameTime;
        const ability = hero.ability as any;
        if (ability.lastUsedTime === 0) {
            return true;
        }
        const timeSinceLastUse = currentTime - ability.lastUsedTime;
        return timeSinceLastUse >= ability.cooldown;
    }

    private getRangeColor(gameState: GameState, hero: any): number {
        if (this.isAbilityReady(gameState, hero)) {
            return CLIENT_CONFIG.UI.ABILITY_COOLDOWN.READY_COLOR;
        }
        return CLIENT_CONFIG.UI.ABILITY_COOLDOWN.COOLDOWN_COLOR;
    }

    private drawTargetingVisual(hero: any, targetX: number, targetY: number, color: number): void {
        if (hero.ability.type === 'mercenary') {
            return;
        }
        if (hero.ability.type === 'thorndive') {
            const targetingRadius = (hero.ability as any).landingRadius;
            this.drawTargetingCircle(targetX, targetY, targetingRadius, color);
        } else if (hero.ability.type === 'pyromancer') {
            const targetingRadius = (hero.ability as any).fireballRadius;
            this.drawTargetingCircle(targetX, targetY, targetingRadius, color);
        } else {
            this.drawTargetingArrow(hero, targetX, targetY, color);
        }
    }

    private drawTargetingCircle(targetX: number, targetY: number, radius: number, color: number): void {
        this.graphics.lineStyle(4, color, 0.3);
        this.graphics.strokeCircle(targetX, targetY, radius);
        this.graphics.fillStyle(color, 0.1);
        this.graphics.fillCircle(targetX, targetY, radius);
    }

    private drawTargetingArrow(_hero: any, targetX: number, targetY: number, color: number): void {
        const distance = Math.sqrt(targetX * targetX + targetY * targetY);
        if (distance === 0) return;

        const directionX = targetX / distance;
        const directionY = targetY / distance;

        const arrowLength = CLIENT_CONFIG.TARGETING_ARROW.LENGTH;
        const arrowHeadSize = CLIENT_CONFIG.TARGETING_ARROW.HEAD_SIZE;
        const lineWidth = CLIENT_CONFIG.TARGETING_ARROW.LINE_WIDTH;

        const arrowStartX = directionX * CLIENT_CONFIG.TARGETING_ARROW.START_OFFSET;
        const arrowStartY = directionY * CLIENT_CONFIG.TARGETING_ARROW.START_OFFSET;

        const arrowEndX = arrowStartX + directionX * arrowLength;
        const arrowEndY = arrowStartY + directionY * arrowLength;

        this.graphics.lineStyle(lineWidth, color, 1.0);
        this.graphics.beginPath();
        this.graphics.moveTo(arrowStartX, arrowStartY);
        this.graphics.lineTo(arrowEndX, arrowEndY);
        this.graphics.strokePath();

        const headAngle = Math.PI / 4;
        const head1X = arrowEndX - directionX * arrowHeadSize + directionY * arrowHeadSize * Math.tan(headAngle);
        const head1Y = arrowEndY - directionY * arrowHeadSize - directionX * arrowHeadSize * Math.tan(headAngle);
        const head2X = arrowEndX - directionX * arrowHeadSize - directionY * arrowHeadSize * Math.tan(headAngle);
        const head2Y = arrowEndY - directionY * arrowHeadSize + directionX * arrowHeadSize * Math.tan(headAngle);

        this.graphics.lineStyle(lineWidth, color, 1.0);
        this.graphics.beginPath();
        this.graphics.moveTo(arrowEndX, arrowEndY);
        this.graphics.lineTo(head1X, head1Y);
        this.graphics.strokePath();

        this.graphics.beginPath();
        this.graphics.moveTo(arrowEndX, arrowEndY);
        this.graphics.lineTo(head2X, head2Y);
        this.graphics.strokePath();
    }
}
