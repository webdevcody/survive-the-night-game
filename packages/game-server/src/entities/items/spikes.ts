import Carryable from "@/extensions/carryable";
import Interactive from "@/extensions/interactive";
import Positionable from "@/extensions/positionable";
import Placeable from "@/extensions/placeable";
import TriggerCooldownAttacker from "@/extensions/trigger-cooldown-attacker";
import { IGameManagers } from "@/managers/types";
import { Entities } from "@/constants";
import { Entity } from "@/entities/entity";
import Vector2 from "@/util/vector2";
import PoolManager from "@/util/pool-manager";
import { ItemState } from "@/types/entity";

/**
 * A spike trap which only hurts zombies who step on it. Can be picked up and placed again.
 */
export class Spikes extends Entity {
  private static readonly DAMAGE = 2;
  private static get SIZE(): Vector2 {
    return PoolManager.getInstance().vector2.claim(16, 16);
  }
  public static readonly DEFAULT_COUNT = 1;

  constructor(gameManagers: IGameManagers, itemState?: ItemState) {
    super(gameManagers, Entities.SPIKES);

    const count = itemState?.count ?? Spikes.DEFAULT_COUNT;

    const poolManager = PoolManager.getInstance();
    const size = poolManager.vector2.claim(16, 16);
    this.addExtension(new Positionable(this).setSize(size));
    // TriggerCooldownAttacker handles finding and attacking nearby zombies
    // No need for Triggerable since it had no callback and was redundant
    this.addExtension(
      new TriggerCooldownAttacker(this, {
        damage: Spikes.DAMAGE,
        victimType: Entities.ZOMBIE,
        cooldown: 1,
      })
    );
    this.addExtension(
      new Interactive(this).onInteract(this.interact.bind(this)).setDisplayName("spikes")
    );
    this.addExtension(new Carryable(this, "spikes").setItemState({ count }));
    this.addExtension(new Placeable(this));
  }

  private interact(entityId: string): void {
    const carryable = this.getExt(Carryable);
    // Use helper method to preserve count when picking up dropped spikes
    carryable.pickup(
      entityId,
      Carryable.createStackablePickupOptions(carryable, Spikes.DEFAULT_COUNT)
    );
  }
}
