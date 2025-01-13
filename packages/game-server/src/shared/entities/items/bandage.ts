import { Entities } from "@survive-the-night/game-shared/src/constants";
import { IEntityManager } from "../../../managers/types";
import { Entity } from "../../entity";
import Interactive from "../../extensions/interactive";
import Positionable from "../../extensions/positionable";
import Carryable from "../../extensions/carryable";
import Consumable from "../../extensions/consumable";
import Destructible from "../../extensions/destructible";
import Inventory from "../../extensions/inventory";

export class Bandage extends Entity {
  public static readonly Size = 16;
  public static readonly healingAmount = 5;

  constructor(entityManager: IEntityManager) {
    super(entityManager, Entities.BANDAGE);

    this.extensions = [
      new Positionable(this).setSize(Bandage.Size),
      new Interactive(this).onInteract(this.interact.bind(this)).setDisplayName("bandage"),
      new Consumable(this).onConsume(this.consume.bind(this)),
      new Carryable(this, "bandage"),
    ];
  }

  private consume(entityId: string, idx: number): void {
    const entity = this.getEntityManager().getEntityById(entityId);
    if (!entity) {
      return;
    }

    const destructible = entity.getExt(Destructible);
    if (!destructible) {
      return;
    }

    const healAmount = Math.min(
      Bandage.healingAmount,
      destructible.getMaxHealth() - destructible.getHealth()
    );

    if (healAmount === 0) {
      return;
    }

    destructible.heal(healAmount);

    const inventory = entity.getExt(Inventory);
    if (!inventory) {
      return;
    }

    inventory.removeItem(idx);
  }

  private interact(entityId: string): void {
    const entity = this.getEntityManager().getEntityById(entityId);
    if (!entity) {
      return;
    }

    this.getExt(Carryable).pickup(entityId);
  }
}
