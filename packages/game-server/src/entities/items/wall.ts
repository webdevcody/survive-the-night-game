import Carryable from "@/extensions/carryable";
import Collidable from "@/extensions/collidable";
import Destructible from "@/extensions/destructible";
import Interactive from "@/extensions/interactive";
import Inventory from "@/extensions/inventory";
import Positionable from "@/extensions/positionable";
import { IGameManagers } from "@/managers/types";
import { Entities } from "@/constants";
import { Entity } from "@/entities/entity";
import { RawEntity } from "@/types/entity";

export class Wall extends Entity {
  public static readonly Size = 16;
  public static readonly MAX_HEALTH = 3;

  constructor(gameManagers: IGameManagers, health?: number) {
    super(gameManagers, Entities.WALL);

    this.extensions = [
      new Positionable(this).setSize(Wall.Size),
      new Collidable(this).setSize(Wall.Size),
      new Interactive(this).onInteract(this.interact.bind(this)).setDisplayName("wall"),
      new Destructible(this)
        .setMaxHealth(Wall.MAX_HEALTH)
        .setHealth(health ?? Wall.MAX_HEALTH)
        .onDeath(() => this.onDeath()),
      new Carryable(this, "wall"),
    ];
  }

  private interact(entityId: string): void {
    const carryable = this.getExt(Carryable);
    if (carryable.pickup(entityId)) {
      const entity = this.getEntityManager().getEntityById(entityId);
      if (!entity) {
        return;
      }

      const inventory = entity.getExt(Inventory);
      if (!inventory) {
        return;
      }

      const inventoryItem = inventory.getItems()[inventory.getItems().length - 1];
      inventoryItem.state = {
        health: this.getExt(Destructible).getHealth(),
      };
    }
  }

  private onDeath(): void {
    this.getEntityManager().markEntityForRemoval(this);
  }

  public serialize(): RawEntity {
    return {
      ...super.serialize(),
      health: this.getExt(Destructible).getHealth(),
    };
  }
}
