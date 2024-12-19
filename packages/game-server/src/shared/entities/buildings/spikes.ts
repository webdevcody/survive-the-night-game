import { EntityManager } from "../../../managers/entity-manager";
import { Entity, Entities } from "../../entities";
import { Positionable, TriggerCooldownAttacker } from "../../extensions";
import Triggerable from "../../extensions/trigger";

/**
 * A spike trap which only hurts zombies who step on it.  After it fires, it'll be removed from the map.
 */
export class Spikes extends Entity {
  private static readonly DAMAGE = 1;
  private static readonly SIZE = 16;

  constructor(entityManager: EntityManager) {
    super(entityManager, Entities.SPIKES);

    this.extensions = [
      new Positionable(this),
      new Triggerable(this, Spikes.SIZE, Spikes.SIZE),
      new TriggerCooldownAttacker(this, entityManager, {
        damage: Spikes.DAMAGE,
        victimType: Entities.ZOMBIE,
        cooldown: 1,
      }),
    ];
  }
}
