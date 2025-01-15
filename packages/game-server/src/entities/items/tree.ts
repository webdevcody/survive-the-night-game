import Carryable from "@/extensions/carryable";
import Interactive from "@/extensions/interactive";
import Positionable from "@/extensions/positionable";
import { IGameManagers } from "@/managers/types";
import { Entities } from "@shared/constants";
import { Entity } from "@shared/geom/entity";

export class Tree extends Entity {
  public static readonly Size = 16;

  constructor(gameManagers: IGameManagers) {
    super(gameManagers, Entities.TREE);

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
