import { GameState } from "@/state";
import { Renderable } from "@/entities/util";
import { AssetManager, getItemAssetKey } from "@/managers/asset";
import { InventoryItem } from "@shared/util/inventory";
import { calculateHudScale } from "@/util/hud-scale";
import { Z_INDEX } from "@shared/map";
import { PlayerClient } from "@/entities/player";
import { itemMatchesLoadoutRow } from "@shared/util/weapon-loadout";
import type { CanvasUiRect } from "./canvas-ui-rect";
import { uiRectContains } from "./canvas-ui-rect";
import type { InventoryUiTab } from "./inventory-screen";
import {
  drawRpgTopAccentBar,
  fillRpgPanelGradient,
  RPG_BODY_TEXT,
  RPG_METADATA_MUTED,
  RPG_SLOT_FILL,
  RPG_SLOT_STROKE,
  RPG_TAB_ACTIVE_FILL,
  RPG_TAB_ACTIVE_STROKE,
  RPG_TAB_INACTIVE_FILL,
  RPG_TAB_INACTIVE_STROKE,
  RPG_TITLE_CREAM,
  strokeRpgPanelBorder,
} from "./rpg-hud-theme";

const STRIP = {
  marginBottom: 20,
  slotSize: 52,
  gap: 10,
  padding: 10,
  /** Space between weapon slots and the inventory toggle. */
  invToggleGap: 10,
  /** Height of the inventory-panel tab pill row (matches scaled HUD). */
  tabRowHeight: 22,
  tabRowGap: 6,
  tabPillGap: 6,
  activeBorder: "rgba(255, 234, 182, 0.95)",
};

const PANEL_TAB_PILLS: { id: InventoryUiTab; label: string }[] = [
  { id: "inventory", label: "Items (I)" },
  { id: "character", label: "Stats (C)" },
  { id: "abilities", label: "Abilities (K)" },
  { id: "professions", label: "Professions (P)" },
  { id: "quests", label: "Quests (Q)" },
];

const LABELS = ["1 Primary", "2 Secondary", "3 Melee"];

export type LoadoutStripScreenLayout = {
  scale: number;
  slotSize: number;
  gap: number;
  padding: number;
  invToggleGap: number;
  tabRowH: number;
  tabRowGap: number;
  tabPillGap: number;
  /** Top Y of the weapon / Inv slot row (below tab pills). */
  slotsY: number;
  w: number;
  h: number;
  x: number;
  y: number;
};

function getPanelTabPillRects(L: LoadoutStripScreenLayout): CanvasUiRect[] {
  const innerW = L.w - 2 * L.padding;
  const n = PANEL_TAB_PILLS.length;
  const pillW = (innerW - (n - 1) * L.tabPillGap) / n;
  const y = L.y + L.padding;
  const rects: CanvasUiRect[] = [];
  for (let i = 0; i < n; i++) {
    rects.push({
      x: L.x + L.padding + i * (pillW + L.tabPillGap),
      y,
      w: pillW,
      h: L.tabRowH,
    });
  }
  return rects;
}

function getInventoryToggleRect(L: LoadoutStripScreenLayout): CanvasUiRect {
  const slotsRight = L.x + L.padding + 3 * L.slotSize + 2 * L.gap;
  const invX = slotsRight + L.invToggleGap;
  return { x: invX, y: L.slotsY, w: L.slotSize, h: L.slotSize };
}

/** Screen-space bounds for the bottom-centered weapon strip (shared with HUD layout). */
export function getLoadoutStripScreenLayout(
  canvasWidth: number,
  canvasHeight: number
): LoadoutStripScreenLayout {
  const scale = calculateHudScale(canvasWidth, canvasHeight);
  const slotSize = STRIP.slotSize * scale;
  const gap = STRIP.gap * scale;
  const padding = STRIP.padding * scale;
  const invToggleGap = STRIP.invToggleGap * scale;
  const tabRowH = STRIP.tabRowHeight * scale;
  const tabRowGap = STRIP.tabRowGap * scale;
  const tabPillGap = STRIP.tabPillGap * scale;
  const w = 3 * slotSize + 2 * gap + padding * 2 + invToggleGap + slotSize;
  const h = padding + tabRowH + tabRowGap + slotSize + padding + 14 * scale;
  const x = canvasWidth / 2 - w / 2;
  const y = canvasHeight - h - STRIP.marginBottom * scale;
  const slotsY = y + padding + tabRowH + tabRowGap;
  return {
    scale,
    slotSize,
    gap,
    padding,
    invToggleGap,
    tabRowH,
    tabRowGap,
    tabPillGap,
    slotsY,
    w,
    h,
    x,
    y,
  };
}

