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
 * Level 2 spikes that deal 2 damage to zombies.
 */
export class SpikesLevel2 extends Entity {
  private static get SIZE(): Vector2 {
    return PoolManager.getInstance().vector2.claim(16, 16);
  }
  public static readonly DEFAULT_COUNT = 1;

  constructor(gameManagers: IGameManagers, itemState?: ItemState) {
    super(gameManagers, "spikes_level_2");

    const count = itemState?.count ?? SpikesLevel2.DEFAULT_COUNT;

    const poolManager = PoolManager.getInstance();
    const size = poolManager.vector2.claim(16, 16);
    this.addExtension(new Positionable(this).setSize(size));
    this.addExtension(
      new TriggerCooldownAttacker(this, {
        damage: getConfig().world.SPIKES_LEVEL_2_DAMAGE,
        victimType: Entities.ZOMBIE,
        cooldown: 1,
      })
    );
    this.addExtension(
      new Interactive(this).onInteract(this.interact.bind(this)).setDisplayName("reinforced spikes")
    );
    this.addExtension(new Carryable(this, "spikes_level_2").setItemState({ count }));
    this.addExtension(new Placeable(this));
  }

  private interact(entityId: number): void {
    const carryable = this.getExt(Carryable);
    carryable.pickup(
      entityId,
      Carryable.createStackablePickupOptions(carryable, SpikesLevel2.DEFAULT_COUNT)
    );
  }
}
