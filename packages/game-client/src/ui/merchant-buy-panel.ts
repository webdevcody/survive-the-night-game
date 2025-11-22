import { Renderable } from "@/entities/util";
import { GameState } from "@/state";
import { AssetManager } from "@/managers/asset";
import { PlayerClient } from "@/entities/player";
import { Z_INDEX } from "@shared/map";
import { type MerchantShopItem } from "@shared/config";
import { ITEM_CONFIGS } from "@shared/entities/item-configs";
import { weaponRegistry } from "@shared/entities/weapon-registry";
import { resourceRegistry } from "@shared/entities/resource-registry";
import { itemRegistry } from "@shared/entities/item-registry";
import { isWeapon } from "@shared/util/inventory";
import { ClientResourcesBag, ClientInventory } from "@/extensions";
import { formatDisplayName } from "@/util/format";

// --- CONSTANTS & STYLES ---

const SCROLL_SPEED = 1;
const ITEMS_PER_ROW = 3;
const VISIBLE_ROWS = 4;

const THEME = {
  colors: {
    overlay: "rgba(0, 0, 0, 0.75)", // Slightly lighter overlay for better contrast
    panelBgStart: "#0f172a", // Slate-900
    panelBgEnd: "#1e293b",   // Slate-800
    panelBorder: "#334155",  // Slate-700
    headerBg: "rgba(15, 23, 42, 0.9)",
    accent: "#fbbf24",       // Amber-400
    accentHover: "#f59e0b",  // Amber-500
    accentDim: "rgba(251, 191, 36, 0.15)",
    text: "#f8fafc",         // Slate-50
    textDim: "#94a3b8",      // Slate-400
    textGreen: "#4ade80",    // Green-400
    textRed: "#f87171",      // Red-400
    itemBg: "rgba(30, 41, 59, 0.6)",
    itemBgHover: "rgba(51, 65, 85, 0.8)",
    selectionBorder: "#fbbf24",
    activePaneBorder: "#fbbf24",
    inactivePaneBorder: "#334155",
    tabActive: "#fbbf24",
    tabInactive: "#475569",
    buttonGradientStart: "#fbbf24",
    buttonGradientEnd: "#d97706",
    buttonDisabled: "#334155",
  },
  layout: {
    width: 1000,
    height: 700,
    padding: 24, // Increased padding
    gap: 24,
    itemSize: 80,
    headerHeight: 70,
    footerHeight: 140,
    cornerRadius: 16, // Rounded corners
    itemRadius: 8,
  },
  fonts: {
    title: "bold 28px 'Segoe UI', Roboto, sans-serif",
    header: "bold 18px 'Segoe UI', Roboto, sans-serif",
    regular: "15px 'Segoe UI', Roboto, sans-serif",
    small: "13px 'Segoe UI', Roboto, sans-serif",
    price: "bold 15px 'Segoe UI', Roboto, sans-serif",
    button: "bold 22px 'Segoe UI', Roboto, sans-serif",
  },
  shadows: {
    panel: "0 20px 50px rgba(0,0,0,0.5)",
    card: "0 4px 6px rgba(0,0,0,0.1)",
    glow: "0 0 15px rgba(251, 191, 36, 0.4)",
  }
};

type TabType = "ALL" | "WEAPONS" | "AMMO" | "ITEMS";
const TABS: TabType[] = ["ALL", "WEAPONS", "AMMO", "ITEMS"];

type PaneType = "SHOP" | "INVENTORY";

// --- HELPER FUNCTIONS ---

function getItemStats(itemType: string): { label: string; value: string }[] {
  const stats: { label: string; value: string }[] = [];

  const weapon = weaponRegistry.get(itemType);
  if (weapon) {
    stats.push({ label: "Damage", value: weapon.stats.damage?.toString() ?? "-" });
    if (weapon.stats.cooldown) stats.push({ label: "Rate", value: `${(1000 / weapon.stats.cooldown).toFixed(1)}/s` });
    return stats;
  }

  const item = itemRegistry.get(itemType);
  if (item) {
    stats.push({ label: "Type", value: item.category.toUpperCase() });
    if (item.healable) stats.push({ label: "Effect", value: "Heal" });
    return stats;
  }

  return stats;
}

interface DisplayItem {
  itemType: string;
  price: number;
  originalIndex: number;
  isSellable?: boolean;
}

