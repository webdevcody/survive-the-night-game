import { Entities } from "@survive-the-night/game-shared/src/constants";
import { Entity } from "../../entity";
import Triggerable from "../../extensions/trigger";
import Carryable from "../../extensions/carryable";
import Interactive from "../../extensions/interactive";
import Positionable from "../../extensions/positionable";
import TriggerCooldownAttacker from "../../extensions/trigger-cooldown-attacker";
import { IEntityManager } from "@/managers/types";

/**
 * A spike trap which only hurts zombies who step on it. Can be picked up and placed again.
 */
export class Spikes extends Entity {
  private static readonly DAMAGE = 1;
  private static readonly SIZE = 16;

  constructor(entityManager: IEntityManager) {
    super(entityManager, Entities.SPIKES);

    this.extensions = [
      new Positionable(this).setSize(Spikes.SIZE),
      new Triggerable(this, Spikes.SIZE, Spikes.SIZE, [Entities.ZOMBIE]),
      new TriggerCooldownAttacker(this, {
        damage: Spikes.DAMAGE,
        victimType: Entities.ZOMBIE,
        cooldown: 1,
      }),
      new Interactive(this).onInteract(this.interact.bind(this)).setDisplayName("spikes"),
      new Carryable(this, "spikes"),
    ];
  }

  private interact(entityId: string): void {
    this.getExt(Carryable).pickup(entityId);
  }
}
