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
import PoolManager from "@shared/util/pool-manager";
import { ItemState } from "@/types/entity";

export class PainPills extends Entity {
  public static get Size(): Vector2 {
    return PoolManager.getInstance().vector2.claim(16, 16);
  }
  public static readonly healingAmount = 2;
  public static readonly DEFAULT_COUNT = 1;

  constructor(gameManagers: IGameManagers, itemState?: ItemState) {
    super(gameManagers, Entities.PAIN_PILLS);

    const count = itemState?.count ?? PainPills.DEFAULT_COUNT;
    const poolManager = PoolManager.getInstance();
    const size = poolManager.vector2.claim(16, 16);
    this.addExtension(new Positionable(this).setSize(size));
    this.addExtension(
      new Interactive(this).onInteract(this.interact.bind(this)).setDisplayName("pain pills")
    );
    this.addExtension(new Consumable(this).onConsume(this.consume.bind(this)));
    this.addExtension(new Carryable(this, "pain_pills").setItemState({ count }));
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

    const currentHealth = destructible.getHealth();
    const maxHealth = destructible.getMaxHealth();
    const healAmount = Math.min(PainPills.healingAmount, maxHealth - currentHealth);

    if (healAmount === 0) {
      return;
    }

    destructible.heal(healAmount);

    const inventory = entity.getExt(Inventory);
    if (!inventory) {
      return;
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
      Carryable.createStackablePickupOptions(carryable, PainPills.DEFAULT_COUNT)
    );
  }
}
