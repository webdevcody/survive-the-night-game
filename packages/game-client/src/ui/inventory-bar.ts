import { GameState } from "@/state";
import { InputManager } from "@/managers/input";
import { Z_INDEX } from "@shared/map";
import { Renderable } from "@/entities/util";
import { AssetManager, getItemAssetKey } from "@/managers/asset";
import { InventoryItem } from "../../../game-shared/src/util/inventory";
import { MAX_INVENTORY_SLOTS } from "@shared/constants/constants";

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
    slotSize: 96,
    containerBackground: "rgba(0, 0, 0, 0.8)",
    slotBackground: "rgba(40, 40, 40, 0.9)",
    borderColor: "rgba(255, 255, 255, 0.5)",
    activeBorderColor: "rgba(255, 255, 255, 0.9)",
    borderWidth: 2,
    activeBorderWidth: 3,
  },
};

export class InventoryBarUI implements Renderable {
  private assetManager: AssetManager;
  private inputManager: InputManager;
  private getInventory: () => InventoryItem[];

  public constructor(
    assetManager: AssetManager,
    inputManager: InputManager,
    getInventory: () => InventoryItem[]
  ) {
    this.assetManager = assetManager;
    this.inputManager = inputManager;
    this.getInventory = getInventory;
  }

  public render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    // TODO: add health bar
    this.renderInventory(ctx, gameState);
  }

  public getZIndex(): number {
    return Z_INDEX.UI;
  }

  private renderInventory(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    const { width: canvasWidth, height: canvasHeight } = ctx.canvas;

    const settings = HOTBAR_SETTINGS.Inventory;
    const slotsNumber = MAX_INVENTORY_SLOTS;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    const hotbarWidth =
      slotsNumber * settings.slotSize +
      (slotsNumber - 1) * settings.slotsGap +
      settings.padding.left +
      settings.padding.right;
    const hotbarHeight = settings.slotSize + settings.padding.top + settings.padding.bottom;

    const hotbarX = canvasWidth / 2 - hotbarWidth / 2;
    const hotbarY = canvasHeight - hotbarHeight - settings.screenMarginBottom;

    // Draw container background
    ctx.fillStyle = settings.containerBackground;
    ctx.fillRect(hotbarX, hotbarY, hotbarWidth, hotbarHeight);

    // Draw container border
    ctx.strokeStyle = settings.borderColor;
    ctx.lineWidth = settings.borderWidth;
    ctx.strokeRect(hotbarX, hotbarY, hotbarWidth, hotbarHeight);

    const slotsLeft = hotbarX + settings.padding.left;
    const slotsTop = hotbarY + settings.padding.top;
    const slotsBottom = slotsTop + settings.slotSize;
    const items = this.getInventory();
    const activeItemIdx = this.inputManager.getInputs().inventoryItem - 1;

    for (let i = 0; i < slotsNumber; i++) {
      const slotLeft = slotsLeft + i * (settings.slotSize + settings.slotsGap);
      const slotRight = slotLeft + settings.slotSize;
      const isActive = activeItemIdx === i;

      // Draw slot background
      ctx.fillStyle = settings.slotBackground;
      ctx.fillRect(slotLeft, slotsTop, settings.slotSize, settings.slotSize);

      // Draw slot border
      ctx.strokeStyle = isActive ? settings.activeBorderColor : settings.borderColor;
      ctx.lineWidth = isActive ? settings.activeBorderWidth : settings.borderWidth;
      ctx.strokeRect(slotLeft, slotsTop, settings.slotSize, settings.slotSize);

      const inventoryItem = items[i];

      // Draw item image
      const image = inventoryItem && this.assetManager.get(getItemAssetKey(inventoryItem));
      if (image) {
        const imagePadding = 8;
        ctx.drawImage(
          image,
          slotLeft + imagePadding,
          slotsTop + imagePadding,
          settings.slotSize - imagePadding * 2,
          settings.slotSize - imagePadding * 2
        );
      }

      // Draw slot number
      ctx.font = "bold 24px Arial";
      ctx.textAlign = "left";
      ctx.fillStyle = "white";
      ctx.strokeStyle = "rgba(0, 0, 0, 0.8)";
      ctx.lineWidth = 3;
      ctx.strokeText(`${i + 1}`, slotLeft + 6, slotsTop + 26);
      ctx.fillText(`${i + 1}`, slotLeft + 6, slotsTop + 26);

      // Draw item count
      if (inventoryItem?.state?.count) {
        ctx.font = "bold 24px Arial";
        ctx.textAlign = "right";
        ctx.fillStyle = "white";
        ctx.strokeStyle = "rgba(0, 0, 0, 0.8)";
        ctx.lineWidth = 3;
        ctx.strokeText(`${inventoryItem.state.count}`, slotRight - 6, slotsBottom - 6);
        ctx.fillText(`${inventoryItem.state.count}`, slotRight - 6, slotsBottom - 6);
      }
    }

    ctx.restore();
  }
}
