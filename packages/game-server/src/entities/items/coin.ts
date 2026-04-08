import Positionable from "@/extensions/positionable";
import Interactive from "@/extensions/interactive";
import { IGameManagers } from "@/managers/types";
import { Entities } from "@/constants";
import { Entity } from "@/entities/entity";
import Vector2 from "@/util/vector2";
import PoolManager from "@shared/util/pool-manager";
import { CoinPickupEvent } from "../../../../game-shared/src/events/server-sent/events/coin-pickup-event";
import { getConfig } from "@shared/config";
import { Player } from "@/entities/players/player";

export class Coin extends Entity {
  public static get Size(): Vector2 {
    return PoolManager.getInstance().vector2.claim(16, 16);
  }

  constructor(gameManagers: IGameManagers) {
    super(gameManagers, Entities.COIN);
    const poolManager = PoolManager.getInstance();
    const size = poolManager.vector2.claim(16, 16);
    this.addExtension(new Positionable(this).setSize(size));
    this.addExtension(
      new Interactive(this)
        .onInteract(this.interact.bind(this))
        .setDisplayName("coin")
        .setAutoPickupEnabled(false)
    );

    // Mark coin for removal if not collected
    this.getEntityManager().markEntityForRemoval(this, getConfig().entity.ENTITY_DESPAWN_TIME_MS);
  }

  private interact(entityId: number): void {
    const player = this.getEntityManager().getEntityById(entityId) as Player | undefined;
    if (!player) {
      return;
    }

    if (player.isZombie()) {
      return;
    }

    if (player.addCoins) {
      player.addCoins(1);
      this.getEntityManager().getBroadcaster().broadcastEvent(new CoinPickupEvent(this.getId()));
    }

    this.getEntityManager().markEntityForRemoval(this);
  }
}
