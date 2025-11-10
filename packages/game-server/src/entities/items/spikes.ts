import Carryable from "@/extensions/carryable";
import Interactive from "@/extensions/interactive";
import Positionable from "@/extensions/positionable";
import Triggerable from "@/extensions/trigger";
import TriggerCooldownAttacker from "@/extensions/trigger-cooldown-attacker";
import { IGameManagers } from "@/managers/types";
import { Entities } from "@/constants";
import { Entity } from "@/entities/entity";
import Vector2 from "@/util/vector2";

/**
 * A spike trap which only hurts zombies who step on it. Can be picked up and placed again.
 */
export class Spikes extends Entity {
  private static readonly DAMAGE = 2;
  private static readonly SIZE = new Vector2(16, 16);

  constructor(gameManagers: IGameManagers) {
    super(gameManagers, Entities.SPIKES);

    this.extensions = [
      new Positionable(this).setSize(Spikes.SIZE),
      new Triggerable(this, Spikes.SIZE, [Entities.ZOMBIE]),
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
