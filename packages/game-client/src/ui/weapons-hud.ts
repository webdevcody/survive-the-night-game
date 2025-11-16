/**
 * WeaponsHUD – Ultra-Optimized Version
 * --------------------------------------------------------------
 * Zero allocations during render.
 * All heavy work done only when inventory or window size changes.
 */

import { Renderable } from "@/entities/util";
import { InputManager } from "@/managers/input";
import { AssetManager, getItemAssetKey } from "@/managers/asset";
import { InventoryItem, isWeapon } from "../../../game-shared/src/util/inventory";
import { calculateHudScale } from "@/util/hud-scale";
import { weaponRegistry } from "../../../game-shared/src/entities/weapon-registry";
import { Z_INDEX } from "@shared/map";

const TWO_PI = Math.PI * 2;

const WHEEL = {
  innerRadius: 80,
  outerRadius: 250,
  labelFont: "bold 22px Arial",

  segmentLocked: "#2a1a0f",
  segmentOwned: "#3d2617",
  highlight: "#5a3a25",
  borderColor: "#2a1a0f",
  borderWidth: 3,

  tintLockedColor: "#4a3a2a",

  iconMaxSize: 42,
  iconScale: 1.4,
};

export class WeaponsHUD implements Renderable {
  private input: InputManager;
  private assets: AssetManager;
  private getInventory: () => InventoryItem[];

  private mouseX = 0;
  private mouseY = 0;

  private items: {
    name: string;
    img: HTMLImageElement;
    imgLocked: HTMLCanvasElement;
    owned: boolean;
  }[] = [];

  private segments: { start: number; end: number; mid: number }[] = [];
  private weaponIndex: Record<string, number> = {}; // weaponType -> index

  private initialized = false;
  private lastOwnedMask = ""; // simple string mask tracks ownership changes

  constructor(
    assetManager: AssetManager,
    inputManager: InputManager,
    getInventory: () => InventoryItem[]
  ) {
    this.assets = assetManager;
    this.input = inputManager;
    this.getInventory = getInventory;

    this.buildStaticData(); // one-time heavy build
  }

  // ---------------------------------------------------------------------
  // INITIAL ONE-TIME BUILD
  // ---------------------------------------------------------------------
  private buildStaticData() {
    const allWeapons = weaponRegistry.getAllWeaponTypes();
    const count = allWeapons.length;
    if (count === 0) return;

    this.items.length = count;
    this.segments.length = count;

    const angleStep = TWO_PI / count;

    for (let i = 0; i < count; i++) {
      const weaponType = allWeapons[i];
      const img = this.assets.get(getItemAssetKey({ itemType: weaponType }));

      this.items[i] = {
        name: weaponType,
        img,
        imgLocked: this.createTint(img),
        owned: false,
      };

      const start = i * angleStep - Math.PI / 2;
      this.segments[i] = {
        start,
        end: start + angleStep,
        mid: start + angleStep / 2,
      };

      this.weaponIndex[weaponType] = i;
    }

    this.initialized = true;
  }

  // Tint locked weapon sprite once (never repeated)
  private createTint(img: HTMLImageElement): HTMLCanvasElement {
    const c = document.createElement("canvas");
    c.width = img.width;
    c.height = img.height;

    const ctx = c.getContext("2d")!;
    ctx.drawImage(img, 0, 0);
    ctx.globalCompositeOperation = "source-in";
    ctx.fillStyle = WHEEL.tintLockedColor;
    ctx.fillRect(0, 0, img.width, img.height);

    return c;
  }

  updateMouse(x: number, y: number) {
    this.mouseX = x;
    this.mouseY = y;
  }

  // ---------------------------------------------------------------------
  // UPDATE OWNERSHIP (only when needed)
  // ---------------------------------------------------------------------
  private updateOwnership() {
    const inv = this.getInventory();
    const count = this.items.length;

    // Build a mask string like "10100101" for owned weapons
    let mask = "";
    for (let i = 0; i < count; i++) {
      const name = this.items[i].name;
      const owned = inv.some((it) => it && it.itemType === name);
      mask += owned ? "1" : "0";
    }

    if (mask === this.lastOwnedMask) return; // no changes
    this.lastOwnedMask = mask;

    // Apply ownership states without allocating new objects
    for (let i = 0; i < count; i++) {
      this.items[i].owned = mask[i] === "1";
    }
  }

