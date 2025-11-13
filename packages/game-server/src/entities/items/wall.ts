import Carryable from "@/extensions/carryable";
import Collidable from "@/extensions/collidable";
import Destructible from "@/extensions/destructible";
import Interactive from "@/extensions/interactive";
import Inventory from "@/extensions/inventory";
import Positionable from "@/extensions/positionable";
import { IGameManagers } from "@/managers/types";
import { Entities } from "@/constants";
import { getConfig } from "@shared/config";
import { Entity } from "@/entities/entity";
import { RawEntity, ItemState } from "@/types/entity";
import Vector2 from "@/util/vector2";

export class Wall extends Entity {
  public static readonly Size = new Vector2(16, 16);
  public static readonly DEFAULT_COUNT = 1;

  constructor(gameManagers: IGameManagers, itemState?: ItemState) {
    super(gameManagers, Entities.WALL);

    const count = itemState?.count ?? Wall.DEFAULT_COUNT;

    this.extensions = [
      new Positionable(this).setSize(Wall.Size),
      new Collidable(this).setSize(Wall.Size),
      new Interactive(this).onInteract(this.interact.bind(this)).setDisplayName("wall"),
      new Destructible(this)
        .setMaxHealth(getConfig().world.WALL_MAX_HEALTH)
        .setHealth(itemState?.health ?? getConfig().world.WALL_MAX_HEALTH)
        .onDeath(() => this.onDeath()),
      new Carryable(this, "wall").setItemState({
        count,
      }),
    ];
  }

  private interact(entityId: string): void {
    const entity = this.getEntityManager().getEntityById(entityId);
    if (!entity) return;

    const carryable = this.getExt(Carryable);
    const stackableOptions = Carryable.createStackablePickupOptions(carryable, Wall.DEFAULT_COUNT);

    // Extend merge strategy to also preserve health
    const originalMergeStrategy = stackableOptions.mergeStrategy!;
    stackableOptions.mergeStrategy = (existing, pickup) => {
      const merged = originalMergeStrategy(existing, pickup);
      return {
        ...merged,
        health: pickup?.health ?? getConfig().world.WALL_MAX_HEALTH,
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

  public serialize(): RawEntity {
    return {
      ...super.serialize(),
      health: this.getExt(Destructible).getHealth(),
    };
  }
}