export interface MerchantBuyPanelOptions {
  getPlayer: () => PlayerClient | null;
  onBuy: (merchantId: number, itemIndex: number) => void;
  onSell: (merchantId: number, inventorySlot: number) => void;
  getCanvas: () => HTMLCanvasElement | null;
}

export class MerchantBuyPanel implements Renderable {
  private assetManager: AssetManager;
  private getPlayer: () => PlayerClient | null;
  private onBuy: (merchantId: number, itemIndex: number) => void;
  private onSell: (merchantId: number, inventorySlot: number) => void;
  private getCanvas: () => HTMLCanvasElement | null;

  private activeMerchantId: number | null = null;
  private shopItems: MerchantShopItem[] = [];

  // State
  private activePane: PaneType = "SHOP";
  private currentTab: TabType = "ALL";

  private shopDisplayItems: DisplayItem[] = [];
  private inventoryDisplayItems: DisplayItem[] = [];

  private shopSelectedIndex: number = 0;
  private inventorySelectedIndex: number = 0;

  private shopScrollOffset: number = 0;
  private inventoryScrollOffset: number = 0;

  // Interaction Regions
  private panelBounds: { x: number; y: number; width: number; height: number } | null = null;
  private shopItemRegions: Array<{ x: number; y: number; index: number }> = [];
  private inventoryItemRegions: Array<{ x: number; y: number; index: number }> = [];
  private tabRegions: Array<{ x: number; y: number; width: number; height: number; tab: TabType }> = [];
  private actionButtonRegion: { x: number; y: number; width: number; height: number } | null = null;

  private wheelHandler: ((e: WheelEvent) => void) | null = null;

  public constructor(
    assetManager: AssetManager,
    { getPlayer, onBuy, onSell, getCanvas }: MerchantBuyPanelOptions
  ) {
    this.assetManager = assetManager;
    this.getPlayer = getPlayer;
    this.onBuy = onBuy;
    this.onSell = onSell;
    this.getCanvas = getCanvas;
  }

  public getZIndex(): number {
    return Z_INDEX.UI;
  }

  public open(merchantId: number, shopItems: MerchantShopItem[]): void {
    this.activeMerchantId = merchantId;
    this.shopItems = shopItems;
    this.activePane = "SHOP";
    this.currentTab = "ALL";
    this.refreshItems();
    this.shopSelectedIndex = 0;
    this.inventorySelectedIndex = 0;
    this.shopScrollOffset = 0;
    this.inventoryScrollOffset = 0;
    this.setupWheelHandler();
  }

  public close(): void {
    this.activeMerchantId = null;
    this.shopItems = [];
    this.shopDisplayItems = [];
    this.inventoryDisplayItems = [];
    this.removeWheelHandler();
  }

  public isVisible(): boolean {
    return this.activeMerchantId !== null;
  }

  private refreshItems(): void {
    this.shopDisplayItems = [];
    this.inventoryDisplayItems = [];
    const player = this.getPlayer();

    // Populate Shop Items
    this.shopItems.forEach((item, index) => {
      if (this.matchesTab(item.itemType)) {
        this.shopDisplayItems.push({
          itemType: item.itemType,
          price: item.price,
          originalIndex: index
        });
      }
    });

    // Populate Inventory Items
    if (player) {
      const inventory = player.getExt(ClientInventory);
      if (inventory) {
        const items = inventory.getItems();
        items.forEach((item, slotIndex) => {
          if (item) { // Show all inventory items regardless of tab? Or filter?
            // Let's filter inventory too, makes finding stuff easier
            if (this.matchesTab(item.itemType)) {
              const basePrice = this.getBasePrice(item.itemType);
              const sellPrice = Math.floor(basePrice * 0.5);
              if (sellPrice > 0) {
                this.inventoryDisplayItems.push({
                  itemType: item.itemType,
                  price: sellPrice,
                  originalIndex: slotIndex,
                  isSellable: true
                });
              }
            }
          }
        });
      }
    }

    // Clamp selections
    if (this.shopSelectedIndex >= this.shopDisplayItems.length) this.shopSelectedIndex = Math.max(0, this.shopDisplayItems.length - 1);
    if (this.inventorySelectedIndex >= this.inventoryDisplayItems.length) this.inventorySelectedIndex = Math.max(0, this.inventoryDisplayItems.length - 1);
  }

