import Phaser from 'phaser';

/**
 * Custom shader pipeline for palette swapping
 * Replaces specific "key colors" in hero PNG assets with team colors
 * while preserving other colors like black outlines
 * Each sprite gets its own instance to avoid shared uniforms
 */
export class PaletteSwapPipeline extends Phaser.Renderer.WebGL.Pipelines.SinglePipeline {
    constructor(game: Phaser.Game) {
        super({
            game,
            fragShader: `
            precision mediump float;

            uniform sampler2D uMainSampler;
            uniform vec3 uKeyColor;       // color to replace (RGB 0..1)
            uniform vec3 uReplaceColor;   // replacement color (RGB 0..1)
            uniform float uTolerance;     // how close we have to be to match colors

            varying vec2 outTexCoord;

            void main(void) {
                vec4 texColor = texture2D(uMainSampler, outTexCoord);
                
                // Calculate distance between current pixel and key color
                float distance = length(texColor.rgb - uKeyColor);
                
                // If pixel is close enough to key color, replace it
                if (distance < uTolerance) {
                    gl_FragColor = vec4(uReplaceColor, texColor.a);
                } else {
                    // Keep original color (preserves black outlines, etc.)
                    gl_FragColor = texColor;
                }
            }
            `
        });
    }

    /**
     * Set uniforms for this specific pipeline instance
     */
    setUniforms(keyColor: { r: number; g: number; b: number }, replaceColor: { r: number; g: number; b: number }, tolerance: number): void {
        this.set3f('uKeyColor', keyColor.r, keyColor.g, keyColor.b);
        this.set3f('uReplaceColor', replaceColor.r, replaceColor.g, replaceColor.b);
        this.set1f('uTolerance', tolerance);
    }
}
