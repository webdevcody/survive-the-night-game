import { Extension, ExtensionSerialized } from "@/extensions/types";
import { PlayerPickedUpItemEvent } from "@/events/server-sent/pickup-item-event";
import Inventory from "@/extensions/inventory";
import { ItemType } from "@/util/inventory";
import { IEntity } from "@/entities/types";
import { ItemState } from "@/types/entity";

interface PickupOptions {
  state?: ItemState;
  mergeStrategy?: (existingState: ItemState, pickupState: ItemState) => ItemState;
}

export default class Carryable implements Extension {
  public static readonly type = "carryable" as const;

  private self: IEntity;
  private itemType: ItemType;
  private state: ItemState = {};
  private dirty: boolean = false;

  public constructor(self: IEntity, itemType: ItemType) {
    this.self = self;
    this.itemType = itemType;
    this.state = {};
  }

  public setItemState(state: ItemState): this {
    const stateChanged = JSON.stringify(this.state) !== JSON.stringify(state);
    this.state = state;
    if (stateChanged) {
      this.markDirty();
    }
    return this;
  }

  public getItemState(): ItemState {
    return this.state;
  }

  public pickup(entityId: string, options?: PickupOptions): boolean {
    // Prevent crash if itemType is null (entity may be in invalid state)
    if (!this.itemType) {
      console.warn("Attempted to pickup item with null itemType");
      return false;
    }

    const entity = this.self.getEntityManager().getEntityById(entityId);
    if (!entity) {
      return false;
    }

    const inventory = entity.getExt(Inventory);

    if (inventory.isFull() && !options?.mergeStrategy) {
      return false;
    }

    // If we have a merge strategy and existing item, merge instead of adding new
    if (options?.mergeStrategy) {
      const existingItemIndex = inventory
        .getItems()
        .findIndex((item) => item != null && item.itemType === this.itemType);
      if (existingItemIndex >= 0) {
        const existingItem = inventory.getItems()[existingItemIndex];
        if (existingItem) {
          const newState = options.mergeStrategy(existingItem.state ?? {}, options.state ?? {});
          inventory.updateItemState(existingItemIndex, newState);
          this.self.getEntityManager().markEntityForRemoval(this.self);
          return true;
        }
      }
    }

    // Otherwise add as new item
    if (inventory.isFull()) {
      return false;
    }

    inventory.addItem({
      itemType: this.itemType,
      state: options?.state,
    });

    this.self.getEntityManager().markEntityForRemoval(this.self);

    this.self
      .getEntityManager()
      .getBroadcaster()
      .broadcastEvent(
        new PlayerPickedUpItemEvent({
          playerId: entityId,
          itemType: this.itemType,
        })
      );

    return true;
  }

  public isDirty(): boolean {
    return this.dirty;
  }

  public markDirty(): void {
    this.dirty = true;
    if (this.self.markExtensionDirty) {
      this.self.markExtensionDirty(this);
    }
  }

  public clearDirty(): void {
    this.dirty = false;
  }

  public serializeDirty(): ExtensionSerialized | null {
    if (!this.dirty) {
      return null;
    }
    return this.serialize();
  }

  public serialize(): ExtensionSerialized {
    return {
      type: Carryable.type,
      itemType: this.itemType,
      state: this.state,
    };
  }
}
