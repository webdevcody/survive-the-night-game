import { Entity } from "../entity";
import { Extension, ExtensionSerialized } from "./types";
import { ItemType } from "../inventory";
import { PlayerPickedUpItemEvent } from "../events/server-sent/pickup-item-event";
import Inventory from "./inventory";

export default class Carryable implements Extension {
  public static readonly type = "carryable" as const;

  private self: Entity;
  private itemKey: ItemType;

  public constructor(self: Entity, itemKey: ItemType) {
    this.self = self;
    this.itemKey = itemKey;
  }

  public pickup(entityId: string): boolean {
    const entity = this.self.getEntityManager().getEntityById(entityId);
    if (!entity) {
      return false;
    }

    const inventory = entity.getExt(Inventory);

    if (inventory.isFull()) {
      return false;
    }

    inventory.addItem({ key: this.itemKey });
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