  // ---------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------
  render(ctx: CanvasRenderingContext2D) {
    if (!this.input.isAltKeyHeld()) return;
    if (!this.initialized) return;

    this.updateOwnership();

    const canvas = ctx.canvas;
    const w = canvas.width;
    const h = canvas.height;

    const scale = calculateHudScale(w, h);
    const cx = w / 2;
    const cy = h / 2;
    const rIn = WHEEL.innerRadius * scale;
    const rOut = WHEEL.outerRadius * scale;

    const hoverIndex = this.detectSegment(cx, cy, rIn, rOut);
    canvas.style.cursor =
      hoverIndex === -1 ? "default" : this.items[hoverIndex].owned ? "pointer" : "not-allowed";

    ctx.save();
    this.drawWheel(ctx, cx, cy, rIn, rOut, scale, hoverIndex);
    ctx.restore();
  }

  // ---------------------------------------------------------------------
  // DETECT HOVER (O(1))
  // ---------------------------------------------------------------------
  private detectSegment(cx: number, cy: number, rIn: number, rOut: number): number {
    const dx = this.mouseX - cx;
    const dy = this.mouseY - cy;
    const dist = dx * dx + dy * dy;

    if (dist < rIn * rIn || dist > rOut * rOut) return -1;

    const angle = (Math.atan2(dy, dx) + Math.PI / 2 + TWO_PI) % TWO_PI;
    return (angle / (TWO_PI / this.items.length)) | 0;
  }

  // ---------------------------------------------------------------------
  // DRAW WHEEL
  // ---------------------------------------------------------------------
  private drawWheel(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    rIn: number,
    rOut: number,
    scale: number,
    hover: number
  ) {
    ctx.lineWidth = WHEEL.borderWidth * scale;
    ctx.strokeStyle = WHEEL.borderColor;

    const items = this.items;
    const segments = this.segments;
    const count = items.length;

    for (let i = 0; i < count; i++) {
      const seg = segments[i];
      const item = items[i];

      ctx.beginPath();
      ctx.arc(cx, cy, rOut, seg.start, seg.end);
      ctx.arc(cx, cy, rIn, seg.end, seg.start, true);
      ctx.closePath();

      ctx.fillStyle =
        item.owned === false
          ? WHEEL.segmentLocked
          : i === hover
          ? WHEEL.highlight
          : WHEEL.segmentOwned;

      ctx.fill();
      ctx.stroke();

      this.drawIcon(ctx, item, cx, cy, seg.mid, rIn, rOut, scale);
    }
  }

  // ---------------------------------------------------------------------
  // ICON RENDER
  // ---------------------------------------------------------------------
  private drawIcon(
    ctx: CanvasRenderingContext2D,
    item: any,
    cx: number,
    cy: number,
    angle: number,
    rIn: number,
    rOut: number,
    scale: number
  ) {
    const sprite = item.owned ? item.img : item.imgLocked;
    if (!sprite) return;

    const x = cx + Math.cos(angle) * (rIn + (rOut - rIn) * 0.55);
    const y = cy + Math.sin(angle) * (rIn + (rOut - rIn) * 0.55);

    const iw = sprite.width;
    const ih = sprite.height;
    const s =
      Math.min((WHEEL.iconMaxSize * scale) / iw, (WHEEL.iconMaxSize * scale) / ih) *
      WHEEL.iconScale;

    ctx.drawImage(sprite, x - (iw * s) / 2, y - (ih * s) / 2, iw * s, ih * s);
  }

  // ---------------------------------------------------------------------
  // CLICK HANDLING
  // ---------------------------------------------------------------------
  handleClick(x: number, y: number, canvasWidth: number, canvasHeight: number): boolean {
    if (!this.input.isAltKeyHeld()) return false;

    const scale = calculateHudScale(canvasWidth, canvasHeight);
    const cx = canvasWidth / 2;
    const cy = canvasHeight / 2;
    const rIn = WHEEL.innerRadius * scale;
    const rOut = WHEEL.outerRadius * scale;

    const dx = x - cx;
    const dy = y - cy;
    const dist = dx * dx + dy * dy;

    if (dist < rIn * rIn || dist > rOut * rOut) return false;

    const angle = (Math.atan2(dy, dx) + Math.PI / 2 + TWO_PI) % TWO_PI;
    const i = (angle / (TWO_PI / this.items.length)) | 0;

    const it = this.items[i];
    if (!it.owned) return true;

    const inv = this.getInventory();
    const slot = inv.findIndex((v) => v && v.itemType === it.name);
    if (slot === -1) return true;

    this.input.setInventorySlot(slot + 1);
    this.input.setAltKeyHeld(false);

    return true;
  }

  getZIndex() {
    return Z_INDEX.UI + 5;
  }
}
