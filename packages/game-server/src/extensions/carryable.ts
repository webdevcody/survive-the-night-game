import { Extension } from "@/extensions/types";
import { PlayerPickedUpItemEvent } from "../../../game-shared/src/events/server-sent/events/pickup-item-event";
import Inventory from "@/extensions/inventory";
import { ItemType } from "@/util/inventory";
import { IEntity } from "@/entities/types";
import { ItemState } from "@/types/entity";
import { BufferWriter } from "@shared/util/buffer-serialization";
import { encodeExtensionType } from "@shared/util/extension-type-encoding";
import { itemTypeRegistry } from "@shared/util/item-type-encoding";
import { writeItemState } from "@shared/util/item-state-serialization";
import { ExtensionBase } from "./extension-base";

interface PickupOptions {
  state?: ItemState;
  mergeStrategy?: (existingState: ItemState, pickupState: ItemState) => ItemState;
}

type CarryableFields = {
  itemType: ItemType;
  state: ItemState;
};

export default class Carryable extends ExtensionBase<CarryableFields> {
  public static readonly type = "carryable" as const;

  public constructor(self: IEntity, itemType: ItemType) {
    super(self, { itemType, state: {} });
  }

  public setItemState(state: ItemState): this {
    this.serialized.set("state", state);
    return this;
  }

  public getItemState(): ItemState {
    return this.serialized.get("state");
  }

  public getItemType(): ItemType {
    return this.serialized.get("itemType");
  }

  /**
   * Creates pickup options for stackable items that preserve count when dropped and picked up.
   * This ensures that when a stacked item is dropped and picked back up, it maintains its count.
   */
  public static createStackablePickupOptions(
    carryable: Carryable,
    defaultCount: number
  ): PickupOptions {
    const currentCount = carryable.getItemState().count ?? defaultCount;
    return {
      state: { count: currentCount },
      mergeStrategy: (existing, pickup) => ({
        count: (existing?.count || 0) + (pickup?.count || defaultCount),
      }),
    };
  }

  public pickup(entityId: number, options?: PickupOptions): boolean {
    const itemType = this.serialized.get("itemType");

    // Prevent crash if itemType is null (entity may be in invalid state)
    if (!itemType) {
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
        .findIndex((item) => item != null && item.itemType === itemType);
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
      itemType: itemType,
      state: options?.state,
    });

    this.self.getEntityManager().markEntityForRemoval(this.self);

    this.self
      .getEntityManager()
      .getBroadcaster()
      .broadcastEvent(
        new PlayerPickedUpItemEvent({
          playerId: entityId,
          itemType: itemType,
        })
      );

    return true;
  }

  public serializeToBuffer(writer: BufferWriter, onlyDirty: boolean = false): void {
    writer.writeUInt8(encodeExtensionType(Carryable.type));
    writer.writeUInt8(itemTypeRegistry.encode(this.serialized.get("itemType")));
    writeItemState(writer, this.serialized.get("state"));
  }
}
