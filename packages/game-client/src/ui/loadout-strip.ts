import { GameState } from "@/state";
import { Renderable } from "@/entities/util";
import { AssetManager, getItemAssetKey } from "@/managers/asset";
import { InventoryItem } from "@shared/util/inventory";
import { calculateHudScale } from "@/util/hud-scale";
import { Z_INDEX } from "@shared/map";
import { PlayerClient } from "@/entities/player";
import { itemMatchesLoadoutRow } from "@shared/util/weapon-loadout";

const STRIP = {
  marginBottom: 20,
  slotSize: 52,
  gap: 10,
  padding: 10,
  bg: "rgba(0, 0, 0, 0.75)",
  border: "rgba(255, 255, 255, 0.45)",
  activeBorder: "rgba(255, 220, 100, 0.95)",
};

const LABELS = ["1 Primary", "2 Secondary", "3 Melee"];

export type LoadoutStripScreenLayout = {
  scale: number;
  slotSize: number;
  gap: number;
  padding: number;
  w: number;
  h: number;
  x: number;
  y: number;
};

/** Screen-space bounds for the bottom-centered weapon strip (shared with HUD layout). */
export function getLoadoutStripScreenLayout(
  canvasWidth: number,
  canvasHeight: number
): LoadoutStripScreenLayout {
  const scale = calculateHudScale(canvasWidth, canvasHeight);
  const slotSize = STRIP.slotSize * scale;
  const gap = STRIP.gap * scale;
  const padding = STRIP.padding * scale;
  const w = 3 * slotSize + 2 * gap + padding * 2;
  const h = slotSize + padding * 2 + 14 * scale;
  const x = canvasWidth / 2 - w / 2;
  const y = canvasHeight - h - STRIP.marginBottom * scale;
  return { scale, slotSize, gap, padding, w, h, x, y };
}

export class LoadoutStrip implements Renderable {
  constructor(
    private assetManager: AssetManager,
    private getInventory: () => (InventoryItem | null)[],
    private getMyPlayer: () => PlayerClient | null,
    private onSelectLoadout: (loadout: 0 | 1 | 2) => void,
    private clearWeaponLoadoutSlot: (slot: 0 | 1 | 2) => void
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
    ctx.fillStyle = STRIP.bg;
    ctx.strokeStyle = STRIP.border;
    ctx.lineWidth = 2 * L.scale;
    ctx.fillRect(L.x, L.y, L.w, L.h);
    ctx.strokeRect(L.x, L.y, L.w, L.h);

    const slots: { bag: number; loadout: 0 | 1 | 2 }[] = [
      { bag: p, loadout: 0 },
      { bag: s, loadout: 1 },
      { bag: m, loadout: 2 },
    ];

    for (let i = 0; i < 3; i++) {
      const { bag, loadout } = slots[i]!;
      const sx = L.x + L.padding + i * (L.slotSize + L.gap);
      const sy = L.y + L.padding;

      let item: InventoryItem | null = null;
      if (bag >= 1) {
        const it = this.itemAtBagSlot(inv, bag);
        if (it && itemMatchesLoadoutRow(it.itemType, loadout)) item = it;
      }

      const isActive = active === loadout;
      ctx.strokeStyle = isActive ? STRIP.activeBorder : STRIP.border;
      ctx.lineWidth = isActive ? 3 * L.scale : 1 * L.scale;
      ctx.fillStyle = "rgba(40, 40, 48, 0.95)";
      ctx.fillRect(sx, sy, L.slotSize, L.slotSize);
      ctx.strokeRect(sx, sy, L.slotSize, L.slotSize);

      if (item) {
        const img = this.assetManager.get(getItemAssetKey(item));
        if (img) {
          const pad = 6 * L.scale;
          ctx.drawImage(img, sx + pad, sy + pad, L.slotSize - pad * 2, L.slotSize - pad * 2);
        }
      } else if (loadout === 2) {
        ctx.font = `bold ${12 * L.scale}px Arial`;
        ctx.fillStyle = "rgba(220, 200, 160, 0.9)";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("Fists", sx + L.slotSize / 2, sy + L.slotSize / 2);
      }

      ctx.font = `${10 * L.scale}px Arial`;
      ctx.fillStyle = "rgba(200,200,210,0.85)";
      ctx.textAlign = "center";
      ctx.fillText(LABELS[i]!, sx + L.slotSize / 2, L.y + L.h - 6 * L.scale);
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

    for (let i = 0; i < 3; i++) {
      const sx = L.x + L.padding + i * (L.slotSize + L.gap);
      const sy = L.y + L.padding;
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
