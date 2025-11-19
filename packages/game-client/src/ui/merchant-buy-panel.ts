import { Renderable } from "@/entities/util";
import { GameState } from "@/state";
import { AssetManager } from "@/managers/asset";
import { PlayerClient } from "@/entities/player";
import { Z_INDEX } from "@shared/map";
import { getConfig, type MerchantShopItem } from "@shared/config";
import { ITEM_CONFIGS } from "@shared/entities/item-configs";
import { ClientResourcesBag } from "@/extensions";
import { formatDisplayName } from "@/util/format";

const MERCHANT_BUY_PANEL_SETTINGS = {
  Container: {
    background: "rgba(0, 0, 0, 0.95)",
    padding: 40,
    borderWidth: 4,
    borderColor: "rgba(255, 215, 0, 0.8)",
  },
  Title: {
    fontSize: 32,
    color: "rgba(255, 215, 0, 1)",
    text: "MERCHANT SHOP",
    marginBottom: 25,
  },
  Instructions: {
    fontSize: 18,
    color: "rgba(200, 200, 200, 0.9)",
    text: "Press [1] [2] [3] to buy    [E] or [Esc] to close",
    marginTop: 20,
  },
  Item: {
    width: 220,
    height: 140,
    gap: 25,
    padding: 20,
    background: "rgba(30, 30, 30, 0.95)",
    borderWidth: 3,
    borderColor: "rgba(100, 100, 100, 0.8)",
    selected: {
      borderColor: "#22c55e",
      background: "rgba(34, 197, 94, 0.15)",
    },
    cantAfford: {
      borderColor: "#dc2626",
      background: "rgba(60, 20, 20, 0.8)",
    },
  },
  ItemIcon: {
    size: 64,
  },
  ItemText: {
    nameSize: 18,
    priceSize: 20,
    color: "rgba(255, 255, 255, 0.95)",
    priceColor: "#f59e0b",
  },
  CoinIcon: {
    size: 20,
  },
};

export interface MerchantBuyPanelOptions {
  getPlayer: () => PlayerClient | null;
  onBuy: (merchantId: number, itemIndex: number) => void;
}

export class MerchantBuyPanel implements Renderable {
  private assetManager: AssetManager;
  private getPlayer: () => PlayerClient | null;
  private onBuy: (merchantId: number, itemIndex: number) => void;
  private activeMerchantId: number | null = null;
  private shopItems: MerchantShopItem[] = [];
  private selectedIndex: number = 0;

  public constructor(assetManager: AssetManager, { getPlayer, onBuy }: MerchantBuyPanelOptions) {
    this.assetManager = assetManager;
    this.getPlayer = getPlayer;
    this.onBuy = onBuy;
  }

  public getZIndex(): number {
    return Z_INDEX.UI;
  }

  public open(merchantId: number, shopItems: MerchantShopItem[]): void {
    this.activeMerchantId = merchantId;
    this.shopItems = shopItems;
    this.selectedIndex = 0;
  }

  public close(): void {
    this.activeMerchantId = null;
    this.shopItems = [];
    this.selectedIndex = 0;
  }

  public isVisible(): boolean {
    return this.activeMerchantId !== null;
  }

  public buySelected(itemIndex: number): void {
    if (this.activeMerchantId && itemIndex >= 0 && itemIndex < this.shopItems.length) {
      const player = this.getPlayer();
      const item = this.shopItems[itemIndex];
      if (player && player.hasExt(ClientResourcesBag)) {
        const coins = player.getExt(ClientResourcesBag).getCoins();
        if (coins >= item.price) {
          this.onBuy(this.activeMerchantId, itemIndex);
          this.close();
        }
      }
    }
  }

  public render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    if (!this.isVisible()) {
      return;
    }

    const player = this.getPlayer();
    if (!player) return;

    // Get coins from extension
    let playerCoins = 0;
    if (player.hasExt(ClientResourcesBag)) {
      playerCoins = player.getExt(ClientResourcesBag).getCoins();
    }
    const { Container, Title, Instructions, Item, ItemIcon, ItemText, CoinIcon } =
      MERCHANT_BUY_PANEL_SETTINGS;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // Calculate dimensions
    const totalWidth =
      this.shopItems.length * Item.width +
      (this.shopItems.length - 1) * Item.gap +
      Container.padding * 2;
    const totalHeight =
      Item.height +
      Container.padding * 2 +
      Title.marginBottom +
      Title.fontSize +
      Instructions.marginTop +
      Instructions.fontSize;

    // Center the panel on screen
    const canvasWidth = ctx.canvas.width;
    const canvasHeight = ctx.canvas.height;
    const offsetX = (canvasWidth - totalWidth) / 2;
    const offsetY = (canvasHeight - totalHeight) / 2;

    // Draw container background
    ctx.fillStyle = Container.background;
    ctx.fillRect(offsetX, offsetY, totalWidth, totalHeight);
    ctx.strokeStyle = Container.borderColor;
    ctx.lineWidth = Container.borderWidth;
    ctx.strokeRect(offsetX, offsetY, totalWidth, totalHeight);

