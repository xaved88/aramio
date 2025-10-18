import { CLIENT_CONFIG } from '../../ClientConfig';

// Cache for canvas size to avoid recalculating
let cachedCanvasSize: { width: number; height: number } | null = null;

/**
 * Calculate optimal canvas size based on screen dimensions
 * This is safe to call in any environment (browser or Node.js)
 */
const calculateOptimalSize = (): { width: number; height: number } => {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
        // Default size for testing/Node.js environment
        return { 
            width: CLIENT_CONFIG.CAMERA.CANVAS_SIZE.MIN_SIZE, 
            height: CLIENT_CONFIG.CAMERA.CANVAS_SIZE.MIN_SIZE 
        };
    }
    
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    
    // Scale to fit screen height (keeping square)
    const maxSize = Math.min(screenWidth, screenHeight);
    const size = Math.max(CLIENT_CONFIG.CAMERA.CANVAS_SIZE.MIN_SIZE, Math.min(CLIENT_CONFIG.CAMERA.CANVAS_SIZE.MAX_SIZE, maxSize));
    
    return { width: size, height: size };
};

/**
 * Get the current canvas width
 * Calculates on first call, then caches the result
 */
export const getCanvasWidth = (): number => {
    if (!cachedCanvasSize) {
        cachedCanvasSize = calculateOptimalSize();
    }
    return cachedCanvasSize.width;
};

/**
 * Get the current canvas height
 * Calculates on first call, then caches the result
 */
export const getCanvasHeight = (): number => {
    if (!cachedCanvasSize) {
        cachedCanvasSize = calculateOptimalSize();
    }
    return cachedCanvasSize.height;
};

/**
 * Get the current canvas size
 * Calculates on first call, then caches the result
 */
export const getCanvasSize = (): { width: number; height: number } => {
    if (!cachedCanvasSize) {
        cachedCanvasSize = calculateOptimalSize();
    }
    return { ...cachedCanvasSize };
};

/**
 * Calculate dynamic zoom based on canvas size
 * Scales from MIN_ZOOM (350px canvas) to MAX_ZOOM (1400px canvas)
 * @returns Calculated zoom value
 */
export const getDynamicZoom = (): number => {
    const canvasSize = getCanvasWidth(); // Assuming square canvas
    
    // Get zoom range from config
    const minSize = CLIENT_CONFIG.CAMERA.CANVAS_SIZE.MIN_SIZE;
    const maxSize = CLIENT_CONFIG.CAMERA.CANVAS_SIZE.MAX_SIZE;
    const minZoom = CLIENT_CONFIG.CAMERA.DYNAMIC_ZOOM.MIN_ZOOM;
    const maxZoom = CLIENT_CONFIG.CAMERA.DYNAMIC_ZOOM.MAX_ZOOM;
    
    // Clamp canvas size to our range
    const clampedSize = Math.max(minSize, Math.min(maxSize, canvasSize));
    
    // Calculate zoom using linear interpolation
    const t = (clampedSize - minSize) / (maxSize - minSize);
    return minZoom + t * (maxZoom - minZoom);
};
