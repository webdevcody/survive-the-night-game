import { Entities } from "@survive-the-night/game-shared";
import { EntityManager } from "../../../managers/entity-manager";
import { Entity } from "../../entity";
import { Illuminated, Interactive, Positionable, Carryable } from "../../extensions";
import { Player } from "../player";

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
