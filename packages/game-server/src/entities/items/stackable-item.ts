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

  /**
   * Get the default count for a StackableItem class without instantiating it.
   * Subclasses should override this static method to return their default count.
   * If not overridden, this will attempt to create a temporary instance to get the count.
   */
  public static getDefaultCount(
    constructor: new (gameManagers: IGameManagers, ...args: any[]) => StackableItem,
    gameManagers: IGameManagers
  ): number | undefined {
    try {
      // Try to create a temporary instance to call getDefaultCount()
      // We pass undefined for itemState so it uses the default count
      const tempInstance = new constructor(gameManagers);
      return tempInstance.getDefaultCount();
    } catch {
      return undefined;
    }
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

  protected interact(entityId: number): void {
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
