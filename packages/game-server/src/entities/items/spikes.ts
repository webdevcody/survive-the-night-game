import Carryable from "@/extensions/carryable";
import Interactive from "@/extensions/interactive";
import Positionable from "@/extensions/positionable";
import Triggerable from "@/extensions/trigger";
import TriggerCooldownAttacker from "@/extensions/trigger-cooldown-attacker";
import { IGameManagers } from "@/managers/types";
import { Entities } from "@/constants";
import { Entity } from "@/entities/entity";
import Vector2 from "@/util/vector2";
import { ItemState } from "@/types/entity";

/**
 * A spike trap which only hurts zombies who step on it. Can be picked up and placed again.
 */
export class Spikes extends Entity {
  private static readonly DAMAGE = 2;
  private static readonly SIZE = new Vector2(16, 16);
  public static readonly DEFAULT_COUNT = 1;

  constructor(gameManagers: IGameManagers, itemState?: ItemState) {
    super(gameManagers, Entities.SPIKES);

    const count = itemState?.count ?? Spikes.DEFAULT_COUNT;

    this.addExtension(new Positionable(this).setSize(Spikes.SIZE));
    this.addExtension(new Triggerable(this, Spikes.SIZE, [Entities.ZOMBIE]));
    this.addExtension(
      new TriggerCooldownAttacker(this, {
        damage: Spikes.DAMAGE,
        victimType: Entities.ZOMBIE,
        cooldown: 1,
      })
    );
    this.addExtension(new Interactive(this).onInteract(this.interact.bind(this)).setDisplayName("spikes"));
    this.addExtension(new Carryable(this, "spikes").setItemState({ count }));
  }

  private interact(entityId: string): void {
    const carryable = this.getExt(Carryable);
    // Use helper method to preserve count when picking up dropped spikes
    carryable.pickup(entityId, Carryable.createStackablePickupOptions(carryable, Spikes.DEFAULT_COUNT));
  }
}
