/**
 * Shared canvas HUD helpers: one rect for both drawing and hit-testing.
 */

export type CanvasUiRect = { readonly x: number; readonly y: number; readonly w: number; readonly h: number };

export function uiRectContains(r: CanvasUiRect, px: number, py: number): boolean {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

export function uiCircleContains(cx: number, cy: number, radius: number, px: number, py: number): boolean {
  return Math.hypot(px - cx, py - cy) <= radius;
}

const TAB_BAR_H = 48;

/** Vertical gap between tab bar and panel body (inventory / character / skills). */
export const PANEL_TAB_CONTENT_GAP = 26;

/** Right-anchored +/- buttons on the character stats tab (must match handleClick). */
export function characterStatPlusMinusRects(
  rightX: number,
  rightW: number,
  rowLabelY: number,
): { minus: CanvasUiRect; plus: CanvasUiRect } {
  const btnW = 28;
  const btnH = 22;
  const y = rowLabelY - 14;
  return {
    minus: { x: rightX + rightW - 100, y, w: btnW, h: btnH },
    plus: { x: rightX + rightW - 60, y, w: btnW, h: btnH },
  };
}

/** Y position of the stat label baseline for row `index` (0-based) on the character tab. */
export function characterStatRowLabelY(contentTop: number, index: number): number {
  const firstRowY = contentTop + PANEL_TAB_CONTENT_GAP + 36;
  return firstRowY + index * 30;
}

export function panelBottomWideButtonRect(rightX: number, rightY: number, rightW: number, rightH: number): CanvasUiRect {
  const resetY = rightY + rightH - 52;
  return { x: rightX + 16, y: resetY, w: rightW - 32, h: 32 };
}

/** Skills tab node radius (must match render). */
export const SKILLS_NODE_RADIUS = 36;

export function skillsNodeCenter(
  skillsOriginX: number,
  skillsOriginY: number,
  nodeX: number,
  nodeY: number,
): { cx: number; cy: number } {
  return { cx: skillsOriginX + nodeX, cy: skillsOriginY + nodeY };
}

export function tabBarHitRect(
  tabX0: number,
  tabTop: number,
  tabW: number,
  tabBarH: number,
  tabIndex: number,
  tabCount: number,
  panelRight: number,
): CanvasUiRect {
  const x = tabX0 + tabIndex * tabW;
  const w = tabIndex === tabCount - 1 ? panelRight - x : tabW;
  return { x, y: tabTop, w, h: tabBarH };
}

export { TAB_BAR_H };

/**
 * Draw a labeled rectangular button (inventory / HUD style).
 */
export function drawCanvasUiButton(
  ctx: CanvasRenderingContext2D,
  rect: CanvasUiRect,
  label: string,
  variant: "compact" | "wide" = "compact",
): void {
  if (variant === "compact") {
    ctx.fillStyle = "rgba(50, 52, 64, 0.95)";
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.strokeStyle = "rgba(120, 125, 140, 0.8)";
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    ctx.font = "bold 14px Arial";
    ctx.fillStyle = "#ddd";
  } else {
    ctx.fillStyle = "rgba(55, 58, 72, 0.95)";
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.strokeStyle = "rgba(160, 165, 185, 0.7)";
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    ctx.font = "bold 14px Arial";
    ctx.fillStyle = "#eee";
  }
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}
