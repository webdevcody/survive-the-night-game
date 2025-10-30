import { Extension, ExtensionSerialized } from "@/extensions/types";
import { InventoryItem, ITEM_TYPES, ItemType } from "../../../game-shared/src/util/inventory";
import { recipes, RecipeType } from "../../../game-shared/src/util/recipes";
import { Broadcaster } from "@/managers/types";
import { PlayerPickedUpItemEvent } from "@shared/events/server-sent/pickup-item-event";
import Positionable from "@/extensions/positionable";
import { IEntity } from "@/entities/types";
import { MAX_INVENTORY_SLOTS } from "@/constants/constants";
import Vector2 from "@/util/vector2";
import { WEAPON_TYPE_VALUES } from "@shared/types/weapons";

export default class Inventory implements Extension {
  public static readonly type = "inventory";

  private self: IEntity;
  private items: InventoryItem[] = [];
  private broadcaster: Broadcaster;

  public constructor(self: IEntity, broadcaster: Broadcaster) {
    this.self = self;
    this.broadcaster = broadcaster;
  }

  public getItems(): InventoryItem[] {
    return this.items;
  }

  public isFull(): boolean {
    // Count non-null items instead of array length to support sparse arrays
    const itemCount = this.items.filter((item) => item != null).length;
    return itemCount >= MAX_INVENTORY_SLOTS;
  }

  public hasItem(itemType: ItemType): boolean {
    return this.items.some((it) => it?.itemType === itemType);
  }

  public addItem(item: InventoryItem): void {
    if (this.isFull()) return;

    // Find first empty slot (null/undefined) to fill
    const emptySlotIndex = this.items.findIndex((it) => it == null);
    if (emptySlotIndex !== -1) {
      this.items[emptySlotIndex] = item;
    } else {
      // No empty slots, push to end
      this.items.push(item);
    }

    this.broadcaster.broadcastEvent(
      new PlayerPickedUpItemEvent({
        playerId: this.self.getId(),
        itemType: item.itemType,
      })
    );
  }

  public removeItem(index: number): InventoryItem | undefined {
    // Don't use splice - just set to null to preserve inventory positions
    const item = this.items[index];
    if (item != null) {
      this.items[index] = null as any;
    }
    return item;
  }

  public updateItemState(index: number, state: any): void {
    if (index >= 0 && index < this.items.length && this.items[index] != null) {
      this.items[index].state = state;
    }
  }

  public getActiveItem(index: number | null): InventoryItem | null {
    if (index === null) return null;
    // TODO: refactor this to be 0 based, why are we subtracting 1?
    return this.items[index - 1] ?? null;
  }

  public getActiveWeapon(activeItem: InventoryItem | null): InventoryItem | null {
    const activeItemType = activeItem?.itemType ?? "";
    return WEAPON_TYPE_VALUES.includes(activeItemType as any) ? activeItem : null;
  }

  public craftRecipe(recipe: RecipeType): void {
    const foundRecipe = recipes.find((it) => it.getType() === recipe);
    if (foundRecipe === undefined) return;
    this.items = foundRecipe.craft(this.items);
  }

  public addRandomItem(chance = 1): this {
    const items = ITEM_TYPES;
    if (Math.random() < chance) {
      const item = { itemType: items[Math.floor(Math.random() * items.length)] };
      this.addItem(item);
    }
    return this;
  }

  public clear(): void {
    this.items = [];
  }

  public scatterItems(position: { x: number; y: number }): void {
    const offset = 32;
    this.items.forEach((item) => {
      if (item == null) return; // Skip null/undefined items
      const entity = this.createEntityFromItem(item);
      if (!entity) return;
      const theta = Math.random() * 2 * Math.PI;
      const radius = Math.random() * offset;
      const pos = new Vector2(
        position.x + radius * Math.cos(theta),
        position.y + radius * Math.sin(theta)
      );

      if ("setPosition" in entity) {
        (entity as any).setPosition(pos);
      } else if (entity.hasExt(Positionable)) {
        entity.getExt(Positionable).setPosition(pos);
      }

      this.self.getEntityManager()?.addEntity(entity);
    });
    this.items = [];
  }

  private createEntityFromItem(item: InventoryItem) {
    return this.self.getEntityManager()!.createEntityFromItem(item);
  }

  public serialize(): ExtensionSerialized {
    return {
      type: Inventory.type,
      items: this.items,
    };
  }
}
