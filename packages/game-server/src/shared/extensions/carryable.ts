import { Entity } from "../entities";
import { Extension, ExtensionSerialized } from "./types";
import { Player } from "../entities/player";
import { ItemType } from "../inventory";
import { PlayerPickedUpItemEvent } from "../events/server-sent/pickup-item-event";

export default class Carryable implements Extension {
  public static readonly type = "carryable" as const;

  private self: Entity;
  private itemKey: ItemType;

  public constructor(self: Entity, itemKey: ItemType) {
    this.self = self;
    this.itemKey = itemKey;
  }

  public pickup(player: Player): boolean {
    if (player.isInventoryFull()) {
      return false;
    }

    player.getInventory().push({ key: this.itemKey });
    this.self.getEntityManager().markEntityForRemoval(this.self);

    this.self
      .getEntityManager()
      .getSocketManager()
      .broadcastEvent(
        new PlayerPickedUpItemEvent({
          playerId: player.getId(),
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
