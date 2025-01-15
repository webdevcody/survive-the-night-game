import { Extension, ExtensionSerialized } from "@/extensions/types";
import { PlayerPickedUpItemEvent } from "@/events/server-sent/pickup-item-event";
import Inventory from "@/extensions/inventory";
import { ItemType } from "@shared/geom/inventory";
import { IEntity } from "@shared/geom/types";

interface PickupOptions {
  state?: any;
  mergeStrategy?: (existingState: any, pickupState: any) => any;
}

export default class Carryable implements Extension {
  public static readonly type = "carryable" as const;

  private self: IEntity;
  private itemKey: ItemType;

  public constructor(self: IEntity, itemKey: ItemType) {
    this.self = self;
    this.itemKey = itemKey;
  }

  public pickup(entityId: string, options?: PickupOptions): boolean {
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
      const existingItemIndex = inventory.getItems().findIndex((item) => item.key === this.itemKey);
      if (existingItemIndex >= 0) {
        const existingItem = inventory.getItems()[existingItemIndex];
        const newState = options.mergeStrategy(existingItem.state, options.state);
        inventory.updateItemState(existingItemIndex, newState);
        this.self.getEntityManager().markEntityForRemoval(this.self);
        return true;
      }
    }

    // Otherwise add as new item
    if (inventory.isFull()) {
      return false;
    }

    inventory.addItem({
      key: this.itemKey,
      state: options?.state,
    });

    this.self.getEntityManager().markEntityForRemoval(this.self);

    this.self
      .getEntityManager()
      .getBroadcaster()
      .broadcastEvent(
        new PlayerPickedUpItemEvent({
          playerId: entityId,
          itemKey: this.itemKey,
        })
      );

    return true;
  }

  public deserialize(data: ExtensionSerialized): this {
    this.itemKey = data.itemKey;
    return this;
  }

  public serialize(): ExtensionSerialized {
    return {
      type: Carryable.type,
      itemKey: this.itemKey,
    };
  }
}
