import { EntityManager } from "../../managers/entity-manager";
import { Entity, Entities } from "../entities";
import { Collidable, Destructible, Interactive, Positionable } from "../extensions";
import Ignitable from "../extensions/ignitable";
import { Player } from "./player";

export class Wall extends Entity {
  public static readonly MaxHealth = 5;
  public static readonly Size = 16;

  constructor(entityManager: EntityManager, health?: number) {
    super(entityManager, Entities.WALL);

    this.extensions = [
      new Positionable(this).setSize(Wall.Size),
      new Collidable(this),
      new Destructible(this)
        .setMaxHealth(Wall.MaxHealth)
        .setHealth(health ?? Wall.MaxHealth)
        .onDeath(this.onDeath.bind(this)),
      new Interactive(this).onInteract(this.interact.bind(this)),
    ];
  }

  private onDeath() {
    this.getEntityManager().markEntityForRemoval(this);
  }

  private interact(player: Player): void {
    if (player.isInventoryFull()) {
      return;
    }

    player.getInventory().push({
      key: "Wall",
      state: {
        health: this.getExt(Destructible).getHealth(),
      },
    });

    this.getEntityManager().markEntityForRemoval(this);
  }
}
