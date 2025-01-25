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
    this.renderInventory(ctx, gameState);
  }

  public getZIndex(): number {
    return Z_INDEX.UI;
  }

  private renderInventory(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    const { width: canvasWidth, height: canvasHeight } = ctx.canvas;

    const { slotSize, padding, slotsGap, screenMarginBottom, background, active } =
      HOTBAR_SETTINGS.Inventory;
    const slotsNumber = MAX_INVENTORY_SLOTS;

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
    const slotsBottom = slotsTop + slotSize;
    const items = this.getInventory();
    console.log("items", items);
    const activeItemIdx = this.inputManager.getInputs().inventoryItem - 1;

    for (let i = 0; i < slotsNumber; i++) {
      this.renderSlot(
        slotsLeft,
        i,
        slotSize,
        slotsGap,
        ctx,
        activeItemIdx,
        active,
        background,
        slotsTop,
        items,
        slotsBottom
      );
    }

    ctx.restore();
  }

  private renderSlot(
    slotsLeft: number,
    i: number,
    slotSize: number,
    slotsGap: number,
    ctx: CanvasRenderingContext2D,
    activeItemIdx: number,
    active: { background: string },
    background: string,
    slotsTop: number,
    items: InventoryItem[],
    slotsBottom: number
  ) {
    const slotLeft = slotsLeft + i * (slotSize + slotsGap);
    const slotRight = slotLeft + slotSize;

    ctx.fillStyle = activeItemIdx === i ? active.background : background;
    ctx.fillRect(slotLeft, slotsTop, slotSize, slotSize);

    ctx.font = "32px Arial";
    ctx.textAlign = "left";

    const inventoryItem = items[i];

    const image = inventoryItem && this.assetManager.get(getItemAssetKey(inventoryItem));
    if (image) {
      ctx.drawImage(image, slotLeft, slotsTop, slotSize, slotSize);
    }

    ctx.fillStyle = "white";
    ctx.fillText(`${i + 1}`, slotLeft + 4, slotsTop + 30);

    if (inventoryItem?.state?.count) {
      ctx.textAlign = "right";
      ctx.fillStyle = "white";
      ctx.fillText(`${inventoryItem.state.count}`, slotRight - 4, slotsBottom - 4);
    }
  }
}
