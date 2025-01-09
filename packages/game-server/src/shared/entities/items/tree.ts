import { Entities } from "../../entities";
import { EntityManager } from "../../../managers/entity-manager";
import { Interactive, Positionable, Carryable } from "../../extensions";
import { Player } from "../player";
import { Entity } from "../../entity";

export class Tree extends Entity {
  public static readonly Size = 16;

  constructor(entityManager: EntityManager) {
    super(entityManager, Entities.TREE);

    this.extensions = [
      new Positionable(this).setSize(Tree.Size),
      new Interactive(this).onInteract(this.interact.bind(this)).setDisplayName("wood"),
      new Carryable(this, "wood"),
    ];
  }

  private interact(player: Player): void {
    this.getExt(Carryable).pickup(player);
  }
}
