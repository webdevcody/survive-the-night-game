import { Extension } from "@/extensions/types";
import { PlayerPickedUpItemEvent } from "@/events/server-sent/pickup-item-event";
import Inventory from "@/extensions/inventory";
import { ItemType } from "@/util/inventory";
import { IEntity } from "@/entities/types";
import { ItemState } from "@/types/entity";
import { BufferWriter } from "@shared/util/buffer-serialization";
import { encodeExtensionType } from "@shared/util/extension-type-encoding";
import { ExtensionBase } from "./extension-base";

interface PickupOptions {
  state?: ItemState;
  mergeStrategy?: (existingState: ItemState, pickupState: ItemState) => ItemState;
}

export default class Carryable extends ExtensionBase {
  public static readonly type = "carryable" as const;

  public constructor(self: IEntity, itemType: ItemType) {
    super(self, { itemType, state: {} });
  }

  public setItemState(state: ItemState): this {
    const serialized = this.serialized as any;
    serialized.state = state;
    return this;
  }

  public getItemState(): ItemState {
    const serialized = this.serialized as any;
    return serialized.state;
  }

  public getItemType(): ItemType {
    const serialized = this.serialized as any;
    return serialized.itemType;
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
    const serialized = this.serialized as any;
    const itemType = serialized.itemType;

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
    const serialized = this.serialized as any;
    writer.writeUInt8(encodeExtensionType(Carryable.type));
    writer.writeString(serialized.itemType);
    writer.writeRecord(serialized.state, (value) => writer.writeFloat64(value as number));
  }
}
