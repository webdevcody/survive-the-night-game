import { GameState } from "@/state";
import { getPlayer } from "@/util/get-player";
import { InputManager } from "@/managers/input";
import { AssetManager, getItemAssetKey } from "@/managers/asset";
import {
  InventoryItem,
  isWeapon,
  getWeaponAmmoType,
  type EquipmentSlotKey,
  type PlayerEquipmentState,
} from "@shared/util/inventory";
import { getConfig } from "@shared/config";
import { formatDisplayName } from "@/util/format";
import { PlayerClient } from "@/entities/player";
import { ClientPoison } from "@/extensions/poison";
import { ClientInfiniteRun } from "@/extensions/infinite-run";

const DRAG_THRESHOLD = 12;
const GRID_COLS = 10;
const GRID_ROWS = 4;

type DragSource =
  | { kind: "bag"; index: number }
  | { kind: "equip"; slot: EquipmentSlotKey };

type DragState = {
  source: DragSource;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  isDragging: boolean;
  targetBagIndex: number | null;
  targetEquipSlot: EquipmentSlotKey | null;
};

export type InventoryScreenDeps = {
  assetManager: AssetManager;
  inputManager: InputManager;
  getInventory: () => (InventoryItem | null)[];
  getEquipment: () => PlayerEquipmentState | null;
  sendDropItem: (slotIndex: number) => void;
  sendSwapItems: (from: number, to: number) => void;
  sendSwapBagAndEquipment: (bagIndex: number, equipSlot: EquipmentSlotKey) => void;
  sendSelectInventorySlot: (slotIndex: number) => void;
};

function drawBevelPanel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  bg: string
): void {
  ctx.fillStyle = bg;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "rgba(160, 160, 170, 0.85)";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
  ctx.strokeStyle = "rgba(40, 40, 50, 0.9)";
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
}

export class InventoryScreenUI {
  private open = false;
  private deps: InventoryScreenDeps;
  private dragState: DragState | null = null;
  private hoveredBagIndex: number | null = null;
  private hoveredEquipSlot: EquipmentSlotKey | null = null;
  private lastW = 0;
  private lastH = 0;

  constructor(deps: InventoryScreenDeps) {
    this.deps = deps;
  }

  public toggle(): void {
    this.open = !this.open;
    if (!this.open) {
      this.dragState = null;
    }
  }

  public setOpen(value: boolean): void {
    this.open = value;
    if (!this.open) {
      this.dragState = null;
    }
  }

  public isOpen(): boolean {
    return this.open;
  }

  public isHovering(): boolean {
    if (!this.open) return false;
    const pos = this.deps.inputManager.getMousePosition();
    if (!pos || !this.lastW || !this.lastH) return false;
    return this.isPointOverUi(pos.x, pos.y, this.lastW, this.lastH);
  }

  private layout(canvasWidth: number, canvasHeight: number) {
    const half = canvasWidth / 2;
    const pad = 20;
    const leftX = pad;
    const leftW = half - pad * 2;
    const leftY = pad;
    const leftH = canvasHeight - pad * 2;

    const rightX = half + pad;
    const rightW = half - pad * 2;
    const rightY = pad;
    const rightH = canvasHeight - pad * 2;

    const equipH = Math.min(160, rightH * 0.28);
    const headSize = Math.min(72, equipH * 0.7);
    const mainHandW = 56;
    const mainHandH = equipH * 0.85;
    const equipTop = rightY + 36;
    const headX = rightX + rightW * 0.15;
    const headY = equipTop + (equipH - headSize) / 2;
    const mainX = rightX + rightW * 0.45;
    const mainY = equipTop + (equipH - mainHandH) / 2;

    const gridTop = rightY + equipH + 56;
    const gridBottom = rightY + rightH - 24;
    const gridAvailH = Math.max(80, gridBottom - gridTop);
    const cellGap = 6;
    const cellSize = Math.min(
      52,
      Math.floor((rightW - cellGap * (GRID_COLS - 1)) / GRID_COLS),
      Math.floor((gridAvailH - cellGap * (GRID_ROWS - 1)) / GRID_ROWS)
    );
    const gridW = GRID_COLS * cellSize + (GRID_COLS - 1) * cellGap;
    const gridH = GRID_ROWS * cellSize + (GRID_ROWS - 1) * cellGap;
    const gridLeft = rightX + (rightW - gridW) / 2;

    return {
      half,
      leftX,
      leftY,
      leftW,
      leftH,
      rightX,
      rightY,
      rightW,
      rightH,
      equipH,
      headRect: { x: headX, y: headY, w: headSize, h: headSize },
      mainHandRect: { x: mainX, y: mainY, w: mainHandW, h: mainHandH },
      gridLeft,
      gridTop,
      cellSize,
      cellGap,
      gridW,
      gridH,
    };
  }

