import { Entities } from "@survive-the-night/game-shared/src/constants";
import { IEntityManager } from "../../../managers/types";
import { Entity } from "../../entity";
import Positionable from "../../extensions/positionable";
import Interactive from "../../extensions/interactive";
import Carryable from "../../extensions/carryable";

export class Cloth extends Entity {
  public static readonly Size = 16;

  constructor(entityManager: IEntityManager) {
    super(entityManager, Entities.CLOTH);

    this.extensions = [
      new Positionable(this).setSize(Cloth.Size),
      new Interactive(this).onInteract(this.interact.bind(this)).setDisplayName("cloth"),
      new Carryable(this, "cloth"),
    ];
  }

  private interact(entityId: string): void {
    this.getExt(Carryable).pickup(entityId);
  }
}
