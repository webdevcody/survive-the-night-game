import { scaleHudValue } from "@/util/hud-scale";
import { MINIMAP_SETTINGS } from "./minimap";

/** Move the whole minimap + orb cluster by editing these values. */
export const MINIMAP_HUD_GROUP = {
  /** Top margin when no wave / zombie-lives stack sits above the minimap */
  baseScreenTop: 40,
  /** Vertical gap between bottom of wave stack and top of minimap */
  gapBelowWaveStack: 16,
  /** Base radius for health/stamina orbs (scaled with HUD scale) */
  orbRadius: 36,
  /** Gap between minimap circle bottom and orb row */
  orbGapBelowMinimap: 10,
  /** Inset from minimap left/right edges to orb centers */
  orbInsetFromMinimapEdge: 6,
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
 * Single layout pass: minimap top-right + stamina/health orbs below left/right.
 * Horizontal alignment uses `MINIMAP_SETTINGS.right` and `.size`.
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

  const r = scaleHudValue(MINIMAP_HUD_GROUP.orbRadius, canvasW, canvasH);
  const orbGap = scaleHudValue(MINIMAP_HUD_GROUP.orbGapBelowMinimap, canvasW, canvasH);
  const inset = scaleHudValue(MINIMAP_HUD_GROUP.orbInsetFromMinimapEdge, canvasW, canvasH);

  const rowCy = minimapTop + scaledSize + orbGap + r;
  const healthCx = minimapLeft + inset + r;
  const staminaCx = minimapLeft + scaledSize - inset - r;

  return {
    minimap: { left: minimapLeft, top: minimapTop, size: scaledSize },
    healthOrb: { cx: healthCx, cy: rowCy, r },
    staminaOrb: { cx: staminaCx, cy: rowCy, r },
  };
}
