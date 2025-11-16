import Positionable from "@/extensions/positionable";
import OneTimeTrigger from "@/extensions/one-time-trigger";
import { IGameManagers } from "@/managers/types";
import { Entities, PLAYER_TYPES } from "@/constants";
import { Entity } from "@/entities/entity";
import Vector2 from "@/util/vector2";
import PoolManager from "@shared/util/pool-manager";
import { CoinPickupEvent } from "@shared/events/server-sent/coin-pickup-event";
import { getConfig } from "@shared/config";

export class Coin extends Entity {
  public static get Size(): Vector2 {
    return PoolManager.getInstance().vector2.claim(16, 16);
  }
  private static readonly TRIGGER_RADIUS = 16;

  constructor(gameManagers: IGameManagers) {
    super(gameManagers, Entities.COIN);
    const poolManager = PoolManager.getInstance();
    const size = poolManager.vector2.claim(16, 16);
    this.addExtension(new Positionable(this).setSize(size));
    this.addExtension(
      new OneTimeTrigger(this, {
        triggerRadius: Coin.TRIGGER_RADIUS,
        targetTypes: [Entities.PLAYER],
      }).onTrigger(() => this.collect())
    );

    // Mark coin for removal if not collected
    this.getEntityManager().markEntityForRemoval(this, getConfig().entity.ENTITY_DESPAWN_TIME_MS);
  }

  private collect(): void {
    // Find the nearest player
    const nearbyPlayers = this.getEntityManager().getNearbyEntities(
      this.getExt(Positionable).getCenterPosition(),
      Coin.TRIGGER_RADIUS,
      PLAYER_TYPES
    );

    if (nearbyPlayers.length > 0) {
      const player = nearbyPlayers[0] as any;
      // Increment player's coins
      if (player.addCoins) {
        player.addCoins(1);
        this.getEntityManager().getBroadcaster().broadcastEvent(new CoinPickupEvent(this.getId()));
      }
    }

    // Remove the coin from the world
    this.getEntityManager().markEntityForRemoval(this);
  }
}
