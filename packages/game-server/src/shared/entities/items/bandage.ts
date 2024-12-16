import { EntityManager } from "../../../managers/entity-manager";
import { Entity, Entities, RawEntity } from "../../entities";
import { Interactable, PositionableTrait, Consumable } from "../../traits";
import { Vector2 } from "../../physics";
import { Player } from "../player";

export class Bandage extends Entity implements PositionableTrait, Interactable, Consumable {
  private position: Vector2 = {
    x: 0,
    y: 0,
  };
  public static readonly healingAmount = 5;

  constructor(entityManager: EntityManager) {
    super(entityManager, Entities.BANDAGE);
  }

  getPosition(): Vector2 {
    return this.position;
  }

  interact(player: Player): void {
    if (player.isInventoryFull()) {
      return;
    }
    player.getInventory().push({
      key: "Bandage",
    });
    this.getEntityManager().markEntityForRemoval(this);
  }

  setPosition(position: Vector2): void {
    this.position = position;
  }

  serialize(): RawEntity {
    return {
      ...super.serialize(),
      position: this.position,
    };
  }

  getCenterPosition(): Vector2 {
    return this.position;
  }

  consume(player: Player): boolean {
    const healAmount = Math.min(Bandage.healingAmount, player.getMaxHealth() - player.getHealth());

    if (healAmount > 0) {
      player.heal(healAmount);
      return true;
    }
    return false;
  }
}