  private matchesTab(itemType: string): boolean {
    if (this.currentTab === "ALL") return true;
    if (this.currentTab === "WEAPONS") return isWeapon(itemType);
    if (this.currentTab === "AMMO") {
      const conf = itemRegistry.get(itemType);
      return conf?.category === "ammo";
    }
    if (this.currentTab === "ITEMS") {
      const isWep = isWeapon(itemType);
      const conf = itemRegistry.get(itemType);
      return !isWep && conf?.category !== "ammo";
    }
    return false;
  }

  private getBasePrice(itemType: string): number {
    const shopItem = this.shopItems.find(i => i.itemType === itemType);
    if (shopItem) return shopItem.price;
    const weapon = weaponRegistry.get(itemType);
    if (weapon?.merchant?.price) return weapon.merchant.price;
    const item = itemRegistry.get(itemType);
    if (item?.merchant?.price) return item.merchant.price;
    const resource = resourceRegistry.get(itemType);
    if (resource?.merchant?.price) return resource.merchant.price;
    return 0;
  }

  private setupWheelHandler(): void {
    this.removeWheelHandler();
    const canvas = this.getCanvas();
    if (!canvas) return;

    this.wheelHandler = (e: WheelEvent) => {
      if (!this.isVisible()) return;

      const scrollDelta = e.deltaY > 0 ? 1 : -1;

      if (this.activePane === "SHOP") {
        const maxScroll = Math.max(0, Math.ceil(this.shopDisplayItems.length / ITEMS_PER_ROW) - VISIBLE_ROWS);
        this.shopScrollOffset = Math.max(0, Math.min(maxScroll, this.shopScrollOffset + scrollDelta));
      } else {
        const maxScroll = Math.max(0, Math.ceil(this.inventoryDisplayItems.length / ITEMS_PER_ROW) - VISIBLE_ROWS);
        this.inventoryScrollOffset = Math.max(0, Math.min(maxScroll, this.inventoryScrollOffset + scrollDelta));
      }
    };

    canvas.addEventListener("wheel", this.wheelHandler, { passive: false });
  }

  private removeWheelHandler(): void {
    if (this.wheelHandler) {
      const canvas = this.getCanvas();
      if (canvas) canvas.removeEventListener("wheel", this.wheelHandler);
      this.wheelHandler = null;
    }
  }

  public handleKeyDown(key: string): void {
    if (!this.isVisible()) return;

    if (key === "Escape" || key === "e" || key === "E") {
      this.close();
      return;
    }

    if (key === "Enter" || key === " " || key === "Space") {
      this.executeTransaction();
      return;
    }

    if (key === "Tab") {
      const currentIdx = TABS.indexOf(this.currentTab);
      this.currentTab = TABS[(currentIdx + 1) % TABS.length];
      this.refreshItems();
      return;
    }

    const isShop = this.activePane === "SHOP";
    const items = isShop ? this.shopDisplayItems : this.inventoryDisplayItems;
    let index = isShop ? this.shopSelectedIndex : this.inventorySelectedIndex;
    const rowCount = Math.ceil(items.length / ITEMS_PER_ROW);

    if (key === "ArrowUp" || key === "w" || key === "W") {
      if (index >= ITEMS_PER_ROW) index -= ITEMS_PER_ROW;
    } else if (key === "ArrowDown" || key === "s" || key === "S") {
      if (index + ITEMS_PER_ROW < items.length) index += ITEMS_PER_ROW;
    } else if (key === "ArrowLeft" || key === "a" || key === "A") {
      if (index % ITEMS_PER_ROW > 0) index--;
      else if (this.activePane === "INVENTORY") {
        // Cross pane navigation
        this.activePane = "SHOP";
        return;
      }
    } else if (key === "ArrowRight" || key === "d" || key === "D") {
      if (index % ITEMS_PER_ROW < ITEMS_PER_ROW - 1 && index < items.length - 1) index++;
      else if (this.activePane === "SHOP") {
        // Cross pane navigation
        this.activePane = "INVENTORY";
        return;
      }
    }

    if (isShop) {
      this.shopSelectedIndex = index;
      this.ensureVisible("SHOP");
    } else {
      this.inventorySelectedIndex = index;
      this.ensureVisible("INVENTORY");
    }
  }

