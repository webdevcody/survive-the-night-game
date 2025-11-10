import { GameState } from "@/state";
import { InputManager } from "@/managers/input";
import { Z_INDEX } from "@shared/map";
import { Renderable } from "@/entities/util";
import { AssetManager, getItemAssetKey } from "@/managers/asset";
import { InventoryItem } from "../../../game-shared/src/util/inventory";
import { getConfig } from "@shared/config";
import { HeartsPanel } from "./panels/hearts-panel";
import { StaminaPanel } from "./panels/stamina-panel";
import { calculateHudScale } from "@/util/hud-scale";

const HOTBAR_SETTINGS = {
  Inventory: {
    screenMarginBottom: 16,
    padding: {
      bottom: 12,
      left: 12,
      right: 12,
      top: 12,
    },
    slotsGap: 8,
    slotSize: 60, // Reduced from 70 (was 96 originally)
    containerBackground: "rgba(0, 0, 0, 0.8)",
    slotBackground: "rgba(40, 40, 40, 0.9)",
    borderColor: "rgba(255, 255, 255, 0.5)",
    activeBorderColor: "rgba(255, 255, 255, 0.9)",
    borderWidth: 2,
    activeBorderWidth: 3,
  },
  Hearts: {
    marginBottom: 12,
    heartSize: 28, // Reduced from 32
    heartGap: 3,
    font: "28px Arial", // Reduced from 32px
  },
  StaminaBar: {
    marginBottom: 6,
    width: 180, // Reduced from 200
    height: 20, // Reduced from 24
    padding: 6, // Reduced from 8
    iconSize: 28, // Reduced from 32
    iconGap: 6, // Reduced from 8
    font: "28px Arial", // Reduced from 32px
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    borderColor: "rgba(255, 255, 255, 0.5)",
    barBackgroundColor: "rgba(40, 40, 40, 0.9)",
    barColor: "rgba(255, 255, 100, 0.9)",
    borderWidth: 2,
  },
  CoinCounter: {
    marginBottom: 6,
    padding: 6, // Reduced from 8
    background: "rgba(0, 0, 0, 0.7)",
    font: "20px Arial", // Reduced from 32px
    spriteSize: 20, // Reduced from 32
    iconGap: 6, // Reduced from 8
  },
};

export class InventoryBarUI implements Renderable {
  private assetManager: AssetManager;
  private inputManager: InputManager;
  private getInventory: () => InventoryItem[];
  private heartsPanel: HeartsPanel;
  private staminaPanel: StaminaPanel;
  private hoveredSlot: number | null = null;
  private mouseX: number = 0;
  private mouseY: number = 0;

  public constructor(
    assetManager: AssetManager,
    inputManager: InputManager,
    getInventory: () => InventoryItem[]
  ) {
    this.assetManager = assetManager;
    this.inputManager = inputManager;
    this.getInventory = getInventory;

    // Initialize panels with settings
    this.heartsPanel = new HeartsPanel({
      padding: 8,
      background: "rgba(0, 0, 0, 0.7)",
      borderColor: "rgba(255, 255, 255, 0.5)",
      borderWidth: 2,
      marginBottom: HOTBAR_SETTINGS.Hearts.marginBottom,
      heartSize: HOTBAR_SETTINGS.Hearts.heartSize,
      heartGap: HOTBAR_SETTINGS.Hearts.heartGap,
      font: HOTBAR_SETTINGS.Hearts.font,
      inventorySettings: HOTBAR_SETTINGS.Inventory,
    });

    this.staminaPanel = new StaminaPanel({
      padding: 8,
      background: HOTBAR_SETTINGS.StaminaBar.backgroundColor,
      borderColor: HOTBAR_SETTINGS.StaminaBar.borderColor,
      borderWidth: HOTBAR_SETTINGS.StaminaBar.borderWidth,
      marginBottom: HOTBAR_SETTINGS.StaminaBar.marginBottom,
      width: HOTBAR_SETTINGS.StaminaBar.width,
      height: HOTBAR_SETTINGS.StaminaBar.height,
      iconSize: HOTBAR_SETTINGS.StaminaBar.iconSize,
      iconGap: HOTBAR_SETTINGS.StaminaBar.iconGap,
      font: HOTBAR_SETTINGS.StaminaBar.font,
      barBackgroundColor: HOTBAR_SETTINGS.StaminaBar.barBackgroundColor,
      barColor: HOTBAR_SETTINGS.StaminaBar.barColor,
      inventorySettings: HOTBAR_SETTINGS.Inventory,
    });

    // Coins panel removed - coins are now displayed in the resources panel at the top
  }

