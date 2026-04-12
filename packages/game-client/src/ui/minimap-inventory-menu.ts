import type { CanvasUiRect } from "./canvas-ui-rect";
import { uiRectContains } from "./canvas-ui-rect";
import type { InventoryUiTab } from "./inventory-screen";
import {
  fillRpgPanelGradient,
  RPG_METADATA_MUTED,
  RPG_TAB_ACTIVE_STROKE,
  RPG_TAB_INACTIVE_STROKE,
} from "./rpg-hud-theme";
import { calculateHudScale } from "@/util/hud-scale";

/** Vertical inventory panel shortcuts (emoji icons); order is top → bottom. */
export const MINIMAP_INVENTORY_MENU_ENTRIES: { tab: InventoryUiTab; emoji: string }[] = [
  { tab: "inventory", emoji: "\u{1F392}" },
  { tab: "character", emoji: "\u{1F464}" },
  { tab: "abilities", emoji: "\u{2728}" },
  { tab: "professions", emoji: "\u{1F6E0}\uFE0F" },
  { tab: "quests", emoji: "\u{1F4DC}" },
];

export type MinimapInventoryMenuLayout = {
  buttonSize: number;
  gap: number;
  buttons: { tab: InventoryUiTab; emoji: string; rect: CanvasUiRect }[];
};

export function renderMinimapInventoryMenu(
  ctx: CanvasRenderingContext2D,
  layout: MinimapInventoryMenuLayout,
  opts: { panelOpen: boolean; activeTab: InventoryUiTab },
): void {
  const hudScale = calculateHudScale(ctx.canvas.width, ctx.canvas.height);
  const lineW = Math.max(2, Math.round(2 * hudScale));

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  for (const b of layout.buttons) {
    const { rect: r } = b;
    const isActive = opts.panelOpen && opts.activeTab === b.tab;
    fillRpgPanelGradient(ctx, r.x, r.y, r.w, r.h);
    ctx.fillStyle = isActive ? "rgba(255, 234, 182, 0.14)" : "rgba(6, 8, 16, 0.2)";
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeStyle = isActive ? RPG_TAB_ACTIVE_STROKE : RPG_TAB_INACTIVE_STROKE;
    ctx.lineWidth = isActive ? lineW : Math.max(1, Math.round(1 * hudScale));
    ctx.strokeRect(r.x, r.y, r.w, r.h);

    const emojiPx = Math.max(16, Math.round(0.45 * layout.buttonSize));
    ctx.font = `${emojiPx}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(b.emoji, r.x + r.w / 2, r.y + r.h / 2 + Math.round(1 * hudScale));

    ctx.font = `600 ${Math.max(8, Math.round(9 * hudScale))}px Georgia`;
    ctx.fillStyle = RPG_METADATA_MUTED;
    ctx.textBaseline = "bottom";
    const hint =
      b.tab === "inventory"
        ? "I"
        : b.tab === "character"
          ? "C"
          : b.tab === "abilities"
            ? "K"
            : b.tab === "professions"
              ? "P"
              : "Q";
    ctx.fillText(hint, r.x + r.w / 2, r.y + r.h - Math.max(2, Math.round(3 * hudScale)));
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
  }

  ctx.restore();
}

export function hitTestMinimapInventoryMenu(
  layout: MinimapInventoryMenuLayout,
  x: number,
  y: number,
): InventoryUiTab | null {
  for (const b of layout.buttons) {
    if (uiRectContains(b.rect, x, y)) return b.tab;
  }
  return null;
}
