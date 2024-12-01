import { AssetManager } from "@/managers/asset";
import { Renderable } from "../entities/util";
import { GameState } from "@/state";
import { InputManager } from "@/managers/input";
import { InventoryManager } from "@/managers/inventory";
import { Direction } from "@survive-the-night/game-server";

const HOTBAR_SETTINGS = {
  Inventory: {
    screenMarginBottom: 16,
    padding: {
      bottom: 8,
      left: 8,
      right: 8,
      top: 8,
    },
    slotsGap: 8,
    slotSize: 96,
    background: "gray",

    active: {
      background: "green",
    },
  },
};

export class HotbarClient implements Renderable {
  private assetManager: AssetManager;
  private inputManager: InputManager;
  private inventoryManager: InventoryManager;

  public constructor(
    assetManager: AssetManager,
    inputManager: InputManager,
    inventoryManager: InventoryManager
  ) {
    this.assetManager = assetManager;
    this.inputManager = inputManager;
    this.inventoryManager = inventoryManager;
  }

  public render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    // TODO: add health bar
    this.renderInventory(ctx, gameState);
  }

  private renderInventory(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    const { width: canvasWidth, height: canvasHeight } = ctx.canvas;

    const { slotSize, padding, slotsGap, screenMarginBottom, background, active } =
      HOTBAR_SETTINGS.Inventory;
    const slotsNumber = this.inventoryManager.getItemsNumber();

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    const hotbarWidth =
      slotsNumber * slotSize + (slotsNumber - 1) * slotsGap + padding.left + padding.right;
    const hotbarHeight = slotSize + padding.top + padding.bottom;

    ctx.fillStyle = "white";

    ctx.fillRect(
      canvasWidth / 2 - hotbarWidth / 2,
      canvasHeight - hotbarHeight - screenMarginBottom,
      hotbarWidth,
      hotbarHeight
    );

    const slotsLeft = canvasWidth / 2 - hotbarWidth / 2 + padding.left;
    const slotsTop = canvasHeight - hotbarHeight - screenMarginBottom + padding.top;
    const items = this.inventoryManager.getHotbarItems();
    const activeItemIdx = this.inputManager.getInputs().inventoryItem;

    for (let i = 0; i < slotsNumber; i++) {
      const slotLeft = slotsLeft + i * (slotSize + slotsGap);

      ctx.fillStyle = activeItemIdx === i ? active.background : background;
      ctx.fillRect(slotLeft, slotsTop, slotSize, slotSize);

      const inventoryItem = items[i];

      if (inventoryItem === undefined) {
        continue;
      }

      const image = this.assetManager.getWithDirection(inventoryItem.key, Direction.Right);
      ctx.drawImage(image, slotLeft, slotsTop, slotSize, slotSize);
    }

    ctx.restore();
  }
}
