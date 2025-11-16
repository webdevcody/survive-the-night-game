/**
 * WeaponsHUD – Option B Clean Refactor
 * --------------------------------------------------------------
 * No behavior changes.
 * No visual changes.
 * No precomputation except storing per-frame values.
 * Removes all repeated param passing.
 */

import { Renderable } from "@/entities/util";
import { InputManager } from "@/managers/input";
import { AssetManager, getItemAssetKey } from "@/managers/asset";
import { InventoryItem } from "../../../game-shared/src/util/inventory";
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
  private weaponIndex: Record<string, number> = {};

  private initialized = false;
  private lastOwnedMask = "";

  // 🎯 NEW: Frame context (stored once per frame)
  private frame = {
    cx: 0,
    cy: 0,
    rIn: 0,
    rOut: 0,
    scale: 1,
    hover: -1,
  };

  constructor(
    assetManager: AssetManager,
    inputManager: InputManager,
    getInventory: () => InventoryItem[]
  ) {
    this.assets = assetManager;
    this.input = inputManager;
    this.getInventory = getInventory;

    this.buildStaticData();
  }

  // ---------------------------------------------------------
  // ONE-TIME BUILD
  // ---------------------------------------------------------
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

  private drawHotkeyForSegment(ctx: CanvasRenderingContext2D, index: number) {
    const { cx, cy, rIn, rOut, scale } = this.frame;
    const seg = this.segments[index];
    const angle = seg.mid;

    // Base position toward inner radius
    const baseDist = rIn + (rOut - rIn) * 0.08;
    let x = cx + Math.cos(angle) * baseDist;
    let y = cy + Math.sin(angle) * baseDist;

    // Shift into a consistent “corner” inside each wedge
    const perp = angle - Math.PI / 2;
    const shift = 15 * scale;
    x += Math.cos(perp) * shift;
    y += Math.sin(perp) * shift;

    // Hotkey (1–9)
    const label = String(index + 1);

    // Smaller text
    const size = 14 * scale;
    ctx.font = `bold ${size}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Locked vs owned color
    const owned = this.items[index].owned;

    const mainColor = owned ? "#d4a574" : "#6b4b33"; // gold vs dim brown
    const outlineColor = "#000000";

    // Slight shadow for nicer UI
    ctx.shadowColor = "rgba(0,0,0,0.3)";
    ctx.shadowBlur = 2 * scale;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Multi-direction outline (cheap & fast)
    const o = 1 * scale;
    ctx.fillStyle = outlineColor;
    ctx.fillText(label, x - o, y);
    ctx.fillText(label, x + o, y);
    ctx.fillText(label, x, y - o);
    ctx.fillText(label, x, y + o);

    // Main text (gold or dim brown)
    ctx.fillStyle = mainColor;
    ctx.fillText(label, x, y);

    // Reset shadow for icons
    ctx.shadowBlur = 0;
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

  // ---------------------------------------------------------
  // OWNERSHIP UPDATE
  // ---------------------------------------------------------
  private updateOwnership() {
    const inv = this.getInventory();
    const count = this.items.length;

    let mask = "";
    for (let i = 0; i < count; i++) {
      const name = this.items[i].name;
      const owned = inv.some((it) => it && it.itemType === name);
      mask += owned ? "1" : "0";
    }

    if (mask === this.lastOwnedMask) return;
    this.lastOwnedMask = mask;

    for (let i = 0; i < count; i++) {
      this.items[i].owned = mask[i] === "1";
    }
  }

  // ---------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------
  render(ctx: CanvasRenderingContext2D) {
    if (!this.input.isAltKeyHeld()) return;
    if (!this.initialized) return;

    this.updateOwnership();

    const canvas = ctx.canvas;
    const w = canvas.width;
    const h = canvas.height;

    const scale = calculateHudScale(w, h);

    // Compute once
    const cx = w * 0.5;
    const cy = h * 0.5;
    const rIn = WHEEL.innerRadius * scale;
    const rOut = WHEEL.outerRadius * scale;

    // Hover detection
    const hover = this.detectSegment(cx, cy, rIn, rOut);

    // Store in frame ctx
    const f = this.frame;
    f.cx = cx;
    f.cy = cy;
    f.rIn = rIn;
    f.rOut = rOut;
    f.scale = scale;
    f.hover = hover;

    ctx.save();
    this.drawWheel(ctx);
    ctx.restore();
  }

  // ---------------------------------------------------------
  // HOVER DETECTION
  // ---------------------------------------------------------
  private detectSegment(cx: number, cy: number, rIn: number, rOut: number): number {
    const dx = this.mouseX - cx;
    const dy = this.mouseY - cy;
    const dist = dx * dx + dy * dy;

    if (dist < rIn * rIn || dist > rOut * rOut) return -1;

    const angle = (Math.atan2(dy, dx) + Math.PI / 2 + TWO_PI) % TWO_PI;
    return (angle / (TWO_PI / this.items.length)) | 0;
  }

  // ---------------------------------------------------------
  // DRAW WHEEL
  // ---------------------------------------------------------
  private drawWheel(ctx: CanvasRenderingContext2D) {
    const { cx, cy, rIn, rOut, scale, hover } = this.frame;

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

      this.drawIcon(ctx, item, seg.mid);
      //   TODO: maybe add hotkeys and if more than 9 add combination of F + 1 and so on
      //   this.drawHotkeyForSegment(ctx, i);
    }
  }

  // ---------------------------------------------------------
  // ICON DRAW
  // ---------------------------------------------------------
  private drawIcon(ctx: CanvasRenderingContext2D, item: any, angle: number) {
    const { cx, cy, rIn, rOut, scale } = this.frame;

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

  // ---------------------------------------------------------
  // CLICK HANDLING
  // ---------------------------------------------------------
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
