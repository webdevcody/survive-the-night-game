import { Entities } from "@shared/constants";
import { IGameManagers } from "@/managers/types";
import Carryable from "@/extensions/carryable";
import Consumable from "@/extensions/consumable";
import Interactive from "@/extensions/interactive";
import Inventory from "@/extensions/inventory";
import Positionable from "@/extensions/positionable";
import InfiniteRun from "@/extensions/infinite-run";
import { Entity } from "@/entities/entity";
import Vector2 from "@/util/vector2";
import PoolManager from "@shared/util/pool-manager";
import { ItemState } from "@/types/entity";
import { itemRegistry } from "@shared/entities";

export class EnergyDrink extends Entity {
  public static get Size(): Vector2 {
    return PoolManager.getInstance().vector2.claim(16, 16);
  }
  public static readonly DEFAULT_COUNT = 1;

  constructor(gameManagers: IGameManagers, itemState?: ItemState) {
    super(gameManagers, Entities.ENERGY_DRINK);

    const count = itemState?.count ?? EnergyDrink.DEFAULT_COUNT;
    const poolManager = PoolManager.getInstance();
    const size = poolManager.vector2.claim(16, 16);
    this.addExtension(new Positionable(this).setSize(size));
    this.addExtension(
      new Interactive(this).onInteract(this.interact.bind(this)).setDisplayName("energy drink")
    );
    this.addExtension(new Consumable(this).onConsume(this.consume.bind(this)));
    this.addExtension(new Carryable(this, "energy_drink").setItemState({ count }));
  }

  private consume(entityId: number, idx: number): void {
    const entity = this.getEntityManager().getEntityById(entityId);
    if (!entity) {
      return;
    }

    // Get duration from config
    const config = itemRegistry.get("energy_drink");
    const duration = config?.duration ?? 20; // Default to 20 seconds if not configured

    // Remove existing infinite run extension if present (don't stack)
    if (entity.hasExt(InfiniteRun)) {
      entity.removeExtension(entity.getExt(InfiniteRun));
    }

    // Add infinite run extension to player
    entity.addExtension(new InfiniteRun(entity, duration));

    const inventory = entity.getExt(Inventory);
    if (!inventory) {
      return;
    }

    // Handle stackable energy drinks - decrement count instead of removing
    const energyDrinkItem = inventory.getItems()[idx];
    if (energyDrinkItem?.state?.count && energyDrinkItem.state.count > 1) {
      // Decrement count
      inventory.updateItemState(idx, { count: energyDrinkItem.state.count - 1 });
    } else {
      // Remove item if count is 1 or undefined
      inventory.removeItem(idx);
    }
  }

  private interact(entityId: number): void {
    const entity = this.getEntityManager().getEntityById(entityId);
    if (!entity) {
      return;
    }

    const carryable = this.getExt(Carryable);
    // Use helper method to preserve count when picking up dropped energy drinks
    carryable.pickup(
      entityId,
      Carryable.createStackablePickupOptions(carryable, EnergyDrink.DEFAULT_COUNT)
    );
  }
}

