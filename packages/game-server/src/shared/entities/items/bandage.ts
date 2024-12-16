import { EntityManager } from "../../../managers/entity-manager";
import { Entity, Entities } from "../../entities";
import { Consumable, Interactive, Positionable } from "../../extensions";
import { Player } from "../player";

export class Bandage extends Entity {
  public static readonly healingAmount = 5;

  constructor(entityManager: EntityManager) {
    super(entityManager, Entities.BANDAGE);

    this.extensions = [
      new Positionable(this),
      new Consumable(this).onConsume(this.consume.bind(this)),
      new Interactive(this).onInteract(this.interact.bind(this)),
    ];
  }

  private consume(player: Player, idx: number): void {
    const healAmount = Math.min(Bandage.healingAmount, player.getMaxHealth() - player.getHealth());

    if (healAmount === 0) {
      return;
    }

    player.heal(healAmount);
    player.getInventory().splice(idx, 1);
  }

  private interact(player: Player): void {
    if (player.isInventoryFull()) {
      return;
    }

    player.getInventory().push({ key: "Bandage" });
    this.getEntityManager().markEntityForRemoval(this);
  }
}