  private ensureVisible(pane: PaneType): void {
    const index = pane === "SHOP" ? this.shopSelectedIndex : this.inventorySelectedIndex;
    const offset = pane === "SHOP" ? this.shopScrollOffset : this.inventoryScrollOffset;
    const row = Math.floor(index / ITEMS_PER_ROW);

    let newOffset = offset;
    if (row < offset) newOffset = row;
    else if (row >= offset + VISIBLE_ROWS) newOffset = row - VISIBLE_ROWS + 1;

    if (pane === "SHOP") this.shopScrollOffset = newOffset;
    else this.inventoryScrollOffset = newOffset;
  }

  public handleClick(x: number, y: number): boolean {
    if (!this.isVisible() || !this.panelBounds) return false;

    // Check Action Button
    if (this.actionButtonRegion && x >= this.actionButtonRegion.x && x <= this.actionButtonRegion.x + this.actionButtonRegion.width && y >= this.actionButtonRegion.y && y <= this.actionButtonRegion.y + this.actionButtonRegion.height) {
      this.executeTransaction();
      return true;
    }

    // Check Tabs
    for (const region of this.tabRegions) {
      if (x >= region.x && x <= region.x + region.width && y >= region.y && y <= region.y + region.height) {
        this.currentTab = region.tab;
        this.refreshItems();
        return true;
      }
    }

    const { itemSize } = THEME.layout;

    // Check Shop Items
    for (const region of this.shopItemRegions) {
      if (x >= region.x && x <= region.x + itemSize && y >= region.y && y <= region.y + itemSize) {
        this.activePane = "SHOP";
        this.shopSelectedIndex = region.index;
        return true;
      }
    }

    // Check Inventory Items
    for (const region of this.inventoryItemRegions) {
      if (x >= region.x && x <= region.x + itemSize && y >= region.y && y <= region.y + itemSize) {
        this.activePane = "INVENTORY";
        this.inventorySelectedIndex = region.index;
        return true;
      }
    }

    // If clicking main panel background, maybe just switch active pane based on X coord?
    // Simple check: left half vs right half
    if (x >= this.panelBounds.x && x <= this.panelBounds.x + this.panelBounds.width / 2) {
      this.activePane = "SHOP";
    } else if (x > this.panelBounds.x + this.panelBounds.width / 2 && x <= this.panelBounds.x + this.panelBounds.width) {
      this.activePane = "INVENTORY";
    }

    return false;
  }

  private executeTransaction(): void {
    if (!this.activeMerchantId) return;

    const player = this.getPlayer();
    if (!player) return;

    if (this.activePane === "SHOP") {
      const item = this.shopDisplayItems[this.shopSelectedIndex];
      if (item) {
        if (player.hasExt(ClientResourcesBag)) {
          const coins = player.getExt(ClientResourcesBag).getCoins();
          if (coins >= item.price) {
            this.onBuy(this.activeMerchantId, item.originalIndex);
          }
        }
      }
    } else {
      const item = this.inventoryDisplayItems[this.inventorySelectedIndex];
      if (item) {
        this.onSell(this.activeMerchantId, item.originalIndex);
        // For sell mode, we should refresh immediately to show empty slot, but best to wait for server update loop in render
      }
    }
  }

  private getItemIconInfo(itemType: string): { image: HTMLImageElement; x: number; y: number; w: number; h: number } | null {
    const weapon = weaponRegistry.get(itemType);
    if (weapon) {
      const img = this.assetManager.getSheet(weapon.assets.sheet || "default");
      if (img) return { image: img, x: weapon.assets.spritePositions.down.x, y: weapon.assets.spritePositions.down.y, w: 16, h: 16 };
    }
    const item = itemRegistry.get(itemType);
    if (item) {
      const img = this.assetManager.getSheet(item.assets.sheet || "items");
      if (img) return { image: img, x: item.assets.x, y: item.assets.y, w: 16, h: 16 };
    }
    const res = resourceRegistry.get(itemType);
    if (res) {
      const img = this.assetManager.getSheet(res.assets.sheet || "items");
      if (img) return { image: img, x: res.assets.x, y: res.assets.y, w: 16, h: 16 };
    }
    return null;
  }

