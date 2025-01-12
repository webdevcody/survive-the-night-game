import { Entities } from "@survive-the-night/game-shared";
import { EntityManager } from "../../../managers/entity-manager";
import { Entity } from "../../entity";
import { Player } from "../player";
import Interactive from "../../extensions/interactive";
import Positionable from "../../extensions/positionable";
import Carryable from "../../extensions/carryable";
import Consumable from "../../extensions/consumable";

export class Bandage extends Entity {
  public static readonly Size = 16;
  public static readonly healingAmount = 5;

  constructor(entityManager: EntityManager) {
    super(entityManager, Entities.BANDAGE);

    this.extensions = [
      new Positionable(this).setSize(Bandage.Size),
      new Interactive(this).onInteract(this.interact.bind(this)).setDisplayName("bandage"),
      new Consumable(this).onConsume(this.consume.bind(this)),
      new Carryable(this, "bandage"),
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
    this.getExt(Carryable).pickup(player);
  }
}