  private getBagIndexAt(x: number, y: number, L: ReturnType<InventoryScreenUI["layout"]>): number | null {
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const idx = row * GRID_COLS + col;
        const sx = L.gridLeft + col * (L.cellSize + L.cellGap);
        const sy = L.gridTop + row * (L.cellSize + L.cellGap);
        if (x >= sx && x <= sx + L.cellSize && y >= sy && y <= sy + L.cellSize) {
          return idx;
        }
      }
    }
    return null;
  }

  private getEquipAt(
    x: number,
    y: number,
    L: ReturnType<InventoryScreenUI["layout"]>
  ): EquipmentSlotKey | null {
    const { headRect, mainHandRect } = L;
    if (x >= headRect.x && x <= headRect.x + headRect.w && y >= headRect.y && y <= headRect.y + headRect.h) {
      return "head";
    }
    if (
      x >= mainHandRect.x &&
      x <= mainHandRect.x + mainHandRect.w &&
      y >= mainHandRect.y &&
      y <= mainHandRect.y + mainHandRect.h
    ) {
      return "mainHand";
    }
    return null;
  }

  public render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    this.lastW = ctx.canvas.width;
    this.lastH = ctx.canvas.height;

    if (!this.open) {
      return;
    }

    const player = getPlayer(gameState);
    if (!player || !(player instanceof PlayerClient)) {
      return;
    }

    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    const L = this.layout(w, h);

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
    ctx.fillRect(0, 0, w, h);

    drawBevelPanel(ctx, L.leftX, L.leftY, L.leftW, L.leftH, "rgba(18, 18, 24, 0.96)");
    drawBevelPanel(ctx, L.rightX, L.rightY, L.rightW, L.rightH, "rgba(18, 18, 24, 0.96)");

    ctx.font = "bold 22px Arial";
    ctx.fillStyle = "rgba(220, 215, 200, 1)";
    ctx.textAlign = "left";
    ctx.fillText("Character", L.leftX + 14, L.leftY + 32);

    ctx.fillText("Inventory", L.rightX + 14, L.rightY + 28);
    ctx.font = "14px Arial";
    ctx.fillStyle = "rgba(180, 180, 190, 0.9)";
    ctx.fillText("Equipment", L.rightX + 14, L.rightY + 48);

    const maxHp = getConfig().player.MAX_PLAYER_HEALTH;
    const hp = player.getHealth();
    const stamina = player.getStamina();
    const maxStamina = player.getMaxStamina();
    let ly = L.leftY + 68;
    ctx.font = "16px Arial";
    ctx.fillStyle = "#eee";
    ctx.fillText(`Health: ${hp} / ${maxHp}`, L.leftX + 16, ly);
    ly += 28;
    ctx.fillText(`Stamina: ${Math.round(stamina)} / ${maxStamina}`, L.leftX + 16, ly);
    ly += 28;
    if (player.hasExt(ClientPoison)) {
      ctx.fillStyle = "#7f7";
      ctx.fillText("Poisoned", L.leftX + 16, ly);
      ly += 28;
    }
    if (player.hasExt(ClientInfiniteRun)) {
      ctx.fillStyle = "#8af";
      ctx.fillText("Infinite run", L.leftX + 16, ly);
      ly += 28;
    }
    ctx.fillStyle = "#bbb";
    ctx.font = "13px Arial";
    ctx.fillText("I / Esc — close    P — instructions", L.leftX + 16, L.leftY + L.leftH - 20);

    const items = this.deps.getInventory();
    const equipment = this.deps.getEquipment();

    this.drawEquipSlot(ctx, L.headRect, equipment?.head ?? null, "Head", "head");
    this.drawEquipSlot(ctx, L.mainHandRect, equipment?.mainHand ?? null, "Weapon", "mainHand");

    const slots = getConfig().player.MAX_INVENTORY_SLOTS;
    const activeIdx = this.deps.inputManager.getCurrentInventorySlot() - 1;

    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const idx = row * GRID_COLS + col;
        if (idx >= slots) continue;
        const sx = L.gridLeft + col * (L.cellSize + L.cellGap);
        const sy = L.gridTop + row * (L.cellSize + L.cellGap);
        const invItem = items[idx];
        const isActive = activeIdx === idx;
        const isHover = this.hoveredBagIndex === idx && !this.dragState?.isDragging;
        const isDragSource =
          this.dragState?.isDragging &&
          this.dragState.source.kind === "bag" &&
          this.dragState.source.index === idx;
        const isTarget =
          this.dragState?.isDragging &&
          this.dragState.targetBagIndex === idx &&
          this.dragState.source.kind === "bag" &&
          this.dragState.source.index !== idx;

        ctx.fillStyle = "rgba(42, 42, 52, 0.95)";
        ctx.fillRect(sx, sy, L.cellSize, L.cellSize);

        if (isDragSource) {
          ctx.fillStyle = "rgba(255,255,255,0.08)";
          ctx.fillRect(sx, sy, L.cellSize, L.cellSize);
        }

        ctx.strokeStyle = isTarget
          ? "rgba(100, 200, 255, 0.95)"
          : isActive
            ? "rgba(255, 220, 120, 0.95)"
            : isHover
              ? "rgba(200, 200, 255, 0.6)"
              : "rgba(90, 95, 110, 0.9)";
        ctx.lineWidth = isActive || isTarget ? 2 : 1;
        ctx.strokeRect(sx, sy, L.cellSize, L.cellSize);

        if (invItem) {
          const img = this.deps.assetManager.get(getItemAssetKey(invItem));
          if (img) {
            const pad = 6;
            ctx.save();
            if (isDragSource) ctx.globalAlpha = 0.35;
            ctx.drawImage(
              img,
              sx + pad,
              sy + pad,
              L.cellSize - pad * 2,
              L.cellSize - pad * 2
            );
            ctx.restore();
          }
          if (invItem.state?.count) {
            ctx.font = "bold 14px Arial";
            ctx.textAlign = "right";
            ctx.fillStyle = "#fff";
            ctx.strokeStyle = "rgba(0,0,0,0.85)";
            ctx.lineWidth = 2;
            const cx = sx + L.cellSize - 4;
            const cy = sy + L.cellSize - 4;
            ctx.strokeText(`${invItem.state.count}`, cx, cy);
            ctx.fillText(`${invItem.state.count}`, cx, cy);
          }
          if (isWeapon(invItem.itemType)) {
            const ammoType = getWeaponAmmoType(invItem.itemType);
            if (ammoType) {
              const ammoItem = items.find((it) => it?.itemType === ammoType);
              const ammoCount = ammoItem?.state?.count ?? 0;
              ctx.font = "bold 11px Arial";
              ctx.textAlign = "right";
              ctx.fillStyle = ammoCount > 0 ? "rgba(255, 255, 120, 1)" : "rgba(255, 100, 100, 1)";
              ctx.strokeStyle = "rgba(0,0,0,0.8)";
              ctx.lineWidth = 2;
              const ax = sx + L.cellSize - 4;
              const ay = sy + 14;
              ctx.strokeText(`${ammoCount}`, ax, ay);
              ctx.fillText(`${ammoCount}`, ax, ay);
            }
          }
        }

        ctx.font = "11px Arial";
        ctx.textAlign = "left";
        ctx.fillStyle = "rgba(200,200,210,0.65)";
        if (idx < 9) ctx.fillText(`${idx + 1}`, sx + 4, sy + 14);
        else if (idx === 9) ctx.fillText("0", sx + 4, sy + 14);
      }
    }

    this.renderDragPreview(ctx, L.cellSize);
    this.renderTooltipFixed(ctx, items, equipment);
    ctx.restore();
  }

  private drawEquipSlot(
    ctx: CanvasRenderingContext2D,
    rect: { x: number; y: number; w: number; h: number },
    item: InventoryItem | null,
    label: string,
    slot: EquipmentSlotKey
  ): void {
    const isHover = this.hoveredEquipSlot === slot && !this.dragState?.isDragging;
    const isDragSource =
      this.dragState?.isDragging &&
      this.dragState.source.kind === "equip" &&
      this.dragState.source.slot === slot;
    const isTarget =
      this.dragState?.isDragging &&
      this.dragState.targetEquipSlot === slot &&
      !(
        this.dragState.source.kind === "equip" && this.dragState.source.slot === slot
      );

    ctx.fillStyle = "rgba(36, 36, 46, 0.98)";
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    if (isDragSource) {
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    }
    ctx.strokeStyle = isTarget
      ? "rgba(100, 200, 255, 0.95)"
      : isHover
        ? "rgba(200, 200, 255, 0.7)"
        : "rgba(120, 120, 135, 0.9)";
    ctx.lineWidth = 2;
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);

    ctx.font = "12px Arial";
    ctx.fillStyle = "rgba(160, 160, 175, 0.95)";
    ctx.textAlign = "center";
    ctx.fillText(label, rect.x + rect.w / 2, rect.y - 8);

    if (item) {
      const img = this.deps.assetManager.get(getItemAssetKey(item));
      if (img) {
        const pad = 8;
        ctx.save();
        if (isDragSource) ctx.globalAlpha = 0.35;
        ctx.drawImage(img, rect.x + pad, rect.y + pad, rect.w - pad * 2, rect.h - pad * 2);
        ctx.restore();
      }
    }
  }

  private renderDragPreview(ctx: CanvasRenderingContext2D, cellSize: number): void {
    if (!this.dragState?.isDragging) return;
    let dragged: InventoryItem | null = null;
    if (this.dragState.source.kind === "bag") {
      dragged = this.deps.getInventory()[this.dragState.source.index] ?? null;
    } else {
      dragged = this.deps.getEquipment()?.[this.dragState.source.slot] ?? null;
    }
    if (!dragged) return;
    const img = this.deps.assetManager.get(getItemAssetKey(dragged));
    if (!img) return;
    const previewSize = cellSize * 0.85;
    const dx = this.dragState.currentX - previewSize / 2;
    const dy = this.dragState.currentY - previewSize / 2;
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.drawImage(img, dx, dy, previewSize, previewSize);
    ctx.restore();
  }

  private _mx = 0;
  private _my = 0;

  public updateMousePosition(x: number, y: number, canvasWidth: number, canvasHeight: number): void {
    this._mx = x;
    this._my = y;
    this.lastW = canvasWidth;
    this.lastH = canvasHeight;
    if (!this.open) {
      this.hoveredBagIndex = null;
      this.hoveredEquipSlot = null;
      return;
    }
    const L = this.layout(canvasWidth, canvasHeight);
    this.hoveredBagIndex = this.getBagIndexAt(x, y, L);
    this.hoveredEquipSlot = this.getEquipAt(x, y, L);
    if (this.dragState?.isDragging) {
      this.dragState.currentX = x;
      this.dragState.currentY = y;
      this.dragState.targetBagIndex = this.hoveredBagIndex;
      this.dragState.targetEquipSlot = this.hoveredEquipSlot;
    }
  }

  /** Fix broken renderTooltip - use _mx,_my */
  private renderTooltipFixed(
    ctx: CanvasRenderingContext2D,
    items: (InventoryItem | null)[],
    equipment: PlayerEquipmentState | null
  ): void {
    if (this.dragState?.isDragging) return;

    let hovered: InventoryItem | null = null;
    if (this.hoveredBagIndex !== null) {
      hovered = items[this.hoveredBagIndex] ?? null;
    } else if (this.hoveredEquipSlot) {
      hovered = equipment?.[this.hoveredEquipSlot] ?? null;
    }
    if (!hovered) return;

    const name = formatDisplayName(hovered.itemType);
    ctx.font = "bold 16px Arial";
    ctx.textAlign = "center";
    const tw = ctx.measureText(name).width;
    const pad = 8;
    const bx = this._mx - tw / 2 - pad;
    const by = this._my - 36;
    const bw = tw + pad * 2;
    const bh = 28;
    ctx.fillStyle = "rgba(0,0,0,0.9)";
    ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = "rgba(255,255,255,0.4)";
    ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, bw, bh);
    ctx.fillStyle = "#fff";
    ctx.fillText(name, this._mx, by + 20);
  }

  public handleClick(x: number, y: number, canvasWidth: number, canvasHeight: number): boolean {
    if (!this.open) return false;
    const L = this.layout(canvasWidth, canvasHeight);
    const inLeft = x >= L.leftX && x <= L.leftX + L.leftW && y >= L.leftY && y <= L.leftY + L.leftH;
    const inRight = x >= L.rightX && x <= L.rightX + L.rightW && y >= L.rightY && y <= L.rightY + L.rightH;
    if (!inLeft && !inRight) {
      this.toggle();
      return true;
    }

    const bagIdx = this.getBagIndexAt(x, y, L);
    const eq = this.getEquipAt(x, y, L);
    if (bagIdx !== null) {
      const item = this.deps.getInventory()[bagIdx];
      if (item) {
        this.dragState = {
          source: { kind: "bag", index: bagIdx },
          startX: x,
          startY: y,
          currentX: x,
          currentY: y,
          isDragging: false,
          targetBagIndex: null,
          targetEquipSlot: null,
        };
      }
      if (bagIdx < getConfig().player.MAX_INVENTORY_SLOTS) {
        this.deps.sendSelectInventorySlot(bagIdx + 1);
      }
      return true;
    }
    if (eq) {
      const item = this.deps.getEquipment()?.[eq];
      if (item) {
        this.dragState = {
          source: { kind: "equip", slot: eq },
          startX: x,
          startY: y,
          currentX: x,
          currentY: y,
          isDragging: false,
          targetBagIndex: null,
          targetEquipSlot: null,
        };
      }
      return true;
    }
    return true;
  }

  public handleMouseMove(x: number, y: number, canvasWidth: number, canvasHeight: number): void {
    this.updateMousePosition(x, y, canvasWidth, canvasHeight);
    const drag = this.dragState;
    if (!drag || drag.isDragging) {
      return;
    }
    const d = Math.hypot(x - drag.startX, y - drag.startY);
    if (d >= DRAG_THRESHOLD) {
      drag.isDragging = true;
      this.hoveredBagIndex = null;
      this.hoveredEquipSlot = null;
    }
  }

  public handleMouseUp(x: number, y: number, canvasWidth: number, canvasHeight: number): void {
    if (!this.open) return;
    const drag = this.dragState;
    this.dragState = null;
    if (!drag?.isDragging) {
      return;
    }

    const L = this.layout(canvasWidth, canvasHeight);
    const bagIdx = this.getBagIndexAt(x, y, L);
    const eq = this.getEquipAt(x, y, L);

    if (drag.source.kind === "bag") {
      if (bagIdx !== null && bagIdx !== drag.source.index) {
        this.deps.sendSwapItems(drag.source.index, bagIdx);
        return;
      }
      if (eq) {
        this.deps.sendSwapBagAndEquipment(drag.source.index, eq);
        return;
      }
      const inRight = x >= L.rightX && x <= L.rightX + L.rightW && y >= L.rightY && y <= L.rightY + L.rightH;
      const inLeft = x >= L.leftX && x <= L.leftX + L.leftW && y >= L.leftY && y <= L.leftY + L.leftH;
      if (!inRight && !inLeft) {
        this.deps.sendDropItem(drag.source.index);
      }
      return;
    }

    if (drag.source.kind === "equip") {
      if (bagIdx !== null) {
        this.deps.sendSwapBagAndEquipment(bagIdx, drag.source.slot);
      }
    }
  }

  public isPointOverUi(x: number, y: number, canvasWidth: number, canvasHeight: number): boolean {
    if (!this.open) return false;
    const L = this.layout(canvasWidth, canvasHeight);
    const inLeft = x >= L.leftX && x <= L.leftX + L.leftW && y >= L.leftY && y <= L.leftY + L.leftH;
    const inRight = x >= L.rightX && x <= L.rightX + L.rightW && y >= L.rightY && y <= L.rightY + L.rightH;
    return inLeft || inRight;
  }
}
