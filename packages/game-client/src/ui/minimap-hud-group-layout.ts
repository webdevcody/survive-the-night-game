import { scaleHudValue } from "@/util/hud-scale";
import { MINIMAP_SETTINGS } from "./minimap";
import { getLoadoutStripScreenLayout } from "./loadout-strip";
import {
  MINIMAP_INVENTORY_MENU_ENTRIES,
  type MinimapInventoryMenuLayout,
} from "./minimap-inventory-menu";

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

/** Vertical emoji buttons to the right of the minimap (inventory panel tabs). */
export const MINIMAP_INVENTORY_MENU_LAYOUT = {
  baseButtonSize: 44,
  gap: 8,
  /** Space between minimap right edge and menu column */
  gapBetweenMinimapAndColumn: 10,
} as const;

export type MinimapScreenRect = { left: number; top: number; size: number };

export type OrbLayout = { cx: number; cy: number; r: number };

export type MinimapHudLayout = {
  minimap: MinimapScreenRect;
  inventoryMenu: MinimapInventoryMenuLayout;
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
  const menuBtn = scaleHudValue(MINIMAP_INVENTORY_MENU_LAYOUT.baseButtonSize, canvasW, canvasH);
  const menuGap = scaleHudValue(MINIMAP_INVENTORY_MENU_LAYOUT.gap, canvasW, canvasH);
  const menuPad = scaleHudValue(
    MINIMAP_INVENTORY_MENU_LAYOUT.gapBetweenMinimapAndColumn,
    canvasW,
    canvasH,
  );

  const marginRight = scaledRight;
  const menuRightEdge = canvasW - marginRight;
  const menuLeft = menuRightEdge - menuBtn;
  const minimapRight = menuLeft - menuPad;
  const minimapLeft = minimapRight - scaledSize;

  const scaledBaseTop = scaleHudValue(MINIMAP_HUD_GROUP.baseScreenTop, canvasW, canvasH);
  const scaledGapBelowWave = scaleHudValue(MINIMAP_HUD_GROUP.gapBelowWaveStack, canvasW, canvasH);
  const minimapTop =
    opts.waveStackBottom > 0
      ? opts.waveStackBottom + scaledGapBelowWave
      : scaledBaseTop;

  const menuColumnH =
    MINIMAP_INVENTORY_MENU_ENTRIES.length * menuBtn +
    (MINIMAP_INVENTORY_MENU_ENTRIES.length - 1) * menuGap;
  const menuTop = minimapTop + (scaledSize - menuColumnH) / 2;

  const inventoryMenu: MinimapInventoryMenuLayout = {
    buttonSize: menuBtn,
    gap: menuGap,
    buttons: MINIMAP_INVENTORY_MENU_ENTRIES.map((entry, i) => ({
      tab: entry.tab,
      emoji: entry.emoji,
      rect: {
        x: menuLeft,
        y: menuTop + i * (menuBtn + menuGap),
        w: menuBtn,
        h: menuBtn,
      },
    })),
  };

  const strip = getLoadoutStripScreenLayout(canvasW, canvasH);
  const r = scaleHudValue(HOTBAR_STATUS_HUD.orbRadius, canvasW, canvasH);
  const edgeGap = scaleHudValue(HOTBAR_STATUS_HUD.gapFromStripEdge, canvasW, canvasH);

  const rowCy = strip.slotsY + strip.slotSize / 2;
  let healthCx = strip.x - edgeGap - r;
  let staminaCx = strip.x + strip.w + edgeGap + r;

  const minCx = r + 4;
  const maxCx = canvasW - r - 4;
  healthCx = Math.max(minCx, healthCx);
  staminaCx = Math.min(maxCx, staminaCx);

  return {
    minimap: { left: minimapLeft, top: minimapTop, size: scaledSize },
    inventoryMenu,
    healthOrb: { cx: healthCx, cy: rowCy, r },
    staminaOrb: { cx: staminaCx, cy: rowCy, r },
  };
}
