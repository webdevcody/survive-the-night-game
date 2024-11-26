import { InputManager } from "./input";

interface InventoryItem {
  active: boolean;
  key: string;
}

export class InventoryManager {
  private inputManager: InputManager;

  public constructor(inputManager: InputManager) {
    this.inputManager = inputManager;
  }

  public getActive(): InventoryItem | null {
    return this.getItems().find((item) => item.active) ?? null;
  }

  public getItems(): InventoryItem[] {
    const items = [
      {
        active: false,
        key: "Knife",
      },
      {
        active: false,
        key: "Pistol",
      },
      {
        active: false,
        key: "Shotgun",
      },
    ];

    const activeItem = items[this.inputManager.getInputs().inventoryItem];

    if (activeItem !== undefined) {
      activeItem.active = true;
    }

    return items;
  }

  public getItemsNumber(): number {
    return 5;
  }
}
