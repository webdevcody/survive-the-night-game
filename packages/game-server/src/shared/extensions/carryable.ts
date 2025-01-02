import { Entity } from "../entities";
import { Extension, ExtensionNames, ExtensionSerialized } from "./types";
import { Player } from "../entities/player";
import { ItemType } from "../inventory";
import { EntityManager } from "../../managers/entity-manager";

export default class Carryable implements Extension {
  public static readonly Name = "carryable" as const;

  private self: Entity;
  private itemKey: ItemType;

  public constructor(self: Entity, itemKey: ItemType) {
    this.self = self;
    this.itemKey = itemKey;

    // Auto-register this entity type for the given item key
    // SERVER ONLY LOGIC
    self
      .getEntityManager?.()
      .registerItem(itemKey, self.constructor as new (entityManager: EntityManager) => Entity);
  }

  public pickup(player: Player): boolean {
    if (player.isInventoryFull()) {
      return false;
    }

    player.getInventory().push({ key: this.itemKey });
    this.self.getEntityManager().markEntityForRemoval(this.self);
    return true;
  }

  public deserialize(data: ExtensionSerialized): this {
    this.itemKey = data.itemKey;
    return this;
  }

  public serialize(): ExtensionSerialized {
    return {
      name: Carryable.Name,
      itemKey: this.itemKey,
    };
  }
}
