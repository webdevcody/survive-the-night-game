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

    this.extensions = [
      new Positionable(this).setSize(Wall.Size),
      new Collidable(this).setSize(Wall.Size),
      new Interactive(this).onInteract(this.interact.bind(this)).setDisplayName("wall"),
      new Destructible(this)
        .setMaxHealth(getConfig().world.WALL_MAX_HEALTH)
        .setHealth(itemState?.health ?? getConfig().world.WALL_MAX_HEALTH)
        .onDeath(() => this.onDeath()),
      new Carryable(this, "wall").setItemState({
        count: Wall.DEFAULT_COUNT,
      }),
    ];
  }

  private interact(entityId: string): void {
    const entity = this.getEntityManager().getEntityById(entityId);
    if (!entity) return;

    const carryable = this.getExt(Carryable);
    carryable.pickup(entityId, {
      state: {
        count: carryable.getItemState().count || Wall.DEFAULT_COUNT,
        health: this.getExt(Destructible).getHealth(),
      },
      mergeStrategy: (existing, pickup) => ({
        count: (existing?.count || 0) + (pickup?.count || Wall.DEFAULT_COUNT),
        health: pickup?.health ?? getConfig().world.WALL_MAX_HEALTH,
      }),
    });
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
