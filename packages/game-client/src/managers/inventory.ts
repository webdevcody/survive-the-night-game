import { InventoryItem } from "@survive-the-night/game-server";
import { InputManager } from "./input";

const MAX_ITEMS = 5;

export class InventoryManager {
  private inputManager: InputManager;
  private items: InventoryItem[] = [];

  public constructor(inputManager: InputManager) {
    this.inputManager = inputManager;
  }

  public setItems(items: InventoryItem[]) {
    this.items = items;
  }

  public getActive(): InventoryItem | null {
    const { inventoryItem } = this.inputManager.getInputs();

    for (const item of this.items) {
      if (item.hotbarPosition === inventoryItem) {
        return item;
      }
    }

    return null;
  }

  public getHotbarItems(): InventoryItem[] {
    const hotbarItems: InventoryItem[] = [];

    for (let i = 0; i < MAX_ITEMS; i++) {
      for (const item of this.items) {
        if (item.hotbarPosition === i) {
          hotbarItems.push(item);
          break;
        }
      }
    }

    return hotbarItems;
  }

  public getItemsNumber(): number {
    return MAX_ITEMS;
  }
}
