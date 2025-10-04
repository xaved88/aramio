import Phaser from 'phaser';
import { CombatantRenderer } from './CombatantRenderer';
import { ShapeRenderer } from './ShapeRenderer';
import { SVGRenderer } from './SVGRenderer';

export type RendererType = 'shape' | 'svg';

export class RendererFactory {
    private static renderers: Map<RendererType, CombatantRenderer> = new Map();

    static createRenderer(scene: Phaser.Scene, type: RendererType): CombatantRenderer {
        if (!this.renderers.has(type)) {
            switch (type) {
                case 'shape':
                    this.renderers.set(type, new ShapeRenderer());
                    break;
                case 'svg':
                    this.renderers.set(type, new SVGRenderer(scene));
                    break;
                default:
                    throw new Error(`Unknown renderer type: ${type}`);
            }
        }
        
        return this.renderers.get(type)!;
    }

    static getRenderer(type: RendererType): CombatantRenderer | undefined {
        return this.renderers.get(type);
    }

    static clearRenderers(): void {
        this.renderers.clear();
    }
}
