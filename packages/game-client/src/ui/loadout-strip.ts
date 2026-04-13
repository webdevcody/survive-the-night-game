import { GameState } from "@/state";
import { Renderable } from "@/entities/util";
import { AssetManager, getItemAssetKey } from "@/managers/asset";
import { InventoryItem } from "@shared/util/inventory";
import { calculateHudScale } from "@/util/hud-scale";
import { renderRadialProgressIndicator } from "@/util/radial-progress-indicator";
import { Z_INDEX } from "@shared/map";
import { PlayerClient } from "@/entities/player";
import { itemMatchesLoadoutRow } from "@shared/util/weapon-loadout";
import type { CanvasUiRect } from "./canvas-ui-rect";
import {
  fillRpgPanelGradient,
  RPG_BODY_TEXT,
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
  screenEdgePad: 8,
};

const NUM_SLOTS = 5;
const WEAPON_SLOTS = 3;

const WEAPON_LABELS = ["1 Primary", "2 Secondary", "3 Melee"];
const CONSUMABLE_LABELS = ["4 Quick", "5 Quick"];

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

/** Bottom-right stack count (matches inventory grid styling). */
function drawHotbarStackCount(
  ctx: CanvasRenderingContext2D,
  r: CanvasUiRect,
  item: InventoryItem,
  scale: number,
): void {
  const count = item.state?.count;
  if (typeof count !== "number" || !count) return;

  ctx.font = `bold ${Math.max(10, Math.round(12 * scale))}px Arial`;
  ctx.textAlign = "right";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = RPG_BODY_TEXT;
  ctx.strokeStyle = "rgba(6,8,16,0.9)";
  ctx.lineWidth = Math.max(1, Math.round(2 * scale));
  const cx = r.x + r.w - 4 * scale;
  const cy = r.y + r.h - 4 * scale;
  const label = `${count}`;
  ctx.strokeText(label, cx, cy);
  ctx.fillText(label, cx, cy);
}

