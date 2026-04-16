import { Entities } from "@shared/constants";
import { IGameManagers } from "@/managers/types";
import Carryable from "@/extensions/carryable";
import Consumable from "@/extensions/consumable";
import Destructible from "@/extensions/destructible";
import Interactive from "@/extensions/interactive";
import Inventory from "@/extensions/inventory";
import Positionable from "@/extensions/positionable";
import { Entity } from "@/entities/entity";
import { Player } from "@/entities/players/player";
import Vector2 from "@/util/vector2";
import PoolManager from "@shared/util/pool-manager";
import { ItemState } from "@/types/entity";

export class CleanWater extends Entity {
  public static get Size(): Vector2 {
    return PoolManager.getInstance().vector2.claim(16, 16);
  }
  public static readonly healAmount = 1;
  public static readonly DEFAULT_COUNT = 1;

  constructor(gameManagers: IGameManagers, itemState?: ItemState) {
    super(gameManagers, Entities.CLEAN_WATER);

    const count = itemState?.count ?? CleanWater.DEFAULT_COUNT;
    const poolManager = PoolManager.getInstance();
    const size = poolManager.vector2.claim(16, 16);
    this.addExtension(new Positionable(this).setSize(size));
    this.addExtension(
      new Interactive(this).onInteract(this.interact.bind(this)).setDisplayName("clean water")
    );
    this.addExtension(new Consumable(this).onConsume(this.consume.bind(this)));
    this.addExtension(new Carryable(this, "clean_water").setItemState({ count }));
  }

  private consume(entityId: number, idx: number): void {
    const entity = this.getEntityManager().getEntityById(entityId);
    if (!entity) {
      return;
    }

    const destructible = entity.getExt(Destructible);
    if (!destructible) {
      return;
    }

    const inventory = entity.getExt(Inventory);
    if (!inventory) {
      return;
    }

    if (entity instanceof Player) {
      entity.restoreStaminaFully();
    }

    const currentHealth = destructible.getHealth();
    const maxHealth = destructible.getMaxHealth();
    const healAmt = Math.min(CleanWater.healAmount, maxHealth - currentHealth);
    if (healAmt > 0) {
      destructible.heal(healAmt);
    }

    const item = inventory.getItems()[idx];
    if (item?.state?.count && item.state.count > 1) {
      inventory.updateItemState(idx, { count: item.state.count - 1 });
    } else {
      inventory.removeItem(idx);
    }
  }

  private interact(entityId: number): void {
    const entity = this.getEntityManager().getEntityById(entityId);
    if (!entity) {
      return;
    }

    const carryable = this.getExt(Carryable);
    carryable.pickup(
      entityId,
      Carryable.createStackablePickupOptions(carryable, CleanWater.DEFAULT_COUNT)
    );
  }
}
