/**
 * Utility for rendering radial progress indicators
 * Used for teleport progress, pickup progress, and other hold-to-complete actions
 */

export interface RadialProgressIndicatorOptions {
  /** Progress value from 0 to 1 */
  progress: number;
  /** X position of the indicator center */
  x: number;
  /** Y position of the indicator center */
  y: number;
  /** Radius of the indicator (default: 8) */
  radius?: number;
  /** Color of the progress arc (default: rgba(100, 200, 255, 0.9)) */
  progressColor?: string;
  /** Color of the border circle (default: rgba(255, 255, 255, 0.8)) */
  borderColor?: string;
  /** Width of the border (default: 1.5) */
  borderWidth?: number;
  /** Color of the inner background circle (default: rgba(0, 0, 0, 0.7)) */
  backgroundColor?: string;
  /** Starting angle in radians (default: -Math.PI / 2, which is top) */
  startAngle?: number;
}

/**
 * Render a radial progress indicator
 * @param ctx Canvas rendering context
 * @param options Configuration options
 */
export function renderRadialProgressIndicator(
  ctx: CanvasRenderingContext2D,
  options: RadialProgressIndicatorOptions
): void {
  const {
    progress,
    x,
    y,
    radius = 8,
    progressColor = "rgba(100, 200, 255, 0.9)",
    borderColor = "rgba(255, 255, 255, 0.8)",
    borderWidth = 1.5,
    backgroundColor = "rgba(0, 0, 0, 0.7)",
    startAngle = -Math.PI / 2, // Start from top
  } = options;

  if (progress <= 0) {
    return;
  }

  const endAngle = startAngle + Math.PI * 2 * progress;

  // Draw outer circle (border)
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = borderWidth;
  ctx.stroke();

  // Draw progress arc
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, radius - 1.5, startAngle, endAngle);
  ctx.closePath();
  ctx.fillStyle = progressColor;
  ctx.fill();

  // Draw inner circle (background)
  ctx.beginPath();
  ctx.arc(x, y, radius - 3, 0, Math.PI * 2);
  ctx.fillStyle = backgroundColor;
  ctx.fill();
}