export class LoadoutStrip implements Renderable {
  constructor(
    private assetManager: AssetManager,
    private getInventory: () => (InventoryItem | null)[],
    private getMyPlayer: () => PlayerClient | null,
    private onSelectLoadout: (loadout: 0 | 1 | 2) => void,
    private clearWeaponLoadoutSlot: (slot: 0 | 1 | 2) => void,
    private onToggleInventoryScreen: () => void,
    private isInventoryScreenOpen: () => boolean,
    private getInventoryActiveTab: () => InventoryUiTab,
    private onFocusInventoryTab: (tab: InventoryUiTab) => void
  ) {}

  private getLayout(canvasWidth: number, canvasHeight: number) {
    return getLoadoutStripScreenLayout(canvasWidth, canvasHeight);
  }

  private itemAtBagSlot(inv: (InventoryItem | null)[], bag1: number): InventoryItem | null {
    if (bag1 < 1 || bag1 > inv.length) return null;
    return inv[bag1 - 1] ?? null;
  }

  render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    const player = this.getMyPlayer();
    if (!player || player.isDead() || player.isZombiePlayer?.()) return;

    const { width: cw, height: ch } = ctx.canvas;
    const L = this.getLayout(cw, ch);
    const inv = this.getInventory();

    const p = (player as any).weaponLoadoutPrimary ?? 0;
    const s = (player as any).weaponLoadoutSecondary ?? 0;
    const m = (player as any).weaponLoadoutMelee ?? 0;
    const active = (player as any).activeWeaponLoadout ?? 0;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    fillRpgPanelGradient(ctx, L.x, L.y, L.w, L.h);
    drawRpgTopAccentBar(ctx, L.x, L.y, L.w, Math.max(3, Math.round(4 * L.scale)));
    strokeRpgPanelBorder(ctx, L.x, L.y, L.w, L.h, Math.max(2, Math.round(2 * L.scale)));

    const tabRects = getPanelTabPillRects(L);
    const invOpen = this.isInventoryScreenOpen();
    const activeTab = this.getInventoryActiveTab();
    for (let i = 0; i < PANEL_TAB_PILLS.length; i++) {
      const pill = PANEL_TAB_PILLS[i]!;
      const r = tabRects[i]!;
      const isActive = invOpen && activeTab === pill.id;
      ctx.fillStyle = isActive ? RPG_TAB_ACTIVE_FILL : RPG_TAB_INACTIVE_FILL;
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.strokeStyle = isActive ? RPG_TAB_ACTIVE_STROKE : RPG_TAB_INACTIVE_STROKE;
      ctx.lineWidth = isActive ? 2 * L.scale : 1 * L.scale;
      ctx.strokeRect(r.x, r.y, r.w, r.h);
      ctx.font = `bold ${10 * L.scale}px Georgia`;
      ctx.fillStyle = isActive ? RPG_TITLE_CREAM : RPG_METADATA_MUTED;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(pill.label, r.x + r.w / 2, r.y + r.h / 2);
    }

    const slots: { bag: number; loadout: 0 | 1 | 2 }[] = [
      { bag: p, loadout: 0 },
      { bag: s, loadout: 1 },
      { bag: m, loadout: 2 },
    ];

