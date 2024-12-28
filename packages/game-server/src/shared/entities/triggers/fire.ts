
import { EntityManager } from "../../../managers/entity-manager";
import { Entity, Entities } from "../../entities";
import { Interactive, Positionable } from "../../extensions";
import { Player } from "../player";

export class Cloth extends Entity {
  public static readonly Size = 16;

  constructor(entityManager: EntityManager) {
    super(entityManager, Entities.CLOTH);

    this.extensions = [
      new Positionable(this).setSize(Cloth.Size),
      new Interactive(this).onInteract(this.interact.bind(this)),
    ];
  }

  private interact(player: Player): void {
    if (player.isInventoryFull()) {
      return;
    }

    player.getInventory().push({ key: "Cloth" });
    this.getEntityManager().markEntityForRemoval(this);
  }
}
