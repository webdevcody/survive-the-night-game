import { IGameManagers } from "@/managers/types";
import { Entity } from "@/entities/entity";
import { EntityType } from "@/types/entity";
import Positionable from "@/extensions/positionable";
import Interactive from "@/extensions/interactive";
import Vector2 from "@/util/vector2";
import { ResourceConfig } from "@shared/entities/resource-registry";
import { Player } from "@/entities/player";

/**
 * Generic resource entity that can be auto-generated from ResourceConfig
 * Resources are picked up directly and added to player resources (not inventory)
 */
export class GenericResourceEntity extends Entity {
  public static readonly Size = new Vector2(16, 16);

  constructor(gameManagers: IGameManagers, entityType: EntityType, config: ResourceConfig) {
    super(gameManagers, entityType);

    this.addExtension(new Positionable(this).setSize(GenericResourceEntity.Size));

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
