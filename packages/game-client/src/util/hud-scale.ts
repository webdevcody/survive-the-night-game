/**
 * HUD scaling utility to adjust UI elements based on screen width.
 * Ensures HUD elements are readable and playable on all screen sizes, from mobile to desktop.
 * Uses width-based scaling with breakpoints for optimal sizing at different resolutions.
 */

// Reference viewport width (1920px - common desktop resolution)
const REFERENCE_WIDTH = 1920;

/**
 * Calculates a scale factor for HUD elements based on viewport width.
 * Uses responsive breakpoints to ensure good UX across all device sizes:
 * - Mobile (< 768px): Scales down but keeps minimum readable size
 * - Tablet (768-1024px): Medium scaling
 * - Desktop (> 1024px): Full size or scaled up for larger screens
 * 
 * @param canvasWidth - Canvas width
 * @param canvasHeight - Canvas height (not used but kept for API consistency)
 * @returns Scale factor optimized for the screen width
 */
export function calculateHudScale(canvasWidth: number, canvasHeight: number): number {
  const viewportWidth = window.innerWidth;
  
  // Width-based scaling with breakpoints
  if (viewportWidth < 480) {
    // Very small mobile devices - scale down but keep readable
    // At 320px width, scale to 0.4 (40% of reference)
    // At 480px width, scale to 0.5 (50% of reference)
    return 0.4 + ((viewportWidth - 320) / (480 - 320)) * 0.1;
  } else if (viewportWidth < 768) {
    // Small mobile devices - scale proportionally
    // At 480px: 0.5, at 768px: 0.65
    return 0.5 + ((viewportWidth - 480) / (768 - 480)) * 0.15;
  } else if (viewportWidth < 1024) {
    // Tablets - medium scaling
    // At 768px: 0.65, at 1024px: 0.8
    return 0.65 + ((viewportWidth - 768) / (1024 - 768)) * 0.15;
  } else if (viewportWidth < 1920) {
    // Small desktops - scale up gradually
    // At 1024px: 0.8, at 1920px: 1.0
    return 0.8 + ((viewportWidth - 1024) / (1920 - 1024)) * 0.2;
  } else {
    // Large desktops - scale up slightly for better visibility
    // At 1920px: 1.0, at 2560px: 1.2, then cap at 1.2
    const scale = 1.0 + ((viewportWidth - 1920) / (2560 - 1920)) * 0.2;
    return Math.min(1.2, scale);
  }
}

/**
 * Gets the current HUD scale based on window dimensions.
 */
export function getCurrentHudScale(): number {
  return calculateHudScale(window.innerWidth, window.innerHeight);
}

/**
 * Scales a value by the HUD scale factor.
 * @param value - The value to scale
 * @param canvasWidth - Canvas width (used to calculate scale, but actual scaling uses window dimensions)
 * @param canvasHeight - Canvas height (used to calculate scale, but actual scaling uses window dimensions)
 */
export function scaleHudValue(value: number, canvasWidth?: number, canvasHeight?: number): number {
  const scale = calculateHudScale(
    canvasWidth ?? window.innerWidth,
    canvasHeight ?? window.innerHeight
  );
  return Math.round(value * scale);
}

