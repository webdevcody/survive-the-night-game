import { IEntityManager } from "../../../managers/types";
import { Entity } from "../../entity";
import { Entities } from "@survive-the-night/game-shared/src/constants";
import Carryable from "../../extensions/carryable";
import Interactive from "../../extensions/interactive";
import Positionable from "../../extensions/positionable";

export class Tree extends Entity {
  public static readonly Size = 16;

  constructor(entityManager: IEntityManager) {
    super(entityManager, Entities.TREE);

    this.extensions = [
      new Positionable(this).setSize(Tree.Size),
      new Interactive(this).onInteract(this.interact.bind(this)).setDisplayName("wood"),
      new Carryable(this, "wood"),
    ];
  }

  private interact(entityId: string): void {
    this.getExt(Carryable).pickup(entityId);
  }
}
