import { Renderable } from "@/entities/util";
import { InputManager } from "@/managers/input";
import { AssetManager, getItemAssetKey } from "@/managers/asset";
import { InventoryItem } from "@shared/util/inventory";
import { calculateHudScale } from "@/util/hud-scale";
import { weaponRegistry } from "@shared/entities/weapon-registry";
import { Z_INDEX } from "@shared/map";

const TWO_PI = Math.PI * 2;

const WHEEL = {
  innerRadius: 60,
  outerRadius: 220,

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
    ammoType: string | null;
    iconW: number;
    iconH: number;
  }[] = [];

  private segments: { start: number; end: number; mid: number }[] = [];
  private weaponIndex: Record<string, number> = {};
  private initialized = false;

  private lastOwnedMask = "";

  private frame = {
    cx: 0,
    cy: 0,
    rIn: 0,
    rOut: 0,
    scale: 1,
    hover: -1,
  };

  constructor(asset: AssetManager, input: InputManager, getInv: () => InventoryItem[]) {
    this.assets = asset;
    this.input = input;
    this.getInventory = getInv;
    this.buildStaticData();
  }

  // ---------------------------------------------------------
  // BUILD STATIC
  // ---------------------------------------------------------
  private buildStaticData() {
    const allWeapons = weaponRegistry.getAll();
    const count = allWeapons.length;

    if (count === 0) return;

    const angleStep = TWO_PI / count;

    for (let i = 0; i < count; i++) {
      const weapon = allWeapons[i];
      const type = weapon.id;

      const img = this.assets.get(getItemAssetKey({ itemType: type }));

      const start = i * angleStep - Math.PI / 2;

      this.segments[i] = {
        start,
        end: start + angleStep,
        mid: start + angleStep / 2,
      };

      this.items[i] = {
        name: type,
        img,
        imgLocked: this.createTint(img),
        owned: false,
        ammoType: weapon.ammoType ?? null,
        iconW: 0,
        iconH: 0,
      };

      this.weaponIndex[type] = i;
    }

    this.initialized = true;
  }

  // ---------------------------------------------------------
  // ICON SIZE PRECOMPUTE
  // ---------------------------------------------------------
  private computeIconSizes(scale: number) {
    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];
      const sprite = item.img;

      const iw = sprite.width;
      const ih = sprite.height;

      const ratio =
        Math.min((WHEEL.iconMaxSize * scale) / iw, (WHEEL.iconMaxSize * scale) / ih) *
        WHEEL.iconScale;

      item.iconW = iw * ratio;
      item.iconH = ih * ratio;
    }
  }

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
      const type = this.items[i].name;

      const weaponOwned = inv.some((it) => it && it.itemType === type);

      mask += weaponOwned ? "1" : "0";
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

    const cx = w * 0.5;
    const cy = h * 0.5;

    const rIn = WHEEL.innerRadius * scale;
    const rOut = WHEEL.outerRadius * scale;

    this.computeIconSizes(scale);

    const hover = this.detectSegment();

    this.frame.cx = cx;
    this.frame.cy = cy;
    this.frame.rIn = rIn;
    this.frame.rOut = rOut;
    this.frame.scale = scale;
    this.frame.hover = hover;

    const inventory = this.getInventory();
    const ammoCounts: Record<string, number> = {};

    for (const it of inventory) {
      if (it?.itemType && it.state?.count != null) {
        ammoCounts[it.itemType] = it.state.count;
      }
    }

    ctx.save();
    this.drawWheel(ctx, ammoCounts);
    ctx.restore();
  }

  // ---------------------------------------------------------
  // HOVER DETECTION
  // ---------------------------------------------------------
  private detectSegment(): number {
    const { cx, cy, rIn, rOut } = this.frame;
    const dx = this.mouseX - cx;
    const dy = this.mouseY - cy;

    const dist = dx * dx + dy * dy;

    if (dist < rIn * rIn) return -1;
    if (dist > rOut * rOut) return -1;

    const angle = (Math.atan2(dy, dx) + Math.PI / 2 + TWO_PI) % TWO_PI;

    const index = (angle / (TWO_PI / this.items.length)) | 0;
    return index;
  }

  // ---------------------------------------------------------
  // DRAW WHEEL (READABLE)
  // ---------------------------------------------------------
  private drawWheel(ctx: CanvasRenderingContext2D, ammoCounts: Record<string, number>) {
    const { cx, cy, rIn, rOut, scale, hover } = this.frame;

    ctx.lineWidth = WHEEL.borderWidth * scale;
    ctx.strokeStyle = WHEEL.borderColor;

    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];
      const seg = this.segments[i];

      // PICK SEGMENT COLOR (readable version)
      let fillColor = WHEEL.segmentOwned;

      if (!item.owned) {
        fillColor = WHEEL.segmentLocked;
      } else if (i === hover) {
        fillColor = WHEEL.highlight;
      }

      // Draw wedge
      ctx.beginPath();
      ctx.arc(cx, cy, rOut, seg.start, seg.end);
      ctx.arc(cx, cy, rIn, seg.end, seg.start, true);
      ctx.closePath();

      ctx.fillStyle = fillColor;
      ctx.fill();
      ctx.stroke();

      // ICON
      this.drawIcon(ctx, item, seg.mid);

      // AMMO
      if (item.ammoType) {
        const ammo = ammoCounts[item.ammoType] ?? 0;
        this.drawAmmoCount(ctx, seg.mid, ammo);
      }
    }
  }

  // ---------------------------------------------------------
  // DRAW ICON
  // ---------------------------------------------------------
  private drawIcon(
    ctx: CanvasRenderingContext2D,
    item: (typeof this.items)[number],
    angle: number
  ) {
    const { cx, cy, rIn, rOut } = this.frame;

    const sprite = item.owned ? item.img : item.imgLocked;
    if (!sprite) return;

    const iconX = cx + Math.cos(angle) * (rIn + (rOut - rIn) * 0.55);
    const iconY = cy + Math.sin(angle) * (rIn + (rOut - rIn) * 0.55);

    ctx.drawImage(sprite, iconX - item.iconW / 2, iconY - item.iconH / 2, item.iconW, item.iconH);
  }

  // ---------------------------------------------------------
  // DRAW AMMO
  // ---------------------------------------------------------
  private drawAmmoCount(ctx: CanvasRenderingContext2D, angle: number, ammo: number) {
    const { cx, cy, rIn, rOut, scale } = this.frame;

    const iconX = cx + Math.cos(angle) * (rIn + (rOut - rIn) * 0.55);
    const iconY = cy + Math.sin(angle) * (rIn + (rOut - rIn) * 0.55);

    const translateX = 25;
    const translateY = 25;
    const textX = iconX + translateX * scale;
    const textY = iconY + translateY * scale;

    const fontSize = 14 * scale;
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = 3 * scale;

    if (ammo > 0) {
      ctx.fillStyle = "#ffe066";
    } else {
      ctx.fillStyle = "#ff5c5c";
    }

    ctx.fillText(String(ammo), textX, textY);

    ctx.shadowBlur = 0;
  }

  // ---------------------------------------------------------
  // CLICK HANDLING
  // ---------------------------------------------------------
  handleClick(x: number, y: number, canvasWidth: number, canvasHeight: number): boolean {
    if (!this.input.isAltKeyHeld()) return false;

    const scale = calculateHudScale(canvasWidth, canvasHeight);
    const cx = canvasWidth * 0.5;
    const cy = canvasHeight * 0.5;

    const rIn = WHEEL.innerRadius * scale;
    const rOut = WHEEL.outerRadius * scale;

    const dx = x - cx;
    const dy = y - cy;
    const dist = dx * dx + dy * dy;

    if (dist < rIn * rIn) return false;
    if (dist > rOut * rOut) return false;

    const angle = (Math.atan2(dy, dx) + Math.PI / 2 + TWO_PI) % TWO_PI;

    const index = (angle / (TWO_PI / this.items.length)) | 0;
    const item = this.items[index];

    if (!item || !item.owned) return true;

    // Find inventory slot for weapon
    const inv = this.getInventory();
    const slot = inv.findIndex((v) => v && v.itemType === item.name);

    if (slot !== -1) {
      this.input.setInventorySlot(slot + 1);
      this.input.setAltKeyHeld(false);
    }

    return true;
  }

  getZIndex() {
    return Z_INDEX.UI + 5;
  }
}