    // Draw title
    ctx.fillStyle = Title.color;
    ctx.font = `bold ${Title.fontSize}px "Courier New"`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(Title.text, offsetX + totalWidth / 2, offsetY + Container.padding);

    // Draw items
    const itemsStartY = offsetY + Container.padding + Title.fontSize + Title.marginBottom;
    for (let i = 0; i < this.shopItems.length; i++) {
      const shopItem = this.shopItems[i];
      const itemX = offsetX + Container.padding + i * (Item.width + Item.gap);
      const itemY = itemsStartY;

      const canAfford = playerCoins >= shopItem.price;

      // Draw item background
      if (canAfford) {
        ctx.fillStyle = Item.background;
        ctx.strokeStyle = Item.borderColor;
      } else {
        ctx.fillStyle = Item.cantAfford.background;
        ctx.strokeStyle = Item.cantAfford.borderColor;
      }

      ctx.fillRect(itemX, itemY, Item.width, Item.height);
      ctx.lineWidth = Item.borderWidth;
      ctx.strokeRect(itemX, itemY, Item.width, Item.height);

      // Draw item number
      ctx.fillStyle = "rgba(0, 0, 0, 0.9)";
      ctx.font = `bold 24px "Courier New"`;
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText(`[${i + 1}]`, itemX + Item.padding, itemY + Item.padding);

      // Draw item icon
      const itemConfig = ITEM_CONFIGS[shopItem.itemType];
      if (itemConfig) {
        const assetKey = itemConfig.assets.assetKey;
        const image = this.assetManager.get(assetKey);
        if (image) {
          const iconX = itemX + Item.width / 2 - ItemIcon.size / 2;
          const iconY = itemY + Item.padding + 30;
          ctx.drawImage(
            image,
            itemConfig.assets.x,
            itemConfig.assets.y,
            itemConfig.assets.width || 16,
            itemConfig.assets.height || 16,
            iconX,
            iconY,
            ItemIcon.size,
            ItemIcon.size
          );
        }
      }

      // Draw item name (below icon)
      ctx.fillStyle = ItemText.color;
      ctx.font = `${ItemText.nameSize}px "Courier New"`;
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      const itemName = formatDisplayName(shopItem.itemType);
      ctx.fillText(itemName, itemX + Item.width / 2, itemY + Item.height - Item.padding - 30);

      // Draw price with coin icon
      const priceText = `${shopItem.price}`;
      ctx.font = `bold ${ItemText.priceSize}px "Courier New"`;
      const priceTextWidth = ctx.measureText(priceText).width;
      const totalWidth = CoinIcon.size + 8 + priceTextWidth; // Icon + gap + text
      const priceStartX = itemX + Item.width / 2 - totalWidth / 2;

      // Draw coin icon
      const coinConfig = ITEM_CONFIGS["coin"];
      if (coinConfig) {
        const coinImage = this.assetManager.get(coinConfig.assets.assetKey);
        if (coinImage) {
          const coinIconY = itemY + Item.height - Item.padding - CoinIcon.size;
          ctx.drawImage(
            coinImage,
            coinConfig.assets.x,
            coinConfig.assets.y,
            coinConfig.assets.width || 16,
            coinConfig.assets.height || 16,
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
      ctx.fillText(priceText, priceStartX + CoinIcon.size + 8, itemY + Item.height - Item.padding);
    }

    // Draw instructions
    ctx.fillStyle = Instructions.color;
    ctx.font = `${Instructions.fontSize}px "Courier New"`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(
      Instructions.text,
      offsetX + totalWidth / 2,
      itemsStartY + Item.height + Instructions.marginTop
    );

    // Draw player coins with coin icon
    const playerCoinsText = `Your coins: ${playerCoins}`;
    ctx.font = `bold 20px "Courier New"`;
    const playerCoinsTextWidth = ctx.measureText(playerCoinsText).width;
    const playerCoinsTotalWidth = CoinIcon.size + 8 + playerCoinsTextWidth;
    const playerCoinsStartX = offsetX + totalWidth / 2 - playerCoinsTotalWidth / 2;
    const playerCoinsY = offsetY + 15;

    // Draw coin icon for player coins
    const coinConfig = ITEM_CONFIGS["coin"];
    if (coinConfig) {
      const coinImage = this.assetManager.get(coinConfig.assets.assetKey);
      if (coinImage) {
        ctx.drawImage(
          coinImage,
          coinConfig.assets.x,
          coinConfig.assets.y,
          coinConfig.assets.width || 16,
          coinConfig.assets.height || 16,
          playerCoinsStartX,
          playerCoinsY - CoinIcon.size / 2,
          CoinIcon.size,
          CoinIcon.size
        );
      }
    }

    // Draw player coins text
    ctx.fillStyle = "rgba(255, 215, 0, 1)";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(playerCoinsText, playerCoinsStartX + CoinIcon.size + 8, playerCoinsY);

    ctx.restore();
  }
}
