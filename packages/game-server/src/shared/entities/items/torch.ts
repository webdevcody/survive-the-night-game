import { Entities } from "@survive-the-night/game-shared/src/constants";
import { IEntityManager } from "../../../managers/types";
import { Entity } from "../../entity";
import Carryable from "../../extensions/carryable";
import Illuminated from "../../extensions/illuminated";
import Interactive from "../../extensions/interactive";
import Positionable from "../../extensions/positionable";

export class Torch extends Entity {
  public static readonly Size = 16;

  constructor(entityManager: IEntityManager) {
    super(entityManager, Entities.TORCH);

    this.extensions = [
      new Positionable(this).setSize(Torch.Size),
      new Interactive(this).onInteract(this.interact.bind(this)).setDisplayName("torch"),
      new Carryable(this, "torch"),
      new Illuminated(this, 200),
    ];
  }

  private interact(entityId: string): void {
    this.getExt(Carryable).pickup(entityId);
  }
}