  public render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    this.renderInventory(ctx, gameState);
    this.heartsPanel.render(ctx, gameState);
    this.staminaPanel.render(ctx, gameState);
    // Coins panel removed - coins are now displayed in the resources panel at the top
    this.renderTooltip(ctx, gameState);
  }

  public getZIndex(): number {
    return Z_INDEX.UI;
  }

  public updateMousePosition(x: number, y: number, canvasWidth: number, canvasHeight: number): void {
    this.mouseX = x;
    this.mouseY = y;

    const settings = HOTBAR_SETTINGS.Inventory;
    const slotsNumber = getConfig().player.MAX_INVENTORY_SLOTS;

    const hotbarWidth =
      slotsNumber * settings.slotSize +
      (slotsNumber - 1) * settings.slotsGap +
      settings.padding.left +
      settings.padding.right;
    const hotbarHeight = settings.slotSize + settings.padding.top + settings.padding.bottom;

    const hotbarX = canvasWidth / 2 - hotbarWidth / 2;
    const hotbarY = canvasHeight - hotbarHeight - settings.screenMarginBottom;

    const slotsLeft = hotbarX + settings.padding.left;
    const slotsTop = hotbarY + settings.padding.top;

    // Check which slot is being hovered
    this.hoveredSlot = null;
    for (let i = 0; i < slotsNumber; i++) {
      const slotLeft = slotsLeft + i * (settings.slotSize + settings.slotsGap);
      const slotRight = slotLeft + settings.slotSize;
      const slotBottom = slotsTop + settings.slotSize;

      if (x >= slotLeft && x <= slotRight && y >= slotsTop && y <= slotBottom) {
        this.hoveredSlot = i;
        break;
      }
    }
  }

  public handleClick(x: number, y: number, canvasWidth: number, canvasHeight: number): boolean {
    const settings = HOTBAR_SETTINGS.Inventory;
    const slotsNumber = getConfig().player.MAX_INVENTORY_SLOTS;

    const hotbarWidth =
      slotsNumber * settings.slotSize +
      (slotsNumber - 1) * settings.slotsGap +
      settings.padding.left +
      settings.padding.right;
    const hotbarHeight = settings.slotSize + settings.padding.top + settings.padding.bottom;

    const hotbarX = canvasWidth / 2 - hotbarWidth / 2;
    const hotbarY = canvasHeight - hotbarHeight - settings.screenMarginBottom;

    const slotsLeft = hotbarX + settings.padding.left;
    const slotsTop = hotbarY + settings.padding.top;

    // Check if click is within the inventory hotbar area
    for (let i = 0; i < slotsNumber; i++) {
      const slotLeft = slotsLeft + i * (settings.slotSize + settings.slotsGap);
      const slotRight = slotLeft + settings.slotSize;
      const slotBottom = slotsTop + settings.slotSize;

      if (x >= slotLeft && x <= slotRight && y >= slotsTop && y <= slotBottom) {
        // Click is on slot i, select it (convert to 1-indexed)
        this.inputManager.setInventorySlot(i + 1);
        return true; // Click was handled
      }
    }

    return false; // Click was not on inventory
  }

  private renderInventory(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    const { width: canvasWidth, height: canvasHeight } = ctx.canvas;

    // Scale inventory bar based on screen width for responsive design
    const hudScale = calculateHudScale(canvasWidth, canvasHeight);
    const settings = HOTBAR_SETTINGS.Inventory;
    const slotsNumber = getConfig().player.MAX_INVENTORY_SLOTS;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // Scale all dimensions by HUD scale
    const scaledSlotSize = settings.slotSize * hudScale;
    const scaledSlotsGap = settings.slotsGap * hudScale;
    const scaledPadding = {
      left: settings.padding.left * hudScale,
      right: settings.padding.right * hudScale,
      top: settings.padding.top * hudScale,
      bottom: settings.padding.bottom * hudScale,
    };
    const scaledScreenMarginBottom = settings.screenMarginBottom * hudScale;
    const scaledBorderWidth = settings.borderWidth * hudScale;
    const scaledActiveBorderWidth = settings.activeBorderWidth * hudScale;

    const hotbarWidth =
      slotsNumber * scaledSlotSize +
      (slotsNumber - 1) * scaledSlotsGap +
      scaledPadding.left +
      scaledPadding.right;
    const hotbarHeight = scaledSlotSize + scaledPadding.top + scaledPadding.bottom;

    const hotbarX = canvasWidth / 2 - hotbarWidth / 2;
    const hotbarY = canvasHeight - hotbarHeight - scaledScreenMarginBottom;

    // Draw container background
    ctx.fillStyle = settings.containerBackground;
    ctx.fillRect(hotbarX, hotbarY, hotbarWidth, hotbarHeight);

    // Draw container border
    ctx.strokeStyle = settings.borderColor;
    ctx.lineWidth = scaledBorderWidth;
    ctx.strokeRect(hotbarX, hotbarY, hotbarWidth, hotbarHeight);

    const slotsLeft = hotbarX + scaledPadding.left;
    const slotsTop = hotbarY + scaledPadding.top;
    const slotsBottom = slotsTop + scaledSlotSize;
    const items = this.getInventory();
    const activeItemIdx = this.inputManager.getInputs().inventoryItem - 1;

    for (let i = 0; i < slotsNumber; i++) {
      const slotLeft = slotsLeft + i * (scaledSlotSize + scaledSlotsGap);
      const slotRight = slotLeft + scaledSlotSize;
      const isActive = activeItemIdx === i;

      // Draw slot background
      ctx.fillStyle = settings.slotBackground;
      ctx.fillRect(slotLeft, slotsTop, scaledSlotSize, scaledSlotSize);

      // Draw slot border
      ctx.strokeStyle = isActive ? settings.activeBorderColor : settings.borderColor;
      ctx.lineWidth = isActive ? scaledActiveBorderWidth : scaledBorderWidth;
      ctx.strokeRect(slotLeft, slotsTop, scaledSlotSize, scaledSlotSize);

      const inventoryItem = items[i];

      // Draw item image
      const image = inventoryItem && this.assetManager.get(getItemAssetKey(inventoryItem));

      if (image) {
        const imagePadding = 8 * hudScale;
        ctx.drawImage(
          image,
          slotLeft + imagePadding,
          slotsTop + imagePadding,
          scaledSlotSize - imagePadding * 2,
          scaledSlotSize - imagePadding * 2
        );
      }

      // Draw slot number (show "0" for slot 10)
      const slotLabel = i === 9 ? "0" : `${i + 1}`;
      const slotFontSize = 24 * hudScale;
      ctx.font = `bold ${slotFontSize}px Arial`;
      ctx.textAlign = "left";
      ctx.fillStyle = "white";
      ctx.strokeStyle = "rgba(0, 0, 0, 0.8)";
      ctx.lineWidth = 3 * hudScale;
      const slotLabelX = slotLeft + 6 * hudScale;
      const slotLabelY = slotsTop + 26 * hudScale;
      ctx.strokeText(slotLabel, slotLabelX, slotLabelY);
      ctx.fillText(slotLabel, slotLabelX, slotLabelY);

      // Draw item count
      if (inventoryItem?.state?.count) {
        ctx.font = `bold ${slotFontSize}px Arial`;
        ctx.textAlign = "right";
        ctx.fillStyle = "white";
        ctx.strokeStyle = "rgba(0, 0, 0, 0.8)";
        ctx.lineWidth = 3 * hudScale;
        const countX = slotRight - 6 * hudScale;
        const countY = slotsBottom - 6 * hudScale;
        ctx.strokeText(`${inventoryItem.state.count}`, countX, countY);
        ctx.fillText(`${inventoryItem.state.count}`, countX, countY);
      }
    }

    ctx.restore();
  }

  private renderTooltip(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    if (this.hoveredSlot === null) {
      return;
    }

    const items = this.getInventory();
    const hoveredItem = items[this.hoveredSlot];
    if (!hoveredItem) {
      return;
    }

    const { width: canvasWidth, height: canvasHeight } = ctx.canvas;
    const hudScale = calculateHudScale(canvasWidth, canvasHeight);
    const settings = HOTBAR_SETTINGS.Inventory;
    const slotsNumber = getConfig().player.MAX_INVENTORY_SLOTS;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // Use scaled values (same as in renderInventory)
    const scaledSlotSize = settings.slotSize * hudScale;
    const scaledSlotsGap = settings.slotsGap * hudScale;
    const scaledPadding = {
      left: settings.padding.left * hudScale,
      right: settings.padding.right * hudScale,
      top: settings.padding.top * hudScale,
      bottom: settings.padding.bottom * hudScale,
    };
    const scaledScreenMarginBottom = settings.screenMarginBottom * hudScale;

    const hotbarWidth =
      slotsNumber * scaledSlotSize +
      (slotsNumber - 1) * scaledSlotsGap +
      scaledPadding.left +
      scaledPadding.right;
    const hotbarHeight = scaledSlotSize + scaledPadding.top + scaledPadding.bottom;

    const hotbarX = canvasWidth / 2 - hotbarWidth / 2;
    const hotbarY = canvasHeight - hotbarHeight - scaledScreenMarginBottom;

    const slotsLeft = hotbarX + scaledPadding.left;
    const slotsTop = hotbarY + scaledPadding.top;

    const slotLeft = slotsLeft + this.hoveredSlot * (scaledSlotSize + scaledSlotsGap);
    const slotCenterX = slotLeft + scaledSlotSize / 2;

    // Get item name
    const itemName = hoveredItem.itemType;

    // Measure text for tooltip background
    const tooltipFontSize = 20 * hudScale;
    ctx.font = `bold ${tooltipFontSize}px Arial`;
    ctx.textAlign = "center";
    const textMetrics = ctx.measureText(itemName);
    const textWidth = textMetrics.width;
    const textHeight = tooltipFontSize;

    const tooltipPadding = 8 * hudScale;
    const tooltipWidth = textWidth + tooltipPadding * 2;
    const tooltipHeight = textHeight + tooltipPadding * 2;
    const tooltipX = slotCenterX - tooltipWidth / 2;
    const tooltipY = slotsTop - tooltipHeight - 8 * hudScale; // 8px gap above slot

    // Draw tooltip background
    ctx.fillStyle = "rgba(0, 0, 0, 0.9)";
    ctx.fillRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight);

    // Draw tooltip border
    ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
    ctx.lineWidth = 2 * hudScale;
    ctx.strokeRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight);

    // Draw item name
    ctx.fillStyle = "white";
    ctx.strokeStyle = "rgba(0, 0, 0, 0.8)";
    ctx.lineWidth = 3 * hudScale;
    const textY = tooltipY + tooltipPadding + textHeight - 4 * hudScale;
    ctx.strokeText(itemName, slotCenterX, textY);
    ctx.fillText(itemName, slotCenterX, textY);

    ctx.restore();
  }
}
