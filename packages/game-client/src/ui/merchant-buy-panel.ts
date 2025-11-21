import { Renderable } from "@/entities/util";
import { GameState } from "@/state";
import { AssetManager } from "@/managers/asset";
import { PlayerClient } from "@/entities/player";
import { Z_INDEX } from "@shared/map";
import { getConfig, type MerchantShopItem } from "@shared/config";
import { ITEM_CONFIGS } from "@shared/entities/item-configs";
import { weaponRegistry } from "@shared/entities/weapon-registry";
import { resourceRegistry } from "@shared/entities/resource-registry";
import { itemRegistry } from "@shared/entities/item-registry";
import { isWeapon } from "@shared/util/inventory";
import { ClientResourcesBag } from "@/extensions";
import { formatDisplayName } from "@/util/format";

const SCROLL_SPEED = 0.1;

interface GroupedShopItems {
  items: MerchantShopItem[];
  weapons: MerchantShopItem[];
  ammo: MerchantShopItem[];
}

const MERCHANT_BUY_PANEL_SETTINGS = {
  Container: {
    background: "rgba(0, 0, 0, 0.95)",
    padding: 30,
    borderWidth: 4,
    borderColor: "rgba(255, 215, 0, 0.8)",
    maxHeight: 600,
    width: 900,
  },
  Title: {
    fontSize: 28,
    color: "rgba(255, 215, 0, 1)",
    text: "MERCHANT SHOP",
    marginBottom: 20,
  },
  Instructions: {
    fontSize: 14,
    color: "rgba(200, 200, 200, 0.9)",
    text: "Use WASD/Arrow keys to navigate, Space/Enter to buy, [E] or [Esc] to close",
    marginTop: 12,
  },
  ScrollArea: {
    padding: 15,
    itemSpacing: 10,
  },
  Section: {
    labelFontSize: 18,
    labelColor: "rgba(255, 215, 0, 0.9)",
    labelMarginBottom: 8,
    ruleColor: "rgba(255, 215, 0, 0.5)",
    ruleHeight: 2,
    ruleMarginBottom: 12,
    marginBottom: 25, // Margin after each section
  },
  Item: {
    width: 140,
    height: 100,
    gap: 12,
    padding: 10,
    background: "rgba(30, 30, 30, 0.95)",
    borderWidth: 2,
    borderColor: "rgba(100, 100, 100, 0.8)",
    selected: {
      borderColor: "#22c55e",
      background: "rgba(34, 197, 94, 0.2)",
      borderWidth: 3,
    },
    cantAfford: {
      borderColor: "#dc2626",
      background: "rgba(60, 20, 20, 0.8)",
    },
    cantAffordUnselected: {
      borderColor: "rgba(220, 38, 38, 0.5)",
      background: "rgba(60, 20, 20, 0.5)",
    },
    itemsPerRow: 5,
  },
  ItemIcon: {
    size: 40,
  },
  ItemText: {
    nameSize: 13,
    priceSize: 15,
    color: "rgba(255, 255, 255, 0.95)",
    priceColor: "#f59e0b",
  },
  CoinIcon: {
    size: 16,
  },
};

export interface MerchantBuyPanelOptions {
  getPlayer: () => PlayerClient | null;
  onBuy: (merchantId: number, itemIndex: number) => void;
  getCanvas: () => HTMLCanvasElement | null;
}

