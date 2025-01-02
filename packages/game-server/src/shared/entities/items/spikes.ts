import { EntityManager } from "../../../managers/entity-manager";
import { Entity, Entities } from "../../entities";
import { Interactive, Positionable, TriggerCooldownAttacker, Carryable } from "../../extensions";
import Triggerable from "../../extensions/trigger";
import { Player } from "../player";

/**
 * A spike trap which only hurts zombies who step on it. Can be picked up and placed again.
 */
export class Spikes extends Entity {
  private static readonly DAMAGE = 1;
  private static readonly SIZE = 16;
  private static readonly MAX_HEALTH = 100;

  constructor(entityManager: EntityManager) {
    super(entityManager, Entities.SPIKES);

    this.extensions = [
      new Positionable(this).setSize(Spikes.SIZE),
      new Triggerable(this, Spikes.SIZE, Spikes.SIZE, [Entities.ZOMBIE]),
      new TriggerCooldownAttacker(this, entityManager, {
        damage: Spikes.DAMAGE,
        victimType: Entities.ZOMBIE,
        cooldown: 1,
      }),
      new Interactive(this).onInteract(this.interact.bind(this)),
      new Carryable(this, "spikes"),
    ];
  }

  private interact(player: Player): void {
    this.getExt(Carryable).pickup(player);
  }
}
