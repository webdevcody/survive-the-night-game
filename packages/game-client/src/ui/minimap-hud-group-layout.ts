import { scaleHudValue } from "@/util/hud-scale";
import { MINIMAP_SETTINGS } from "./minimap";
import { getLoadoutStripScreenLayout } from "./loadout-strip";

/** Move the whole minimap by editing these values. Health/stamina orbs use the hotbar group. */
export const MINIMAP_HUD_GROUP = {
  /** Top margin when no wave / zombie-lives stack sits above the minimap */
  baseScreenTop: 40,
  /** Vertical gap between bottom of wave stack and top of minimap */
  gapBelowWaveStack: 16,
} as const;

/** Health (left) + stamina / sprint (right) flanking the bottom weapon strip. */
export const HOTBAR_STATUS_HUD = {
  /** Base radius for orbs (scaled with HUD scale) */
  orbRadius: 36,
  /** Horizontal gap between weapon strip edge and orb center */
  gapFromStripEdge: 14,
} as const;

export type MinimapScreenRect = { left: number; top: number; size: number };

export type OrbLayout = { cx: number; cy: number; r: number };

export type MinimapHudLayout = {
  minimap: MinimapScreenRect;
  healthOrb: OrbLayout;
  staminaOrb: OrbLayout;
};

export type GetMinimapHudLayoutOpts = {
  /** Pixel Y of the bottom edge of content above the minimap (wave + optional zombie lives), or 0 */
  waveStackBottom: number;
};

/**
 * Single layout pass: minimap top-right; health/stamina orbs to the left and right of the bottom hotbar.
 */
export function getMinimapHudLayout(
  canvasW: number,
  canvasH: number,
  opts: GetMinimapHudLayoutOpts
): MinimapHudLayout {
  const scaledSize = scaleHudValue(MINIMAP_SETTINGS.size, canvasW, canvasH);
  const scaledRight = scaleHudValue(MINIMAP_SETTINGS.right, canvasW, canvasH);
  const minimapLeft = canvasW - scaledRight - scaledSize;

  const scaledBaseTop = scaleHudValue(MINIMAP_HUD_GROUP.baseScreenTop, canvasW, canvasH);
  const scaledGapBelowWave = scaleHudValue(MINIMAP_HUD_GROUP.gapBelowWaveStack, canvasW, canvasH);
  const minimapTop =
    opts.waveStackBottom > 0
      ? opts.waveStackBottom + scaledGapBelowWave
      : scaledBaseTop;

  const strip = getLoadoutStripScreenLayout(canvasW, canvasH);
  const r = scaleHudValue(HOTBAR_STATUS_HUD.orbRadius, canvasW, canvasH);
  const edgeGap = scaleHudValue(HOTBAR_STATUS_HUD.gapFromStripEdge, canvasW, canvasH);

  const rowCy = strip.y + strip.padding + strip.slotSize / 2;
  let healthCx = strip.x - edgeGap - r;
  let staminaCx = strip.x + strip.w + edgeGap + r;

  const minCx = r + 4;
  const maxCx = canvasW - r - 4;
  healthCx = Math.max(minCx, healthCx);
  staminaCx = Math.min(maxCx, staminaCx);

  return {
    minimap: { left: minimapLeft, top: minimapTop, size: scaledSize },
    healthOrb: { cx: healthCx, cy: rowCy, r },
    staminaOrb: { cx: staminaCx, cy: rowCy, r },
  };
}