export class MerchantBuyPanel implements Renderable {
  private assetManager: AssetManager;
  private getPlayer: () => PlayerClient | null;
  private onBuy: (merchantId: number, itemIndex: number) => void;
  private getCanvas: () => HTMLCanvasElement | null;
  private activeMerchantId: number | null = null;
  private shopItems: MerchantShopItem[] = [];
  private groupedItems: GroupedShopItems = { items: [], weapons: [], ammo: [] };
  private flatItemList: MerchantShopItem[] = []; // Flat list for navigation
  private selectedIndex: number = 0;
  private scrollOffset: number = 0;
  private panelBounds: { x: number; y: number; width: number; height: number } | null = null;
  private wheelHandler: ((e: WheelEvent) => void) | null = null;
  private itemBounds: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    index: number;
  }> = [];

  public constructor(
    assetManager: AssetManager,
    { getPlayer, onBuy, getCanvas }: MerchantBuyPanelOptions
  ) {
    this.assetManager = assetManager;
    this.getPlayer = getPlayer;
    this.onBuy = onBuy;
    this.getCanvas = getCanvas;
  }

  public getZIndex(): number {
    return Z_INDEX.UI;
  }

  public open(merchantId: number, shopItems: MerchantShopItem[]): void {
    this.activeMerchantId = merchantId;
    this.shopItems = shopItems;
    this.groupItems();
    this.selectedIndex = 0;
    this.scrollOffset = 0;
    this.setupWheelHandler();
  }

  public close(): void {
    this.activeMerchantId = null;
    this.shopItems = [];
    this.groupedItems = { items: [], weapons: [], ammo: [] };
    this.flatItemList = [];
    this.selectedIndex = 0;
    this.scrollOffset = 0;
    this.panelBounds = null;
    this.removeWheelHandler();
  }

  public isVisible(): boolean {
    return this.activeMerchantId !== null;
  }

  private setupWheelHandler(): void {
    this.removeWheelHandler(); // Remove any existing handler

    const canvas = this.getCanvas();
    if (!canvas) return;

    this.wheelHandler = (e: WheelEvent) => {
      if (!this.isVisible()) return;

      // Get mouse position relative to canvas
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const mouseX = (e.clientX - rect.left) * scaleX;
      const mouseY = (e.clientY - rect.top) * scaleY;

      // Check if mouse is inside panel bounds
      if (
        this.panelBounds &&
        mouseX >= this.panelBounds.x &&
        mouseX <= this.panelBounds.x + this.panelBounds.width &&
        mouseY >= this.panelBounds.y &&
        mouseY <= this.panelBounds.y + this.panelBounds.height
      ) {
        e.preventDefault();

        // Scroll based on wheel delta
        const scrollDelta = e.deltaY > 0 ? SCROLL_SPEED : -SCROLL_SPEED;
        const itemRowHeight =
          MERCHANT_BUY_PANEL_SETTINGS.Item.height + MERCHANT_BUY_PANEL_SETTINGS.Item.gap;
        const totalContentHeight = this.getTotalContentHeight();
        const visibleHeight = this.getVisibleRows() * itemRowHeight;
        const maxScrollRows = Math.max(
          0,
          Math.ceil((totalContentHeight - visibleHeight) / itemRowHeight)
        );
        this.scrollOffset = Math.max(0, Math.min(maxScrollRows, this.scrollOffset + scrollDelta));
      }
    };

    canvas.addEventListener("wheel", this.wheelHandler, { passive: false });
  }

  private removeWheelHandler(): void {
    if (this.wheelHandler) {
      const canvas = this.getCanvas();
      if (canvas) {
        canvas.removeEventListener("wheel", this.wheelHandler);
      }
      this.wheelHandler = null;
    }
  }

  private getVisibleRows(): number {
    const { Container, Title, Instructions } = MERCHANT_BUY_PANEL_SETTINGS;
    const itemRowHeight =
      MERCHANT_BUY_PANEL_SETTINGS.Item.height + MERCHANT_BUY_PANEL_SETTINGS.Item.gap;
    return Math.floor(
      (Container.maxHeight -
        Container.padding * 2 -
        Title.fontSize -
        Title.marginBottom -
        Instructions.fontSize -
        Instructions.marginTop) /
        itemRowHeight
    );
  }

  private getTotalContentHeight(): number {
    const itemsPerRow = MERCHANT_BUY_PANEL_SETTINGS.Item.itemsPerRow;
    const itemRowHeight =
      MERCHANT_BUY_PANEL_SETTINGS.Item.height + MERCHANT_BUY_PANEL_SETTINGS.Item.gap;
    const sectionHeaderHeight =
      MERCHANT_BUY_PANEL_SETTINGS.Section.labelFontSize +
      MERCHANT_BUY_PANEL_SETTINGS.Section.labelMarginBottom +
      MERCHANT_BUY_PANEL_SETTINGS.Section.ruleHeight +
      MERCHANT_BUY_PANEL_SETTINGS.Section.ruleMarginBottom +
      MERCHANT_BUY_PANEL_SETTINGS.Section.marginBottom;

    let totalHeight = 0;

    // Add height for each section that has items
    if (this.groupedItems.items.length > 0) {
      totalHeight +=
        sectionHeaderHeight +
        Math.ceil(this.groupedItems.items.length / itemsPerRow) * itemRowHeight;
    }
    if (this.groupedItems.weapons.length > 0) {
      totalHeight +=
        sectionHeaderHeight +
        Math.ceil(this.groupedItems.weapons.length / itemsPerRow) * itemRowHeight;
    }
    if (this.groupedItems.ammo.length > 0) {
      totalHeight +=
        sectionHeaderHeight +
        Math.ceil(this.groupedItems.ammo.length / itemsPerRow) * itemRowHeight;
    }

    return totalHeight;
  }

  private groupItems(): void {
    const grouped: GroupedShopItems = { items: [], weapons: [], ammo: [] };

    this.shopItems.forEach((item) => {
      // Check if it's a weapon
      if (isWeapon(item.itemType)) {
        grouped.weapons.push(item);
      } else {
        // Check if it's ammo
        const itemConfig = itemRegistry.get(item.itemType);
        if (itemConfig?.category === "ammo") {
          grouped.ammo.push(item);
        } else {
          // Regular item
          grouped.items.push(item);
        }
      }
    });

    this.groupedItems = grouped;
    // Construct flat list in the same order as rendering: Items -> Weapons -> Ammo
    this.flatItemList = [...grouped.items, ...grouped.weapons, ...grouped.ammo];
  }

  public handleKeyDown(key: string): void {
    if (!this.isVisible()) return;

    if (key === "Escape" || key === "e" || key === "E") {
      this.close();
      return;
    }

    if (key === "Enter" || key === " " || key === "Space") {
      this.buySelected();
      return;
    }

    const itemsPerRow = MERCHANT_BUY_PANEL_SETTINGS.Item.itemsPerRow;

    // WASD and Arrow key navigation
    if (key === "ArrowUp" || key === "w" || key === "W") {
      this.selectedIndex = Math.max(0, this.selectedIndex - itemsPerRow);
      this.ensureSelectedVisible();
      return;
    }

    if (key === "ArrowDown" || key === "s" || key === "S") {
      this.selectedIndex = Math.min(this.flatItemList.length - 1, this.selectedIndex + itemsPerRow);
      this.ensureSelectedVisible();
      return;
    }

    if (key === "ArrowLeft" || key === "a" || key === "A") {
      this.selectedIndex = Math.max(0, this.selectedIndex - 1);
      this.ensureSelectedVisible();
      return;
    }

    if (key === "ArrowRight" || key === "d" || key === "D") {
      this.selectedIndex = Math.min(this.flatItemList.length - 1, this.selectedIndex + 1);
      this.ensureSelectedVisible();
      return;
    }

    // Number keys 1-9
    const num = parseInt(key);
    if (!isNaN(num) && num >= 1 && num <= 9) {
      const index = num - 1;
      if (index < this.flatItemList.length) {
        this.selectedIndex = index;
        this.ensureSelectedVisible();
        this.buySelected();
      }
    }
  }

  private getVisualRowForIndex(index: number): number {
    // Calculate the actual visual row position accounting for section headers
    // This must match exactly how rendering calculates positions
    const itemsPerRow = MERCHANT_BUY_PANEL_SETTINGS.Item.itemsPerRow;
    const itemRowHeight =
      MERCHANT_BUY_PANEL_SETTINGS.Item.height + MERCHANT_BUY_PANEL_SETTINGS.Item.gap;
    const sectionHeaderHeight =
      MERCHANT_BUY_PANEL_SETTINGS.Section.labelFontSize +
      MERCHANT_BUY_PANEL_SETTINGS.Section.labelMarginBottom +
      MERCHANT_BUY_PANEL_SETTINGS.Section.ruleHeight +
      MERCHANT_BUY_PANEL_SETTINGS.Section.ruleMarginBottom +
      MERCHANT_BUY_PANEL_SETTINGS.Section.marginBottom;

    // Convert heights to equivalent row height units
    const sectionHeaderRows = sectionHeaderHeight / itemRowHeight;
    const sectionMarginBottomRows =
      MERCHANT_BUY_PANEL_SETTINGS.Section.marginBottom / itemRowHeight;

    let visualRow = 0;
    let currentIndex = 0;

    // Process Items section
    if (this.groupedItems.items.length > 0) {
      const itemRows = Math.ceil(this.groupedItems.items.length / itemsPerRow);
      if (index < currentIndex + this.groupedItems.items.length) {
        // Selected item is in Items section
        const sectionItemIndex = index - currentIndex;
        const itemRow = Math.floor(sectionItemIndex / itemsPerRow);
        return visualRow + sectionHeaderRows + itemRow;
      }
      // Add full section height: header + items + marginBottom (matches rendering logic)
      visualRow += sectionHeaderRows + itemRows + sectionMarginBottomRows;
      currentIndex += this.groupedItems.items.length;
    }

    // Process Weapons section
    if (this.groupedItems.weapons.length > 0) {
      const itemRows = Math.ceil(this.groupedItems.weapons.length / itemsPerRow);
      if (index < currentIndex + this.groupedItems.weapons.length) {
        // Selected item is in Weapons section
        const sectionItemIndex = index - currentIndex;
        const itemRow = Math.floor(sectionItemIndex / itemsPerRow);
        return visualRow + sectionHeaderRows + itemRow;
      }
      // Add full section height: header + items + marginBottom (matches rendering logic)
      visualRow += sectionHeaderRows + itemRows + sectionMarginBottomRows;
      currentIndex += this.groupedItems.weapons.length;
    }

    // Process Ammo section
    if (this.groupedItems.ammo.length > 0) {
      const itemRows = Math.ceil(this.groupedItems.ammo.length / itemsPerRow);
      if (index < currentIndex + this.groupedItems.ammo.length) {
        // Selected item is in Ammo section
        const sectionItemIndex = index - currentIndex;
        const itemRow = Math.floor(sectionItemIndex / itemsPerRow);
        return visualRow + sectionHeaderRows + itemRow;
      }
      // Add full section height: header + items + marginBottom (matches rendering logic)
      visualRow += sectionHeaderRows + itemRows + sectionMarginBottomRows;
    }

    return visualRow;
  }

  private ensureSelectedVisible(): void {
    // Calculate the actual visual row position accounting for section headers
    const selectedVisualRow = this.getVisualRowForIndex(this.selectedIndex);
    const visibleRows = this.getVisibleRows();

    // If selected item is in the first row or very close to the top, scroll all the way to top
    const itemsPerRow = MERCHANT_BUY_PANEL_SETTINGS.Item.itemsPerRow;
    const firstRowItems = Math.min(itemsPerRow, this.flatItemList.length);
    const isFirstRow = this.selectedIndex < firstRowItems;

    if (isFirstRow) {
      // Scroll all the way to the top when selecting items in the first row
      this.scrollOffset = 0;
    } else if (selectedVisualRow < this.scrollOffset) {
      // Scroll up to show selected item
      this.scrollOffset = selectedVisualRow;
    } else if (selectedVisualRow >= this.scrollOffset + visibleRows) {
      // Scroll down to show selected item
      this.scrollOffset = selectedVisualRow - visibleRows + 1;
    }
  }

  public buySelected(): void {
    if (
      this.activeMerchantId &&
      this.selectedIndex >= 0 &&
      this.selectedIndex < this.flatItemList.length
    ) {
      const player = this.getPlayer();
      const item = this.flatItemList[this.selectedIndex];
      if (player && player.hasExt(ClientResourcesBag)) {
        const coins = player.getExt(ClientResourcesBag).getCoins();
        if (coins >= item.price) {
          // Find the original index in shopItems
          const originalIndex = this.shopItems.findIndex(
            (si) => si.itemType === item.itemType && si.price === item.price
          );
          if (originalIndex >= 0) {
            this.onBuy(this.activeMerchantId, originalIndex);
            this.close();
          }
        }
      }
    }
  }

  private getItemIconInfo(itemType: string): {
    image: HTMLImageElement | null;
    x: number;
    y: number;
    width: number;
    height: number;
    sheet: string;
  } | null {
    // Check if it's a weapon
    const weaponConfig = weaponRegistry.get(itemType);
    if (weaponConfig) {
      // Weapons use sprite sheets, so we need to get the sheet image
      const sheet = weaponConfig.assets.sheet || "default";
      const sheetImage = this.assetManager.getSheet(sheet);
      if (sheetImage) {
        // Use the "down" sprite position for the icon
        const spritePos = weaponConfig.assets.spritePositions.down;
        return {
          image: sheetImage,
          x: spritePos.x,
          y: spritePos.y,
          width: 16,
          height: 16,
          sheet: sheet,
        };
      }
    }

    // Check if it's a resource
    const resourceConfig = resourceRegistry.get(itemType);
    if (resourceConfig) {
      const sheet = resourceConfig.assets.sheet || "items";
      const sheetImage = this.assetManager.getSheet(sheet);
      if (sheetImage) {
        return {
          image: sheetImage,
          x: resourceConfig.assets.x,
          y: resourceConfig.assets.y,
          width: 16,
          height: 16,
          sheet: sheet,
        };
      }
    }

    // Check if it's a regular item
    const itemConfig = itemRegistry.get(itemType);
    if (itemConfig) {
      const sheet = itemConfig.assets.sheet || "items";
      const sheetImage = this.assetManager.getSheet(sheet);
      if (sheetImage) {
        return {
          image: sheetImage,
          x: itemConfig.assets.x,
          y: itemConfig.assets.y,
          width: 16,
          height: 16,
          sheet: sheet,
        };
      }
    }

    return null;
  }

  private renderSection(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    label: string,
    items: MerchantShopItem[],
    startIndex: number,
    playerCoins: number
  ): number {
    const { Section, Item, ItemIcon, ItemText, CoinIcon } = MERCHANT_BUY_PANEL_SETTINGS;
    let currentY = y;

    // Draw section label
    ctx.fillStyle = Section.labelColor;
    ctx.font = `bold ${Section.labelFontSize}px "Courier New"`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(label, x, currentY);
    currentY += Section.labelFontSize + Section.labelMarginBottom;

    // Draw horizontal rule
    ctx.fillStyle = Section.ruleColor;
    ctx.fillRect(
      x,
      currentY,
      MERCHANT_BUY_PANEL_SETTINGS.Container.width -
        MERCHANT_BUY_PANEL_SETTINGS.Container.padding * 2,
      Section.ruleHeight
    );
    currentY += Section.ruleHeight + Section.ruleMarginBottom;

    // Draw items in grid
    const itemsPerRow = Item.itemsPerRow;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const flatIndex = startIndex + i;
      const row = Math.floor(i / itemsPerRow);
      const col = i % itemsPerRow;
      const itemX = x + col * (Item.width + Item.gap);
      const itemY = currentY + row * (Item.height + Item.gap);

      const canAfford = playerCoins >= item.price;
      const isSelected = flatIndex === this.selectedIndex;

      // Draw item background with updated color logic
      if (isSelected && canAfford) {
        // Selected + enough coins = green
        ctx.fillStyle = Item.selected.background;
        ctx.strokeStyle = Item.selected.borderColor;
        ctx.lineWidth = Item.selected.borderWidth;
      } else if (isSelected && !canAfford) {
        // Selected + not enough coins = red
        ctx.fillStyle = Item.cantAfford.background;
        ctx.strokeStyle = Item.cantAfford.borderColor;
        ctx.lineWidth = Item.borderWidth;
      } else if (!isSelected && !canAfford) {
        // Not selected + not enough coins = fainter red
        ctx.fillStyle = Item.cantAffordUnselected.background;
        ctx.strokeStyle = Item.cantAffordUnselected.borderColor;
        ctx.lineWidth = Item.borderWidth;
      } else {
        // Not selected + enough coins = normal background
        ctx.fillStyle = Item.background;
        ctx.strokeStyle = Item.borderColor;
        ctx.lineWidth = Item.borderWidth;
      }

      ctx.fillRect(itemX, itemY, Item.width, Item.height);
      ctx.strokeRect(itemX, itemY, Item.width, Item.height);

      // Store item bounds for click detection
      // itemX and itemY are already in canvas coordinates (x = scrollAreaX, itemX = x + offset)
      this.itemBounds.push({
        x: itemX,
        y: itemY,
        width: Item.width,
        height: Item.height,
        index: flatIndex,
      });

      // Draw item icon
      const iconInfo = this.getItemIconInfo(item.itemType);
      if (iconInfo && iconInfo.image) {
        const iconX = itemX + Item.width / 2 - ItemIcon.size / 2;
        const iconY = itemY + Item.padding + 5;
        ctx.drawImage(
          iconInfo.image,
          iconInfo.x,
          iconInfo.y,
          iconInfo.width,
          iconInfo.height,
          iconX,
          iconY,
          ItemIcon.size,
          ItemIcon.size
        );
      }

      // Draw item name
      ctx.fillStyle = ItemText.color;
      ctx.font = `${ItemText.nameSize}px "Courier New"`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      const itemName = formatDisplayName(item.itemType);
      const maxNameWidth = Item.width - Item.padding * 2;
      let displayName = itemName;
      const nameWidth = ctx.measureText(itemName).width;
      if (nameWidth > maxNameWidth) {
        // Truncate name if too long
        while (
          ctx.measureText(displayName + "...").width > maxNameWidth &&
          displayName.length > 0
        ) {
          displayName = displayName.slice(0, -1);
        }
        displayName += "...";
      }
      ctx.fillText(displayName, itemX + Item.width / 2, itemY + Item.height - Item.padding - 28);

      // Draw price with coin icon
      const priceText = `${item.price}`;
      ctx.font = `bold ${ItemText.priceSize}px "Courier New"`;
      const priceTextWidth = ctx.measureText(priceText).width;
      const totalWidth = CoinIcon.size + 5 + priceTextWidth;
      const priceStartX = itemX + Item.width / 2 - totalWidth / 2;

      // Draw coin icon
      const coinConfig = ITEM_CONFIGS["coin"];
      if (coinConfig) {
        const coinSheet = coinConfig.assets.sheet || "items";
        const coinSheetImage = this.assetManager.getSheet(coinSheet);
        if (coinSheetImage) {
          const coinIconY = itemY + Item.height - Item.padding - CoinIcon.size - 2;
          ctx.drawImage(
            coinSheetImage,
            coinConfig.assets.x,
            coinConfig.assets.y,
            16,
            16,
            priceStartX,
            coinIconY,
            CoinIcon.size,
            CoinIcon.size
          );
        }
      }

      // Draw price text
      ctx.fillStyle = canAfford ? ItemText.priceColor : Item.cantAfford.borderColor;
      ctx.textAlign = "left";
      ctx.textBaseline = "bottom";
      ctx.fillText(
        priceText,
        priceStartX + CoinIcon.size + 5,
        itemY + Item.height - Item.padding - 2
      );
    }

    // Calculate total height used
    const rows = Math.ceil(items.length / itemsPerRow);
    const sectionHeight = currentY + rows * (Item.height + Item.gap) - Item.gap - y;
    return currentY + rows * (Item.height + Item.gap) - Item.gap + Section.marginBottom;
  }

  public handleClick(x: number, y: number): boolean {
    if (!this.isVisible() || !this.panelBounds) {
      return false;
    }

    // Check if click is within panel bounds
    if (
      x < this.panelBounds.x ||
      x > this.panelBounds.x + this.panelBounds.width ||
      y < this.panelBounds.y ||
      y > this.panelBounds.y + this.panelBounds.height
    ) {
      return false;
    }

    // Check if click is on any item
    for (const bounds of this.itemBounds) {
      if (
        x >= bounds.x &&
        x <= bounds.x + bounds.width &&
        y >= bounds.y &&
        y <= bounds.y + bounds.height
      ) {
        this.selectedIndex = bounds.index;
        this.ensureSelectedVisible();
        // Try to buy if they have enough coins
        const player = this.getPlayer();
        if (player && player.hasExt(ClientResourcesBag)) {
          const coins = player.getExt(ClientResourcesBag).getCoins();
          const item = this.flatItemList[bounds.index];
          if (item && coins >= item.price) {
            this.buySelected();
          }
        }
        return true;
      }
    }

    return false;
  }

  public render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    if (!this.isVisible()) {
      return;
    }

    const player = this.getPlayer();
    if (!player) return;

    // Clear item bounds at start of render
    this.itemBounds = [];

    // Get coins from extension
    let playerCoins = 0;
    if (player.hasExt(ClientResourcesBag)) {
      playerCoins = player.getExt(ClientResourcesBag).getCoins();
    }

    const { Container, Title, Instructions, ScrollArea } = MERCHANT_BUY_PANEL_SETTINGS;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // Center the panel on screen
    const canvasWidth = ctx.canvas.width;
    const canvasHeight = ctx.canvas.height;
    const offsetX = (canvasWidth - Container.width) / 2;
    const offsetY = (canvasHeight - Container.maxHeight) / 2;

    // Store panel bounds for mouse wheel detection
    this.panelBounds = {
      x: offsetX,
      y: offsetY,
      width: Container.width,
      height: Container.maxHeight,
    };

    // Draw container background
    ctx.fillStyle = Container.background;
    ctx.fillRect(offsetX, offsetY, Container.width, Container.maxHeight);
    ctx.strokeStyle = Container.borderColor;
    ctx.lineWidth = Container.borderWidth;
    ctx.strokeRect(offsetX, offsetY, Container.width, Container.maxHeight);

    // Draw title
    ctx.fillStyle = Title.color;
    ctx.font = `bold ${Title.fontSize}px "Courier New"`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(Title.text, offsetX + Container.width / 2, offsetY + Container.padding);

    // Draw player coins
    const playerCoinsText = `Your coins: ${playerCoins}`;
    ctx.font = `bold 18px "Courier New"`;
    ctx.textAlign = "right";
    ctx.textBaseline = "top";
    ctx.fillStyle = "rgba(255, 215, 0, 1)";
    ctx.fillText(
      playerCoinsText,
      offsetX + Container.width - Container.padding,
      offsetY + Container.padding + 5
    );

    // Set up scroll area
    const scrollAreaX = offsetX + Container.padding + ScrollArea.padding;
    const scrollAreaY = offsetY + Container.padding + Title.fontSize + Title.marginBottom;
    // Actual visible scroll area height (for clipping)
    const visibleScrollAreaHeight =
      Container.maxHeight -
      Container.padding * 2 -
      Title.fontSize -
      Title.marginBottom -
      Instructions.fontSize -
      Instructions.marginTop;
    // Extended height for scroll calculations (allows scrolling further to see bottom items)
    const scrollAreaHeight = visibleScrollAreaHeight + 100;

    // Clip to visible scroll area (without the extra padding)
    ctx.save();
    ctx.beginPath();
    ctx.rect(
      scrollAreaX - ScrollArea.padding,
      scrollAreaY - ScrollArea.padding,
      Container.width - Container.padding * 2,
      visibleScrollAreaHeight + ScrollArea.padding * 2
    );
    ctx.clip();

    // Calculate which items are visible based on scroll
    const itemsPerRow = MERCHANT_BUY_PANEL_SETTINGS.Item.itemsPerRow;
    const itemRowHeight =
      MERCHANT_BUY_PANEL_SETTINGS.Item.height + MERCHANT_BUY_PANEL_SETTINGS.Item.gap;
    const sectionHeaderHeight =
      MERCHANT_BUY_PANEL_SETTINGS.Section.labelFontSize +
      MERCHANT_BUY_PANEL_SETTINGS.Section.labelMarginBottom +
      MERCHANT_BUY_PANEL_SETTINGS.Section.ruleHeight +
      MERCHANT_BUY_PANEL_SETTINGS.Section.ruleMarginBottom +
      MERCHANT_BUY_PANEL_SETTINGS.Section.marginBottom;

    let currentY = scrollAreaY - this.scrollOffset * itemRowHeight;
    let flatIndex = 0;

    // Render Items section
    if (this.groupedItems.items.length > 0) {
      const sectionHeight =
        sectionHeaderHeight +
        Math.ceil(this.groupedItems.items.length / itemsPerRow) * itemRowHeight +
        MERCHANT_BUY_PANEL_SETTINGS.Section.marginBottom;
      // Render if any part of the section is visible
      if (
        currentY + sectionHeight > scrollAreaY - ScrollArea.padding &&
        currentY < scrollAreaY + scrollAreaHeight + 200
      ) {
        currentY = this.renderSection(
          ctx,
          scrollAreaX,
          currentY,
          "ITEMS",
          this.groupedItems.items,
          flatIndex,
          playerCoins
        );
      } else {
        // Still update currentY even if not visible to maintain correct positioning
        currentY += sectionHeight;
      }
      flatIndex += this.groupedItems.items.length;
    }

    // Render Weapons section
    if (this.groupedItems.weapons.length > 0) {
      const sectionHeight =
        sectionHeaderHeight +
        Math.ceil(this.groupedItems.weapons.length / itemsPerRow) * itemRowHeight +
        MERCHANT_BUY_PANEL_SETTINGS.Section.marginBottom;
      // Render if any part of the section is visible
      if (
        currentY + sectionHeight > scrollAreaY - ScrollArea.padding &&
        currentY < scrollAreaY + scrollAreaHeight + 200
      ) {
        currentY = this.renderSection(
          ctx,
          scrollAreaX,
          currentY,
          "WEAPONS",
          this.groupedItems.weapons,
          flatIndex,
          playerCoins
        );
      } else {
        // Still update currentY even if not visible to maintain correct positioning
        currentY += sectionHeight;
      }
      flatIndex += this.groupedItems.weapons.length;
    }

    // Render Ammo section
    if (this.groupedItems.ammo.length > 0) {
      const sectionHeight =
        sectionHeaderHeight +
        Math.ceil(this.groupedItems.ammo.length / itemsPerRow) * itemRowHeight +
        MERCHANT_BUY_PANEL_SETTINGS.Section.marginBottom;
      // Render if any part of the section is visible
      if (
        currentY + sectionHeight > scrollAreaY - ScrollArea.padding &&
        currentY < scrollAreaY + scrollAreaHeight + 200
      ) {
        currentY = this.renderSection(
          ctx,
          scrollAreaX,
          currentY,
          "AMMO",
          this.groupedItems.ammo,
          flatIndex,
          playerCoins
        );
      } else {
        // Still update currentY even if not visible to maintain correct positioning
        currentY += sectionHeight;
      }
    }

    ctx.restore(); // Restore clipping

    // Draw instructions
    ctx.fillStyle = Instructions.color;
    ctx.font = `${Instructions.fontSize}px "Courier New"`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(
      Instructions.text,
      offsetX + Container.width / 2,
      offsetY +
        Container.maxHeight -
        Container.padding -
        Instructions.fontSize -
        Instructions.marginTop
    );

    ctx.restore();
  }
}
