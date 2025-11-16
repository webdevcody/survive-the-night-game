import Carryable from "@/extensions/carryable";
import Interactive from "@/extensions/interactive";
import Positionable from "@/extensions/positionable";
import { IGameManagers } from "@/managers/types";
import { Entity } from "@/entities/entity";
import Vector2 from "@/util/vector2";
import PoolManager from "@shared/util/pool-manager";
import { EntityType, ItemState } from "@/types/entity";
import { ItemType } from "@shared/util/inventory";

export abstract class StackableItem extends Entity {
  public static get Size(): Vector2 {
    return PoolManager.getInstance().vector2.claim(16, 16);
  }

  constructor(
    gameManagers: IGameManagers,
    entityType: EntityType,
    itemType: ItemType,
    defaultCount: number,
    displayName: string,
    itemState?: ItemState
  ) {
    super(gameManagers, entityType);

    // Use count from itemState if provided, otherwise use defaultCount
    const count = itemState?.count ?? defaultCount;
    const poolManager = PoolManager.getInstance();
    const size = poolManager.vector2.claim(16, 16);
    this.addExtension(new Positionable(this).setSize(size));
    this.addExtension(
      new Interactive(this).onInteract(this.interact.bind(this)).setDisplayName(displayName)
    );
    this.addExtension(
      new Carryable(this, itemType).setItemState({
        count,
      })
    );
  }

  protected interact(entityId: string): void {
    const entity = this.getEntityManager().getEntityById(entityId);
    if (!entity) return;

    const carryable = this.getExt(Carryable);
    // Use helper method to preserve count when picking up dropped items
    carryable.pickup(
      entityId,
      Carryable.createStackablePickupOptions(carryable, this.getDefaultCount())
    );
  }

  protected abstract getDefaultCount(): number;
}
