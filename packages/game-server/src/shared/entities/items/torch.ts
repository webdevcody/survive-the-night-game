import { Entities } from "@survive-the-night/game-shared";
import { EntityManager } from "../../../managers/entity-manager";
import { Entity } from "../../entity";
import { Player } from "../player";
import Carryable from "../../extensions/carryable";
import Illuminated from "../../extensions/illuminated";
import Interactive from "../../extensions/interactive";
import Positionable from "../../extensions/positionable";

export class Torch extends Entity {
  public static readonly Size = 16;

  constructor(entityManager: EntityManager) {
    super(entityManager, Entities.TORCH);

    this.extensions = [
      new Positionable(this).setSize(Torch.Size),
      new Interactive(this).onInteract(this.interact.bind(this)).setDisplayName("torch"),
      new Carryable(this, "torch"),
      new Illuminated(this, 200),
    ];
  }

  private interact(player: Player): void {
    this.getExt(Carryable).pickup(player);
  }
}
