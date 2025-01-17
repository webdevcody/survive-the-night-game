import { Entity } from "@/entities/entity";
import { IGameManagers } from "@/managers/types";
import { Entities } from "../../../../game-shared/src/constants";
import Positionable from "@/extensions/positionable";
import Triggerable from "@/extensions/trigger";
import Interactive from "@/extensions/interactive";
import Carryable from "@/extensions/carryable";
import { EntityType } from "@/types/entity";
import { distance } from "../../../../game-shared/src/util/physics";
import { IEntity } from "@/entities/types";
import Destructible from "@/extensions/destructible";
import OneTimeTrigger from "@/extensions/one-time-trigger";
import Vector2 from "@/util/vector2";

/**
 * A landmine that explodes when zombies step on it, damaging all nearby zombies
 */
export class Landmine extends Entity implements IEntity {
  private static readonly SIZE = new Vector2(16, 16);
  private static readonly DAMAGE = 3;
  private static readonly EXPLOSION_RADIUS = 32;
  private static readonly TRIGGER_RADIUS = 16;

  constructor(gameManagers: IGameManagers) {
    super(gameManagers, Entities.LANDMINE);

    this.addExtension(new Positionable(this).setSize(Landmine.SIZE));
    this.addExtension(new Triggerable(this, Landmine.SIZE, [Entities.ZOMBIE]));
    this.addExtension(
      new Interactive(this)
        .onInteract((entityId: string) => this.interact(entityId))
        .setDisplayName("landmine")
    );
    this.addExtension(new Carryable(this, "landmine"));
    this.addExtension(
      new OneTimeTrigger(this, {
        triggerRadius: Landmine.TRIGGER_RADIUS,
        targetTypes: [Entities.ZOMBIE],
      }).onTrigger(() => this.explode())
    );
  }

  private explode() {
    const position = this.getExt(Positionable).getPosition();
    const nearbyZombies = this.getEntityManager().getNearbyEntities(
      position,
      Landmine.EXPLOSION_RADIUS,
      [Entities.ZOMBIE]
    );

    // Damage all zombies in explosion radius
    for (const zombie of nearbyZombies) {
      if (!zombie.hasExt(Destructible)) continue;

      const zombiePos = zombie.getExt(Positionable).getPosition();
      const dist = distance(position, zombiePos);

      if (dist <= Landmine.EXPLOSION_RADIUS) {
        zombie.getExt(Destructible).damage(Landmine.DAMAGE);
      }
    }

    // Remove the landmine after explosion
    this.getEntityManager().markEntityForRemoval(this);
  }

  private interact(entityId: string) {
    const entity = this.getEntityManager().getEntityById(entityId);
    if (!entity || entity.getType() !== Entities.PLAYER) return;
    this.getExt(Carryable).pickup(entityId);
  }

  // IEntity interface implementation
  public setId(id: string): void {
    // Already handled by Entity base class
  }

  public setType(type: EntityType): void {
    // Already handled by Entity base class
  }
}
