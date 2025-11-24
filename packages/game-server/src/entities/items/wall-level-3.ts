import Carryable from "@/extensions/carryable";
import Collidable from "@/extensions/collidable";
import Destructible from "@/extensions/destructible";
import Interactive from "@/extensions/interactive";
import Positionable from "@/extensions/positionable";
import Placeable from "@/extensions/placeable";
import { IGameManagers } from "@/managers/types";
import { Entity } from "@/entities/entity";
import { ItemState } from "@/types/entity";
import Vector2 from "@/util/vector2";
import PoolManager from "@shared/util/pool-manager";
import { getConfig } from "@shared/config";

export class WallLevel3 extends Entity {
  public static get Size(): Vector2 {
    return PoolManager.getInstance().vector2.claim(16, 16);
  }
  public static readonly DEFAULT_COUNT = 1;

  constructor(gameManagers: IGameManagers, itemState?: ItemState) {
    super(gameManagers, "wall_level_3");

    const count = itemState?.count ?? WallLevel3.DEFAULT_COUNT;
    const poolManager = PoolManager.getInstance();
    const size = poolManager.vector2.claim(16, 16);
    this.addExtension(new Positionable(this).setSize(size));
    this.addExtension(new Collidable(this).setSize(size));
    this.addExtension(
      new Interactive(this).onInteract(this.interact.bind(this)).setDisplayName("fortified wall")
    );
    this.addExtension(
      new Destructible(this)
        .setMaxHealth(getConfig().world.WALL_LEVEL_3_MAX_HEALTH)
        .setHealth(itemState?.health ?? getConfig().world.WALL_LEVEL_3_MAX_HEALTH)
        .onDeath(() => this.onDeath())
    );
    this.addExtension(
      new Carryable(this, "wall_level_3").setItemState({
        count,
      })
    );
    this.addExtension(new Placeable(this));
  }

  private interact(entityId: number): void {
    const entity = this.getEntityManager().getEntityById(entityId);
    if (!entity) return;

    const carryable = this.getExt(Carryable);
    const stackableOptions = Carryable.createStackablePickupOptions(carryable, WallLevel3.DEFAULT_COUNT);

    // Extend merge strategy to also preserve health
    const originalMergeStrategy = stackableOptions.mergeStrategy!;
    stackableOptions.mergeStrategy = (existing, pickup) => {
      const merged = originalMergeStrategy(existing, pickup);
      return {
        ...merged,
        health: pickup?.health ?? getConfig().world.WALL_LEVEL_3_MAX_HEALTH,
      };
    };

    // Include health in pickup state
    stackableOptions.state = {
      ...stackableOptions.state,
      health: this.getExt(Destructible).getHealth(),
    };

    carryable.pickup(entityId, stackableOptions);
  }

  private onDeath(): void {
    this.getEntityManager().markEntityForRemoval(this);
  }
}
