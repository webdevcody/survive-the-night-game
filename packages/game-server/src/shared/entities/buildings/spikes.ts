import { EntityManager } from "../../../managers/entity-manager";
import { Entity, Entities } from "../../entities";
import { Positionable } from "../../extensions";
import Triggerable from "@/shared/extensions/trigger";
import Updatable from "@/shared/extensions/updatable";
import { Zombie } from "../zombie";
import { Rectangle } from "@/shared/geom/rectangle";
import { distance } from "@/shared/physics";

/**
 * A spike trap which only hurts zombies who step on it.  After it fires, it'll be removed from the map.
 */
export class Spikes extends Entity {
  private static readonly DAMAGE = 1;
  private static readonly RADIUS = 20;

  constructor(entityManager: EntityManager) {
    super(entityManager, Entities.SPIKES);

    this.extensions = [
      new Positionable(this),
      new Triggerable(this, 100, 100),
      new Updatable(this, (deltaTime: number) => {
        const entityManager = this.getEntityManager();
        const zombies = entityManager.getNearbyEntities(
          this.getExt(Positionable).getPosition(),
          100,
          [Entities.ZOMBIE]
        ) as Zombie[];

        for (const zombie of zombies) {
          const triggerBox = this.getExt(Triggerable).getTriggerBox();
          const triggerCenter = triggerBox.getCenter();

          const zombieHitbox = new Rectangle(zombie.getHitbox().x, zombie.getHitbox().y, 16, 16);
          const zombieCenter = zombieHitbox.getCenter();

          const centerDistance = distance(triggerCenter, zombieCenter);

          if (centerDistance < Spikes.RADIUS) {
            zombie.damage(Spikes.DAMAGE);
            this.getEntityManager().markEntityForRemoval(this);
          }
        }
      }),
    ];
  }
}
