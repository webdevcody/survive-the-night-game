import { AssetManager, getItemAssetKey } from "../managers/asset";
import { Renderable } from "../entities/util";
import { GameState } from "@/state";
import { InputManager } from "@/managers/input";
import { Direction, InventoryItem } from "@survive-the-night/game-server";
import { Z_INDEX } from "@survive-the-night/game-server/src/managers/map-manager";
import Inventory from "@survive-the-night/game-server/src/shared/extensions/inventory";

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

    const { slotSize, padding, slotsGap, screenMarginBottom, background, active } =
      HOTBAR_SETTINGS.Inventory;
    const slotsNumber = Inventory.MAX_SLOTS;

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
    const items = this.getInventory();
    const activeItemIdx = this.inputManager.getInputs().inventoryItem - 1;

    for (let i = 0; i < slotsNumber; i++) {
      const slotLeft = slotsLeft + i * (slotSize + slotsGap);

      ctx.fillStyle = activeItemIdx === i ? active.background : background;
      ctx.fillRect(slotLeft, slotsTop, slotSize, slotSize);

      ctx.fillStyle = "white";
      ctx.font = "32px Arial";
      ctx.textAlign = "left";

      const inventoryItem = items[i];

      ctx.fillText(`${i + 1}`, slotLeft + 4, slotsTop + 20);

      if (inventoryItem === undefined) {
        continue;
      }

      const image = this.assetManager.getWithDirection(
        getItemAssetKey(inventoryItem),
        Direction.Right
      );
      ctx.drawImage(image, slotLeft, slotsTop, slotSize, slotSize);
    }

    ctx.restore();
  }
}