  private fillRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
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
    ctx.fill();
  }

  private strokeRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
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
    ctx.stroke();
  }

  public render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    if (!this.isVisible()) return;

    // Always refresh inventory on render to catch server updates
    this.refreshItems();

    const player = this.getPlayer();
    const playerCoins = player && player.hasExt(ClientResourcesBag) ? player.getExt(ClientResourcesBag).getCoins() : 0;

    const { width, height, padding, gap, itemSize, headerHeight, footerHeight, cornerRadius } = THEME.layout;
    const centerX = ctx.canvas.width / 2;
    const centerY = ctx.canvas.height / 2;
    const startX = centerX - width / 2;
    const startY = centerY - height / 2;

    this.panelBounds = { x: startX, y: startY, width, height };
    this.shopItemRegions = [];
    this.inventoryItemRegions = [];
    this.tabRegions = [];
    this.actionButtonRegion = null;

    // Overlay
    ctx.fillStyle = THEME.colors.overlay;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Main Panel Shadow
    ctx.save();
    ctx.shadowColor = THEME.shadows.panel;
    ctx.shadowBlur = 40;
    ctx.shadowOffsetY = 20;

    // Main Panel Background Gradient
    const bgGradient = ctx.createLinearGradient(startX, startY, startX, startY + height);
    bgGradient.addColorStop(0, THEME.colors.panelBgStart);
    bgGradient.addColorStop(1, THEME.colors.panelBgEnd);
    ctx.fillStyle = bgGradient;
    
    this.fillRoundedRect(ctx, startX, startY, width, height, cornerRadius);
    ctx.restore(); // Clear shadow

    // Border
    ctx.strokeStyle = THEME.colors.panelBorder;
    ctx.lineWidth = 1;
    this.strokeRoundedRect(ctx, startX, startY, width, height, cornerRadius);

    // Header Area (visually distinct via drawing, though technically same bg)
    ctx.fillStyle = THEME.colors.headerBg;
    // Clip top rounded corners for header
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(startX + cornerRadius, startY);
    ctx.lineTo(startX + width - cornerRadius, startY);
    ctx.quadraticCurveTo(startX + width, startY, startX + width, startY + cornerRadius);
    ctx.lineTo(startX + width, startY + headerHeight);
    ctx.lineTo(startX, startY + headerHeight);
    ctx.lineTo(startX, startY + cornerRadius);
    ctx.quadraticCurveTo(startX, startY, startX + cornerRadius, startY);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Separator Line
    ctx.beginPath();
    ctx.moveTo(startX, startY + headerHeight);
    ctx.lineTo(startX + width, startY + headerHeight);
    ctx.strokeStyle = THEME.colors.panelBorder;
    ctx.stroke();

    // Title
    ctx.fillStyle = THEME.colors.accent;
    ctx.font = THEME.fonts.title;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText("MERCHANT EXCHANGE", startX + padding, startY + headerHeight / 2);

    // Tabs (Center Top)
    const tabW = 110;
    const tabH = 36;
    const tabStartX = startX + width / 2 - (TABS.length * tabW) / 2;
    const tabY = startY + (headerHeight - tabH) / 2;

    TABS.forEach((tab, i) => {
      const x = tabStartX + i * tabW;
      const active = this.currentTab === tab;

      // Tab Background
      if (active) {
        ctx.fillStyle = THEME.colors.tabActive;
        this.fillRoundedRect(ctx, x, tabY, tabW, tabH, 6);
      } else {
         // Subtle hover or inactive state could go here
      }

      ctx.fillStyle = active ? "#0f172a" : THEME.colors.textDim;
      ctx.font = active ? "bold 13px 'Segoe UI'" : "13px 'Segoe UI'";
      ctx.textAlign = "center";
      ctx.fillText(tab, x + tabW / 2, tabY + tabH / 2 + 1);

      this.tabRegions.push({ x, y: tabY, width: tabW, height: tabH, tab });
    });

    // Coins (Right Top)
    ctx.textAlign = "right";
    ctx.fillStyle = THEME.colors.accent;
    ctx.font = THEME.fonts.header;
    ctx.fillText(`${playerCoins.toLocaleString()} Coins`, startX + width - padding, startY + headerHeight / 2);

    // Content Area
    const contentY = startY + headerHeight + gap;
    const contentH = height - headerHeight - footerHeight - gap * 2;
    const paneWidth = (width - padding * 2 - gap) / 2;

    // Left Pane (Shop)
    this.renderPane(
      ctx,
      "MERCHANT STOCK",
      this.shopDisplayItems,
      this.activePane === "SHOP",
      this.shopSelectedIndex,
      this.shopScrollOffset,
      startX + padding,
      contentY,
      paneWidth,
      contentH,
      "SHOP",
      playerCoins
    );

    // Right Pane (Inventory)
    this.renderPane(
      ctx,
      "YOUR INVENTORY",
      this.inventoryDisplayItems,
      this.activePane === "INVENTORY",
      this.inventorySelectedIndex,
      this.inventoryScrollOffset,
      startX + padding + paneWidth + gap,
      contentY,
      paneWidth,
      contentH,
      "INVENTORY",
      playerCoins
    );

    // Footer / Details
    const footerY = startY + height - footerHeight;
    this.renderFooter(ctx, startX, footerY, width, footerHeight, playerCoins);
  }

  private renderPane(
    ctx: CanvasRenderingContext2D,
    title: string,
    items: DisplayItem[],
    isActive: boolean,
    selectedIndex: number,
    scrollOffset: number,
    x: number,
    y: number,
    w: number,
    h: number,
    type: PaneType,
    playerCoins: number
  ): void {
    const { itemSize, gap, itemRadius } = THEME.layout;

    // Pane Header
    ctx.fillStyle = isActive ? THEME.colors.text : THEME.colors.textDim;
    ctx.font = THEME.fonts.header;
    ctx.textAlign = "left";
    ctx.fillText(title, x, y - 10);

    // Pane Background (Rounded)
    ctx.fillStyle = "rgba(15, 23, 42, 0.3)"; // Subtle darker bg for pane area
    this.fillRoundedRect(ctx, x, y, w, h, 8);
    
    ctx.strokeStyle = isActive ? THEME.colors.activePaneBorder : THEME.colors.inactivePaneBorder;
    ctx.lineWidth = isActive ? 2 : 1;
    this.strokeRoundedRect(ctx, x, y, w, h, 8);

    // Grid Clip
    ctx.save();
    ctx.beginPath();
    ctx.rect(x + gap, y + gap, w - gap * 2, h - gap * 2);
    ctx.clip();

    const startRow = scrollOffset;
    const endRow = startRow + VISIBLE_ROWS + 1;

    for (let i = 0; i < items.length; i++) {
      const row = Math.floor(i / ITEMS_PER_ROW);
      if (row < startRow || row >= endRow) continue;

      const col = i % ITEMS_PER_ROW;
      const itemX = x + gap + col * (itemSize + gap);
      const itemY = y + gap + (row - startRow) * (itemSize + gap);

      const item = items[i];
      const isSelected = i === selectedIndex && isActive;
      const canAfford = type === "SHOP" ? playerCoins >= item.price : true;

      // Shadow/Glow for selected
      if (isSelected) {
        ctx.shadowColor = THEME.colors.selectionBorder;
        ctx.shadowBlur = 10;
      }

      // Item Background
      ctx.fillStyle = isSelected ? THEME.colors.itemBgHover : THEME.colors.itemBg;
      this.fillRoundedRect(ctx, itemX, itemY, itemSize, itemSize, itemRadius);
      
      ctx.shadowBlur = 0; // Reset shadow

      // Border
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.strokeStyle = isSelected ? THEME.colors.selectionBorder : THEME.colors.panelBorder;
      this.strokeRoundedRect(ctx, itemX, itemY, itemSize, itemSize, itemRadius);

      // Icon
      const icon = this.getItemIconInfo(item.itemType);
      if (icon) {
        const size = 48;
        ctx.drawImage(icon.image, icon.x, icon.y, icon.w, icon.h, itemX + (itemSize - size) / 2, itemY + 10, size, size);
      }

      // Price Tag
      ctx.fillStyle = (type === "SHOP" && !canAfford) ? THEME.colors.textRed : (type === "INVENTORY" ? THEME.colors.textGreen : THEME.colors.accent);
      ctx.font = THEME.fonts.price;
      ctx.textAlign = "center";
      ctx.fillText(`${item.price}`, itemX + itemSize / 2, itemY + itemSize - 10);

      // Register click region
      if (type === "SHOP") this.shopItemRegions.push({ x: itemX, y: itemY, index: i });
      else this.inventoryItemRegions.push({ x: itemX, y: itemY, index: i });
    }
    ctx.restore();

    // Scrollbar logic
    if (items.length > ITEMS_PER_ROW * VISIBLE_ROWS) {
      const barW = 6;
      const barX = x + w - barW - 6;
      const barY = y + 6;
      const barH = h - 12;

      const totalRows = Math.ceil(items.length / ITEMS_PER_ROW);
      const thumbH = Math.max(30, (VISIBLE_ROWS / totalRows) * barH);
      const thumbY = barY + (scrollOffset / totalRows) * barH;

      ctx.fillStyle = "#334155";
      this.fillRoundedRect(ctx, barX, barY, barW, barH, 3);
      
      ctx.fillStyle = THEME.colors.accent;
      this.fillRoundedRect(ctx, barX, thumbY, barW, thumbH, 3);
    }
  }

  private renderFooter(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, playerCoins: number): void {
    const activeItem = this.activePane === "SHOP"
      ? this.shopDisplayItems[this.shopSelectedIndex]
      : this.inventoryDisplayItems[this.inventorySelectedIndex];

    // Separator
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y);
    ctx.strokeStyle = THEME.colors.panelBorder;
    ctx.stroke();

    if (!activeItem) return;

    const padding = 24;
    const iconSize = 96;

    // Selected Item Icon
    const icon = this.getItemIconInfo(activeItem.itemType);
    if (icon) {
      const iconX = x + padding;
      const iconY = y + (h - iconSize) / 2;

      // Glow backing
      const g = ctx.createRadialGradient(iconX + iconSize / 2, iconY + iconSize / 2, 10, iconX + iconSize / 2, iconY + iconSize / 2, 70);
      g.addColorStop(0, THEME.colors.accentDim);
      g.addColorStop(1, "transparent");
      ctx.fillStyle = g;
      ctx.fillRect(iconX - 20, iconY - 20, iconSize + 40, iconSize + 40);

      ctx.drawImage(icon.image, icon.x, icon.y, icon.w, icon.h, iconX, iconY, iconSize, iconSize);
    }

    // Info Text
    const textX = x + padding + iconSize + 30;
    
    ctx.fillStyle = THEME.colors.text;
    ctx.font = THEME.fonts.title;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(formatDisplayName(activeItem.itemType), textX, y + 24);

    // Stats
    const stats = getItemStats(activeItem.itemType);
    let statX = textX;
    let statY = y + 70;
    ctx.font = THEME.fonts.regular;

    stats.forEach((stat, i) => {
      const labelW = ctx.measureText(stat.label + ": ").width;
      ctx.fillStyle = THEME.colors.textDim;
      ctx.fillText(`${stat.label}:`, statX, statY);
      
      ctx.fillStyle = THEME.colors.text;
      ctx.fillText(stat.value, statX + labelW, statY);
      
      statX += labelW + ctx.measureText(stat.value).width + 40; // Spacing
    });

    // Action Button
    const btnW = 240;
    const btnH = 64;
    const btnX = x + w - padding - btnW;
    const btnY = y + (h - btnH) / 2;

    const isBuy = this.activePane === "SHOP";
    const canAfford = isBuy ? playerCoins >= activeItem.price : true;

    // Button Shadow
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.3)";
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 4;

    // Button Gradient
    if (isBuy) {
        if (canAfford) {
            const btnGrad = ctx.createLinearGradient(btnX, btnY, btnX, btnY + btnH);
            btnGrad.addColorStop(0, THEME.colors.buttonGradientStart);
            btnGrad.addColorStop(1, THEME.colors.buttonGradientEnd);
            ctx.fillStyle = btnGrad;
        } else {
            ctx.fillStyle = THEME.colors.buttonDisabled;
        }
    } else {
        const btnGrad = ctx.createLinearGradient(btnX, btnY, btnX, btnY + btnH);
        btnGrad.addColorStop(0, "#4ade80");
        btnGrad.addColorStop(1, "#16a34a");
        ctx.fillStyle = btnGrad;
    }

    this.fillRoundedRect(ctx, btnX, btnY, btnW, btnH, 12);
    ctx.restore(); // restore shadow

    // Button Text
    ctx.fillStyle = isBuy ? (canAfford ? "#0f172a" : "#94a3b8") : "#064e3b";
    ctx.font = THEME.fonts.button;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    let actionText = isBuy ? "BUY" : "SELL";
    if (isBuy && !canAfford) actionText = "NO FUNDS";

    ctx.fillText(actionText, btnX + btnW / 2, btnY + btnH / 2 - 12);
    ctx.font = "bold 16px 'Segoe UI'";
    ctx.fillText(`${activeItem.price} Coins`, btnX + btnW / 2, btnY + btnH / 2 + 14);

    this.actionButtonRegion = { x: btnX, y: btnY, width: btnW, height: btnH };
  }
}
