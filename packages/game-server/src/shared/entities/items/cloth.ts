import { EntityManager } from "../../../managers/entity-manager";
import { Entity, Entities } from "../../entities";
import { Interactive, Positionable, Carryable } from "../../extensions";
import { Player } from "../player";

export class Cloth extends Entity {
  public static readonly Size = 16;

  constructor(entityManager: EntityManager) {
    super(entityManager, Entities.CLOTH);

    this.extensions = [
      new Positionable(this).setSize(Cloth.Size),
      new Interactive(this).onInteract(this.interact.bind(this)).setDisplayName("cloth"),
      new Carryable(this, "cloth"),
    ];

    entityManager.registerItem("cloth", Cloth);
  }

  private interact(player: Player): void {
    this.getExt(Carryable).pickup(player);
  }
}
