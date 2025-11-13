import { Entities } from "@shared/constants";
import { IGameManagers } from "@/managers/types";
import Carryable from "@/extensions/carryable";
import Consumable from "@/extensions/consumable";
import Destructible from "@/extensions/destructible";
import Interactive from "@/extensions/interactive";
import Inventory from "@/extensions/inventory";
import Positionable from "@/extensions/positionable";
import { Entity } from "@/entities/entity";
import Vector2 from "@/util/vector2";
import { ItemState } from "@/types/entity";

export class Bandage extends Entity {
  public static readonly Size = new Vector2(16, 16);
  public static readonly healingAmount = 5;
  public static readonly DEFAULT_COUNT = 1;

  constructor(gameManagers: IGameManagers, itemState?: ItemState) {
    super(gameManagers, Entities.BANDAGE);

    const count = itemState?.count ?? Bandage.DEFAULT_COUNT;

    this.extensions = [
      new Positionable(this).setSize(Bandage.Size),
      new Interactive(this).onInteract(this.interact.bind(this)).setDisplayName("bandage"),
      new Consumable(this).onConsume(this.consume.bind(this)),
      new Carryable(this, "bandage").setItemState({ count }),
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

    // Handle stackable bandages - decrement count instead of removing
    const bandageItem = inventory.getItems()[idx];
    if (bandageItem?.state?.count && bandageItem.state.count > 1) {
      // Decrement count
      inventory.updateItemState(idx, { count: bandageItem.state.count - 1 });
    } else {
      // Remove item if count is 1 or undefined
      inventory.removeItem(idx);
    }
  }

  private interact(entityId: string): void {
    const entity = this.getEntityManager().getEntityById(entityId);
    if (!entity) {
      return;
    }

    const carryable = this.getExt(Carryable);
    // Use helper method to preserve count when picking up dropped bandages
    carryable.pickup(entityId, Carryable.createStackablePickupOptions(carryable, Bandage.DEFAULT_COUNT));
  }
}
