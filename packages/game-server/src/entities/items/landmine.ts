import { Entity } from "@/entities/entity";
import { IGameManagers } from "@/managers/types";
import { Entities, Zombies } from "../../../../game-shared/src/constants";
import Positionable from "@/extensions/positionable";
import Triggerable from "@/extensions/trigger";
import Interactive from "@/extensions/interactive";
import Carryable from "@/extensions/carryable";
import { distance } from "../../../../game-shared/src/util/physics";
import { IEntity } from "@/entities/types";
import Destructible from "@/extensions/destructible";
import OneTimeTrigger from "@/extensions/one-time-trigger";
import Vector2 from "@/util/vector2";
import { LANDMINE_EXPLOSION_RADIUS } from "@/constants/constants";
import { RawEntity } from "@/types/entity";
import { ExplosionEvent } from "@shared/events/server-sent/explosion-event";

/**
 * A landmine that explodes when enemies step on it, damaging all nearby enemies
 */
export class Landmine extends Entity implements IEntity {
  private static readonly SIZE = new Vector2(16, 16);
  private static readonly DAMAGE = 7;
  private static readonly TRIGGER_RADIUS = 16;
  private isActive = false;
  private activateDelay = 2000;

  constructor(gameManagers: IGameManagers) {
    super(gameManagers, Entities.LANDMINE);

    this.addExtension(new Positionable(this).setSize(Landmine.SIZE));
    // this.addExtension(new Triggerable(this, Landmine.SIZE, Zombies));
    this.addExtension(
      new Interactive(this)
        .onInteract((entityId: string) => this.interact(entityId))
        .setDisplayName("landmine")
    );
    this.addExtension(new Carryable(this, "landmine"));

    setTimeout(() => this.activate(), this.activateDelay);
  }

  public activate(): void {
    this.isActive = true;
    this.addExtension(
      new OneTimeTrigger(this, {
        triggerRadius: Landmine.TRIGGER_RADIUS,
        targetTypes: Zombies,
      }).onTrigger(() => this.explode())
    );
  }

  private explode() {
    const position = this.getExt(Positionable).getCenterPosition();
    const nearbyEntities = this.getEntityManager().getNearbyEntities(
      this.getExt(Positionable).getPosition(),
      LANDMINE_EXPLOSION_RADIUS
    );

    // Damage all things in explosion radius
    for (const entity of nearbyEntities) {
      if (!entity.hasExt(Destructible)) continue;

      const entityPos = entity.getExt(Positionable).getPosition();
      const dist = distance(position, entityPos);

      if (dist <= LANDMINE_EXPLOSION_RADIUS) {
        entity.getExt(Destructible).damage(Landmine.DAMAGE);
      }
    }

    this.getEntityManager().getBroadcaster().broadcastEvent(
      new ExplosionEvent({
        position,
      })
    );

    // Remove the landmine after explosion
    this.getEntityManager().markEntityForRemoval(this);
  }

  private interact(entityId: string) {
    const entity = this.getEntityManager().getEntityById(entityId);
    if (!entity || entity.getType() !== Entities.PLAYER) return;
    this.getExt(Carryable).pickup(entityId);
  }

  public serialize(): RawEntity {
    return {
      ...super.serialize(),
      isActive: this.isActive,
    };
  }
}