function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
): void {
  const r = Math.max(0, Math.min(radius, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawFistsPlaceholderIcon(
  ctx: CanvasRenderingContext2D,
  r: CanvasUiRect,
  scale: number,
): void {
  const fistW = 10 * scale;
  const fistH = 12 * scale;
  const wristW = 4 * scale;
  const wristH = 5 * scale;
  const gap = 4 * scale;
  const centerX = r.x + r.w / 2;
  const topY = r.y + r.h / 2 - fistH / 2 - 2 * scale;
  const leftFistX = centerX - gap / 2 - fistW;
  const rightFistX = centerX + gap / 2;

  ctx.save();
  ctx.lineWidth = Math.max(1, 1.2 * scale);
  ctx.strokeStyle = "rgba(82, 60, 40, 0.95)";

  for (const fistX of [leftFistX, rightFistX]) {
    drawRoundedRectPath(ctx, fistX, topY, fistW, fistH, 2.5 * scale);
    ctx.fillStyle = "rgba(245, 229, 195, 0.95)";
    ctx.fill();
    ctx.stroke();

    drawRoundedRectPath(
      ctx,
      fistX + (fistW - wristW) / 2,
      topY + fistH - scale,
      wristW,
      wristH,
      1.2 * scale,
    );
    ctx.fillStyle = "rgba(223, 198, 158, 0.95)";
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    const firstKnuckleX = fistX + fistW / 3;
    const secondKnuckleX = fistX + (2 * fistW) / 3;
    const knuckleTop = topY + 3 * scale;
    const knuckleBottom = topY + 7 * scale;
    ctx.moveTo(firstKnuckleX, knuckleTop);
    ctx.lineTo(firstKnuckleX, knuckleBottom);
    ctx.moveTo(secondKnuckleX, knuckleTop);
    ctx.lineTo(secondKnuckleX, knuckleBottom);
    ctx.stroke();
  }

  ctx.restore();
}

function drawSlotItemIcon(
  ctx: CanvasRenderingContext2D,
  assetManager: AssetManager,
  r: CanvasUiRect,
  scale: number,
  item: InventoryItem | null,
): void {
  if (!item) {
    return;
  }

  const img = assetManager.get(getItemAssetKey(item));
  if (!img) {
    return;
  }

  const pad = 6 * scale;
  ctx.drawImage(img, r.x + pad, r.y + pad, r.w - pad * 2, r.h - pad * 2);
}

function drawWeaponLoadoutCooldownOverlay(
  ctx: CanvasRenderingContext2D,
  r: CanvasUiRect,
  scale: number,
  progress: number,
): void {
  if (progress <= 0) {
    return;
  }

  ctx.save();
  const inset = 2 * scale;
  ctx.fillStyle = "rgba(6, 8, 16, 0.26)";
  ctx.fillRect(r.x + inset, r.y + inset, r.w - inset * 2, r.h - inset * 2);
  renderRadialProgressIndicator(ctx, {
    progress,
    x: r.x + r.w / 2,
    y: r.y + r.h / 2,
    radius: Math.max(12 * scale, Math.min(r.w, r.h) * 0.28),
    progressColor: "rgba(255, 214, 102, 0.92)",
    borderColor: "rgba(255, 246, 214, 0.88)",
    borderWidth: Math.max(1.25, 1.4 * scale),
    backgroundColor: "rgba(16, 12, 8, 0.76)",
  });
  ctx.restore();
}

/** Screen-space bounds for the bottom-centered weapon strip (shared with HUD layout). */
export function getLoadoutStripScreenLayout(
  canvasWidth: number,
  canvasHeight: number,
  centerX: number = canvasWidth / 2,
): LoadoutStripScreenLayout {
  const scale = calculateHudScale(canvasWidth, canvasHeight);
  const slotSize = STRIP.slotSize * scale;
  const gap = STRIP.gap * scale;
  const padding = STRIP.padding * scale;
  const w = NUM_SLOTS * slotSize + (NUM_SLOTS - 1) * gap + padding * 2;
  const h = padding + slotSize + padding + 14 * scale;
  const minX = STRIP.screenEdgePad * scale;
  const maxX = Math.max(minX, canvasWidth - w - STRIP.screenEdgePad * scale);
  const rawX = centerX - w / 2;
  const x = Math.max(minX, Math.min(maxX, rawX));
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
    private clearWeaponLoadoutSlot: (slot: 0 | 1 | 2 | 3 | 4) => void,
  ) {}

  private getLayout(canvasWidth: number, canvasHeight: number, centerX?: number) {
    return getLoadoutStripScreenLayout(canvasWidth, canvasHeight, centerX);
  }

  private itemAtBagSlot(inv: (InventoryItem | null)[], bag1: number): InventoryItem | null {
    if (bag1 < 1 || bag1 > inv.length) return null;
    return inv[bag1 - 1] ?? null;
  }

  render(ctx: CanvasRenderingContext2D, gameState: GameState, centerX?: number): void {
    const player = this.getMyPlayer();
    if (!player || player.isDead() || player.isZombiePlayer?.()) return;

    const { width: cw, height: ch } = ctx.canvas;
    const L = this.getLayout(cw, ch, centerX);
    const inv = this.getInventory();

    const p = (player as any).weaponLoadoutPrimary ?? 0;
    const s = (player as any).weaponLoadoutSecondary ?? 0;
    const m = (player as any).weaponLoadoutMelee ?? 0;
    const active = (player as any).activeWeaponLoadout ?? 0;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    fillRpgPanelGradient(ctx, L.x, L.y, L.w, L.h);
    strokeRpgPanelBorder(ctx, L.x, L.y, L.w, L.h, Math.max(2, Math.round(2 * L.scale)));

    const weaponSlots: { bag: number; loadout: 0 | 1 | 2 }[] = [
      { bag: p, loadout: 0 },
      { bag: s, loadout: 1 },
      { bag: m, loadout: 2 },
    ];
    const c4 = (player as any).loadoutConsumable4 ?? 0;
    const c5 = (player as any).loadoutConsumable5 ?? 0;
    const consumableBags = [c4, c5];

    for (let i = 0; i < NUM_SLOTS; i++) {
      const r = slotRect(L, i);
      if (i < WEAPON_SLOTS) {
        const { bag, loadout } = weaponSlots[i]!;
        let item: InventoryItem | null = null;
        if (bag >= 1) {
          const it = this.itemAtBagSlot(inv, bag);
          if (it && itemMatchesLoadoutRow(it.itemType, loadout)) item = it;
        }
        const showFistsFallback = loadout === 2 && item == null;

        const isActive = active === loadout;
        ctx.strokeStyle = isActive ? STRIP.activeBorder : RPG_SLOT_STROKE;
        ctx.lineWidth = isActive ? 3 * L.scale : 1 * L.scale;
        ctx.fillStyle = RPG_SLOT_FILL;
        ctx.fillRect(r.x, r.y, r.w, r.h);
        ctx.strokeRect(r.x, r.y, r.w, r.h);

        if (item) {
          drawSlotItemIcon(ctx, this.assetManager, r, L.scale, item);
          drawHotbarStackCount(ctx, r, item, L.scale);
        } else if (showFistsFallback) {
          drawFistsPlaceholderIcon(ctx, r, L.scale);
        }

        const loadoutCooldownProgress = player.getWeaponLoadoutCooldownProgress(loadout);
        if (loadoutCooldownProgress > 0) {
          drawWeaponLoadoutCooldownOverlay(ctx, r, L.scale, loadoutCooldownProgress);
        }

        ctx.font = `${10 * L.scale}px Arial`;
        ctx.fillStyle = RPG_METADATA_MUTED;
        ctx.textAlign = "center";
        ctx.fillText(WEAPON_LABELS[i]!, r.x + r.w / 2, L.y + L.h - 6 * L.scale);
      } else {
        const bag = consumableBags[i - WEAPON_SLOTS]!;
        const item = bag >= 1 ? this.itemAtBagSlot(inv, bag) : null;
        ctx.strokeStyle = RPG_SLOT_STROKE;
        ctx.lineWidth = 1 * L.scale;
        ctx.fillStyle = RPG_SLOT_FILL;
        ctx.fillRect(r.x, r.y, r.w, r.h);
        ctx.strokeRect(r.x, r.y, r.w, r.h);

        if (item) {
          drawSlotItemIcon(ctx, this.assetManager, r, L.scale, item);
          drawHotbarStackCount(ctx, r, item, L.scale);
        }

        ctx.font = `${10 * L.scale}px Arial`;
        ctx.fillStyle = RPG_METADATA_MUTED;
        ctx.textAlign = "center";
        ctx.fillText(CONSUMABLE_LABELS[i - WEAPON_SLOTS]!, r.x + r.w / 2, L.y + L.h - 6 * L.scale);
      }
    }

    ctx.restore();
  }

  handleClick(
    x: number,
    y: number,
    canvasWidth: number,
    canvasHeight: number,
    clickCount: number = 1,
    centerX?: number,
  ): boolean {
    const player = this.getMyPlayer();
    if (!player || player.isDead()) return false;

    const L = this.getLayout(canvasWidth, canvasHeight, centerX);
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
          const slot = i as 3 | 4;
          if (clickCount >= 2) {
            this.clearWeaponLoadoutSlot(slot);
          }
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
