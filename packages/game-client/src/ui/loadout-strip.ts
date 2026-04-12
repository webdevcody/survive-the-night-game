import { GameState } from "@/state";
import { Renderable } from "@/entities/util";
import { AssetManager, getItemAssetKey } from "@/managers/asset";
import { InventoryItem } from "@shared/util/inventory";
import { calculateHudScale } from "@/util/hud-scale";
import { Z_INDEX } from "@shared/map";
import { PlayerClient } from "@/entities/player";
import { itemMatchesLoadoutRow } from "@shared/util/weapon-loadout";
import type { CanvasUiRect } from "./canvas-ui-rect";
import {
  drawRpgTopAccentBar,
  fillRpgPanelGradient,
  RPG_METADATA_MUTED,
  RPG_SLOT_FILL,
  RPG_SLOT_STROKE,
  strokeRpgPanelBorder,
} from "./rpg-hud-theme";

const STRIP = {
  marginBottom: 20,
  slotSize: 52,
  gap: 10,
  padding: 10,
  activeBorder: "rgba(255, 234, 182, 0.95)",
};

const NUM_SLOTS = 5;
const WEAPON_SLOTS = 3;
/** Bag indices (1-based) shown in the two rightmost hotbar slots. */
const QUICK_BAG_START = 4;

const WEAPON_LABELS = ["1 Primary", "2 Secondary", "3 Melee"];

export type LoadoutStripScreenLayout = {
  scale: number;
  slotSize: number;
  gap: number;
  padding: number;
  slotsY: number;
  w: number;
  h: number;
  x: number;
  y: number;
};

function slotRect(L: LoadoutStripScreenLayout, index: number): CanvasUiRect {
  const sx = L.x + L.padding + index * (L.slotSize + L.gap);
  const sy = L.slotsY;
  return { x: sx, y: sy, w: L.slotSize, h: L.slotSize };
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
  const w = NUM_SLOTS * slotSize + (NUM_SLOTS - 1) * gap + padding * 2;
  const h = padding + slotSize + padding + 14 * scale;
  const x = canvasWidth / 2 - w / 2;
  const y = canvasHeight - h - STRIP.marginBottom * scale;
  const slotsY = y + padding;
  return {
    scale,
    slotSize,
    gap,
    padding,
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
    private getCurrentInventorySlot: () => number,
    private onSelectBagSlot: (bagIndex1Based: number) => void
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
    const curInvSlot = this.getCurrentInventorySlot();

    const p = (player as any).weaponLoadoutPrimary ?? 0;
    const s = (player as any).weaponLoadoutSecondary ?? 0;
    const m = (player as any).weaponLoadoutMelee ?? 0;
    const active = (player as any).activeWeaponLoadout ?? 0;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    fillRpgPanelGradient(ctx, L.x, L.y, L.w, L.h);
    drawRpgTopAccentBar(ctx, L.x, L.y, L.w, Math.max(3, Math.round(4 * L.scale)));
    strokeRpgPanelBorder(ctx, L.x, L.y, L.w, L.h, Math.max(2, Math.round(2 * L.scale)));

    const weaponSlots: { bag: number; loadout: 0 | 1 | 2 }[] = [
      { bag: p, loadout: 0 },
      { bag: s, loadout: 1 },
      { bag: m, loadout: 2 },
    ];

    for (let i = 0; i < NUM_SLOTS; i++) {
      const r = slotRect(L, i);
      if (i < WEAPON_SLOTS) {
        const { bag, loadout } = weaponSlots[i]!;
        let item: InventoryItem | null = null;
        if (bag >= 1) {
          const it = this.itemAtBagSlot(inv, bag);
          if (it && itemMatchesLoadoutRow(it.itemType, loadout)) item = it;
        }

        const isActive = active === loadout;
        ctx.strokeStyle = isActive ? STRIP.activeBorder : RPG_SLOT_STROKE;
        ctx.lineWidth = isActive ? 3 * L.scale : 1 * L.scale;
        ctx.fillStyle = RPG_SLOT_FILL;
        ctx.fillRect(r.x, r.y, r.w, r.h);
        ctx.strokeRect(r.x, r.y, r.w, r.h);

        if (item) {
          const img = this.assetManager.get(getItemAssetKey(item));
          if (img) {
            const pad = 6 * L.scale;
            ctx.drawImage(img, r.x + pad, r.y + pad, r.w - pad * 2, r.h - pad * 2);
          }
        }

        ctx.font = `${10 * L.scale}px Arial`;
        ctx.fillStyle = RPG_METADATA_MUTED;
        ctx.textAlign = "center";
        ctx.fillText(WEAPON_LABELS[i]!, r.x + r.w / 2, L.y + L.h - 6 * L.scale);
      } else {
        const bag = QUICK_BAG_START + (i - WEAPON_SLOTS);
        const item = this.itemAtBagSlot(inv, bag);
        const isInvActive = curInvSlot === bag;
        ctx.strokeStyle = isInvActive ? STRIP.activeBorder : RPG_SLOT_STROKE;
        ctx.lineWidth = isInvActive ? 3 * L.scale : 1 * L.scale;
        ctx.fillStyle = RPG_SLOT_FILL;
        ctx.fillRect(r.x, r.y, r.w, r.h);
        ctx.strokeRect(r.x, r.y, r.w, r.h);

        if (item) {
          const img = this.assetManager.get(getItemAssetKey(item));
          if (img) {
            const pad = 6 * L.scale;
            ctx.drawImage(img, r.x + pad, r.y + pad, r.w - pad * 2, r.h - pad * 2);
          }
        }

        ctx.font = `${10 * L.scale}px Arial`;
        ctx.fillStyle = RPG_METADATA_MUTED;
        ctx.textAlign = "center";
        ctx.fillText(`${bag}`, r.x + r.w / 2, L.y + L.h - 6 * L.scale);
      }
    }

    ctx.restore();
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

    for (let i = 0; i < NUM_SLOTS; i++) {
      const r = slotRect(L, i);
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
        if (i < WEAPON_SLOTS) {
          const slot = i as 0 | 1 | 2;
          if (clickCount >= 2) {
            this.clearWeaponLoadoutSlot(slot);
          } else {
            this.onSelectLoadout(slot);
          }
        } else {
          const bag = QUICK_BAG_START + (i - WEAPON_SLOTS);
          this.onSelectBagSlot(bag);
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
