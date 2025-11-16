import { Extension } from "@/extensions/types";
import { PlayerPickedUpItemEvent } from "@/events/server-sent/pickup-item-event";
import Inventory from "@/extensions/inventory";
import { ItemType } from "@/util/inventory";
import { IEntity } from "@/entities/types";
import { ItemState } from "@/types/entity";
import { BufferWriter } from "@shared/util/buffer-serialization";
import { encodeExtensionType } from "@shared/util/extension-type-encoding";

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

  public serializeToBuffer(writer: BufferWriter): void {
    writer.writeUInt32(encodeExtensionType(Carryable.type));
    writer.writeString(this.itemType);
    // Serialize ItemState as record (values are always numbers)
    writer.writeRecord(this.state, (value) => writer.writeFloat64(value as number));
  }
}