    for (let i = 0; i < 3; i++) {
      const { bag, loadout } = slots[i]!;
      const sx = L.x + L.padding + i * (L.slotSize + L.gap);
      const sy = L.slotsY;

      let item: InventoryItem | null = null;
      if (bag >= 1) {
        const it = this.itemAtBagSlot(inv, bag);
        if (it && itemMatchesLoadoutRow(it.itemType, loadout)) item = it;
      }

      const isActive = active === loadout;
      ctx.strokeStyle = isActive ? STRIP.activeBorder : RPG_SLOT_STROKE;
      ctx.lineWidth = isActive ? 3 * L.scale : 1 * L.scale;
      ctx.fillStyle = RPG_SLOT_FILL;
      ctx.fillRect(sx, sy, L.slotSize, L.slotSize);
      ctx.strokeRect(sx, sy, L.slotSize, L.slotSize);

      if (item) {
        const img = this.assetManager.get(getItemAssetKey(item));
        if (img) {
          const pad = 6 * L.scale;
          ctx.drawImage(img, sx + pad, sy + pad, L.slotSize - pad * 2, L.slotSize - pad * 2);
        }
      }

      ctx.font = `${10 * L.scale}px Arial`;
      ctx.fillStyle = RPG_METADATA_MUTED;
      ctx.textAlign = "center";
      ctx.fillText(LABELS[i]!, sx + L.slotSize / 2, L.y + L.h - 6 * L.scale);
    }

    const invRect = getInventoryToggleRect(L);
    ctx.strokeStyle = invOpen ? STRIP.activeBorder : RPG_SLOT_STROKE;
    ctx.lineWidth = invOpen ? 3 * L.scale : 1 * L.scale;
    ctx.fillStyle = RPG_SLOT_FILL;
    ctx.fillRect(invRect.x, invRect.y, invRect.w, invRect.h);
    ctx.strokeRect(invRect.x, invRect.y, invRect.w, invRect.h);
    ctx.font = `bold ${12 * L.scale}px Arial`;
    ctx.fillStyle = RPG_BODY_TEXT;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Inv", invRect.x + invRect.w / 2, invRect.y + invRect.h / 2 - 2 * L.scale);
    ctx.font = `${9 * L.scale}px Arial`;
    ctx.fillStyle = RPG_METADATA_MUTED;
    ctx.fillText("Tab", invRect.x + invRect.w / 2, L.y + L.h - 6 * L.scale);

    ctx.restore();
  }

  /**
   * Tab pills + Inv toggle — processed before the full inventory panel consumes clicks.
   */
  handleLoadoutStripPriorityClick(
    x: number,
    y: number,
    canvasWidth: number,
    canvasHeight: number,
  ): boolean {
    const player = this.getMyPlayer();
    if (!player || player.isDead() || player.isZombiePlayer?.()) return false;

    const L = this.getLayout(canvasWidth, canvasHeight);
    if (x < L.x || x > L.x + L.w || y < L.y || y > L.y + L.h) return false;

    const tabRects = getPanelTabPillRects(L);
    for (let i = 0; i < tabRects.length; i++) {
      if (uiRectContains(tabRects[i]!, x, y)) {
        this.onFocusInventoryTab(PANEL_TAB_PILLS[i]!.id);
        return true;
      }
    }

    const invRect = getInventoryToggleRect(L);
    if (uiRectContains(invRect, x, y)) {
      this.onToggleInventoryScreen();
      return true;
    }
    return false;
  }

  handleClick(
    x: number,
    y: number,
    canvasWidth: number,
    canvasHeight: number,
    clickCount: number = 1
  ): boolean {
    const player = this.getMyPlayer();
    if (!player || player.isDead()) return false;

    const L = this.getLayout(canvasWidth, canvasHeight);
    if (x < L.x || x > L.x + L.w || y < L.y || y > L.y + L.h) return false;

    const tabRects = getPanelTabPillRects(L);
    for (let i = 0; i < tabRects.length; i++) {
      if (uiRectContains(tabRects[i]!, x, y)) {
        this.onFocusInventoryTab(PANEL_TAB_PILLS[i]!.id);
        return true;
      }
    }

    const invRect = getInventoryToggleRect(L);
    if (uiRectContains(invRect, x, y)) {
      this.onToggleInventoryScreen();
      return true;
    }

    for (let i = 0; i < 3; i++) {
      const sx = L.x + L.padding + i * (L.slotSize + L.gap);
      const sy = L.slotsY;
      if (x >= sx && x <= sx + L.slotSize && y >= sy && y <= sy + L.slotSize) {
        const slot = i as 0 | 1 | 2;
        if (clickCount >= 2) {
          this.clearWeaponLoadoutSlot(slot);
        } else {
          this.onSelectLoadout(slot);
        }
        return true;
      }
    }
    return false;
  }

  getZIndex() {
    return Z_INDEX.UI + 2;
  }
}
