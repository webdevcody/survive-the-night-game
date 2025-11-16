import { IGameManagers } from "@/managers/types";
import { Entity } from "@/entities/entity";
import { EntityType } from "@/types/entity";
import Positionable from "@/extensions/positionable";
import Interactive from "@/extensions/interactive";
import Vector2 from "@/util/vector2";
import PoolManager from "@shared/util/pool-manager";
import { ResourceConfig } from "@shared/entities/resource-registry";
import { Player } from "@/entities/player";

/**
 * Generic resource entity that can be auto-generated from ResourceConfig
 * Resources are picked up directly and added to player resources (not inventory)
 */
export class GenericResourceEntity extends Entity {
  public static get Size(): Vector2 {
    return PoolManager.getInstance().vector2.claim(16, 16);
  }

  constructor(gameManagers: IGameManagers, entityType: EntityType, config: ResourceConfig) {
    super(gameManagers, entityType);
    const poolManager = PoolManager.getInstance();
    const size = poolManager.vector2.claim(16, 16);
    this.addExtension(new Positionable(this).setSize(size));

    // Resources are interactive but not carryable - they're picked up directly
    const displayName = config.id.replace(/_/g, " "); // Convert "pistol_ammo" to "pistol ammo"
    this.addExtension(
      new Interactive(this).onInteract(this.interact.bind(this)).setDisplayName(displayName)
    );
  }

  private interact(entityId: string): void {
    const player = this.getEntityManager().getEntityById(entityId) as Player;
    if (!player) return;

    // Increment player's resource counter (this will broadcast the pickup event)
    player.addResource(this.getType() as any, 1);

    // Remove this resource from the world
    this.getEntityManager().markEntityForRemoval(this);
  }
}
