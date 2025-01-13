import { Entities } from "@survive-the-night/game-shared";
import { EntityManager } from "../../../managers/entity-manager";
import { Entity } from "../../entity";
import { Player } from "../player";
import Positionable from "../../extensions/positionable";
import Interactive from "../../extensions/interactive";
import Carryable from "../../extensions/carryable";

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
