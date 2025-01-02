import { EntityManager } from "../../managers/entity-manager";
import { Entity, Entities, RawEntity } from "../entities";
import { Collidable, Destructible, Interactive, Positionable, Carryable } from "../extensions";
import { Player } from "./player";

export class Wall extends Entity {
  public static readonly Size = 16;
  public static readonly MAX_HEALTH = 3;

  constructor(entityManager: EntityManager, health?: number) {
    super(entityManager, Entities.WALL);

    this.extensions = [
      new Positionable(this).setSize(Wall.Size),
      new Collidable(this).setSize(Wall.Size),
      new Interactive(this).onInteract(this.interact.bind(this)),
      new Destructible(this)
        .setMaxHealth(Wall.MAX_HEALTH)
        .setHealth(health ?? Wall.MAX_HEALTH)
        .onDeath(() => this.onDeath()),
      new Carryable(this, "wall"),
    ];
  }

  private interact(player: Player): void {
    const carryable = this.getExt(Carryable);
    if (carryable.pickup(player)) {
      const inventoryItem = player.getInventory()[player.getInventory().length - 1];
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
      ...this.baseSerialize(),
      health: this.getExt(Destructible).getHealth(),
    };
  }
}
