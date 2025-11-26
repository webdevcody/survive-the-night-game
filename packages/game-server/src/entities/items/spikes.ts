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
import { getConfig } from "@shared/config";

/**
 * A spike trap which only hurts zombies who step on it. Can be picked up and placed again.
 */
export class Spikes extends Entity {
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
    // TriggerCooldownAttacker handles finding and attacking nearby entities
    // No need for Triggerable since it had no callback and was redundant
    this.addExtension(
      new TriggerCooldownAttacker(this, {
        damage: getConfig().world.SPIKES_DAMAGE,
        victimType: Entities.ZOMBIE,
        cooldown: 1,
        includePlayersInBattleRoyale: true, // Allow targeting other players in Battle Royale
      })
    );
    this.addExtension(
      new Interactive(this).onInteract(this.interact.bind(this)).setDisplayName("spikes")
    );
    this.addExtension(new Carryable(this, "spikes").setItemState({ count }));
    this.addExtension(new Placeable(this));
  }

  private interact(entityId: number): void {
    const carryable = this.getExt(Carryable);
    // Use helper method to preserve count when picking up dropped spikes
    carryable.pickup(
      entityId,
      Carryable.createStackablePickupOptions(carryable, Spikes.DEFAULT_COUNT)
    );
  }
}
