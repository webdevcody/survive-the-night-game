/**
 * Shared canvas UI tokens matching the dialogue panel RPG style.
 */

import { calculateHudScale } from "@/util/hud-scale";

/** Main panel vertical gradient (top → bottom). */
export const RPG_PANEL_GRADIENT_TOP = "rgba(16, 18, 31, 0.98)";
export const RPG_PANEL_GRADIENT_BOTTOM = "rgba(6, 8, 16, 0.95)";

/** Outer frame stroke (gold). */
export const RPG_BORDER_GOLD = "rgba(255, 234, 182, 0.8)";

/** Thin accent strip along top edge of panels. */
export const RPG_ACCENT_BAR = "rgba(240, 198, 108, 0.96)";

export const RPG_TITLE_CREAM = "#f8f2dc";
export const RPG_BODY_TEXT = "#f4f7ff";
export const RPG_COUNTER_GOLD = "rgba(255, 215, 132, 0.88)";
export const RPG_PROMPT_GOLD = "rgba(255, 223, 155, 0.95)";
export const RPG_PROMPT_TYPING = "rgba(165, 218, 255, 0.95)";
export const RPG_METADATA_MUTED = "rgba(140, 154, 188, 0.9)";

/** Inventory / hotbar slot interior (portrait-style). */
export const RPG_SLOT_FILL = "rgba(29, 35, 53, 0.98)";
export const RPG_SLOT_STROKE = "rgba(255, 223, 155, 0.78)";

/** Slightly lighter slot for inactive grid cells. */
export const RPG_SLOT_FILL_DIM = "rgba(22, 26, 42, 0.96)";

/** Tab / pill inactive. */
export const RPG_TAB_INACTIVE_FILL = "rgba(16, 18, 31, 0.92)";
export const RPG_TAB_ACTIVE_FILL = "rgba(40, 44, 68, 0.95)";
export const RPG_TAB_INACTIVE_STROKE = "rgba(255, 223, 155, 0.45)";
export const RPG_TAB_ACTIVE_STROKE = "rgba(255, 234, 182, 0.85)";

/** Dim fullscreen overlay behind modal panels. */
export const RPG_MODAL_SCRIM = "rgba(0, 0, 0, 0.55)";

/** Minimap / map tray under fog. */
export const RPG_MINIMAP_BACKGROUND = "rgba(10, 12, 22, 0.92)";

/** HUD corner panels (FPS, version, ping). */
export const RPG_HUD_PANEL_BG = "rgba(6, 8, 16, 0.92)";
export const RPG_HUD_PANEL_BORDER = RPG_BORDER_GOLD;

/** Orb empty well (navy). */
export const RPG_ORB_EMPTY = "rgba(12, 14, 24, 0.94)";

export function fillRpgPanelGradient(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, RPG_PANEL_GRADIENT_TOP);
  g.addColorStop(1, RPG_PANEL_GRADIENT_BOTTOM);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
}

export function strokeRpgPanelBorder(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  lineWidth: number,
): void {
  ctx.strokeStyle = RPG_BORDER_GOLD;
  ctx.lineWidth = lineWidth;
  ctx.strokeRect(x, y, w, h);
}

export function drawRpgTopAccentBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  accentHeight: number,
): void {
  ctx.fillStyle = RPG_ACCENT_BAR;
  ctx.fillRect(x, y, w, accentHeight);
}

/**
 * Full panel: gradient fill, gold border, optional top accent bar.
 */
export function drawRpgFramedPanel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  scale: number,
  options?: { accentHeight?: number },
): void {
  const accentH = options?.accentHeight ?? Math.max(3, Math.round(4 * scale));
  fillRpgPanelGradient(ctx, x, y, w, h);
  drawRpgTopAccentBar(ctx, x, y, w, accentH);
  strokeRpgPanelBorder(ctx, x, y, w, h, Math.max(2, Math.round(2 * scale)));
}

/** Border width from canvas dimensions (matches dialogue scaling). */
export function rpgPanelBorderWidth(canvasWidth: number, canvasHeight: number): number {
  const scale = calculateHudScale(canvasWidth, canvasHeight);
  return Math.max(2, Math.round(2 * scale));
}

/**
 * Flat HUD control rectangle: mute/players-online chip, chat toggle, exit button, etc.
 * Matches `Panel.drawPanelBackground` when panel settings use `RPG_HUD_PANEL_BG` and
 * `RPG_BORDER_GOLD` (see `MuteButtonPanel`, `PlayersOnlinePanel`).
 */
export function drawHudFlatPanel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  canvasWidth: number,
  canvasHeight: number,
): void {
  ctx.fillStyle = RPG_HUD_PANEL_BG;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = RPG_BORDER_GOLD;
  ctx.lineWidth = rpgPanelBorderWidth(canvasWidth, canvasHeight);
  ctx.strokeRect(x, y, w, h);
}
