import { Entities } from "@survive-the-night/game-shared/src/constants";
import { RawEntity } from "@survive-the-night/game-shared/src/types/entity";
import { IEntityManager } from "../../../managers/types";
import { Entity } from "../../entity";
import Carryable from "../../extensions/carryable";
import Collidable from "../../extensions/collidable";
import Destructible from "../../extensions/destructible";
import Interactive from "../../extensions/interactive";
import Positionable from "../../extensions/positionable";
import Inventory from "@/shared/extensions/inventory";

export class Wall extends Entity {
  public static readonly Size = 16;
  public static readonly MAX_HEALTH = 3;

  constructor(entityManager: IEntityManager, health?: number) {
    super(entityManager, Entities.WALL);

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
