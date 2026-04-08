/**
 * Diablo-style orb: value fills from the bottom of a circle.
 */

export type LiquidResourceOrbOptions = {
  cx: number;
  cy: number;
  r: number;
  /** 0–1 portion filled from the bottom */
  fillFraction: number;
  fillColor: string;
  emptyColor: string;
  borderColor: string;
  borderWidth: number;
  label: string;
  font: string;
  labelColor?: string;
};

export function renderLiquidResourceOrb(
  ctx: CanvasRenderingContext2D,
  options: LiquidResourceOrbOptions
): void {
  const {
    cx,
    cy,
    r,
    fillFraction,
    fillColor,
    emptyColor,
    borderColor,
    borderWidth,
    label,
    font,
    labelColor = "rgba(255, 255, 255, 0.95)",
  } = options;

  ctx.save();

  const clamped = Math.max(0, Math.min(1, fillFraction));
  const innerR = Math.max(2, r - borderWidth);

  ctx.beginPath();
  ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
  ctx.fillStyle = emptyColor;
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, innerR - 0.5, 0, Math.PI * 2);
  ctx.clip();

  const fillInner = innerR - 0.5;
  const liquidH = fillInner * 2 * clamped;
  ctx.fillStyle = fillColor;
  ctx.fillRect(cx - fillInner, cy + fillInner - liquidH, fillInner * 2, liquidH);
  ctx.restore();

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = borderWidth;
  ctx.stroke();

  ctx.font = font;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = labelColor;
  ctx.shadowColor = "rgba(0, 0, 0, 0.85)";
  ctx.shadowBlur = 4;
  ctx.fillText(label, cx, cy);
  ctx.shadowBlur = 0;

  ctx.restore();
}
