import Positionable from "@/extensions/positionable";
import OneTimeTrigger from "@/extensions/one-time-trigger";
import { IGameManagers } from "@/managers/types";
import { Entities } from "@/constants";
import { Entity } from "@/entities/entity";
import Vector2 from "@/util/vector2";

export class Coin extends Entity {
  public static readonly Size = new Vector2(16, 16);
  private static readonly TRIGGER_RADIUS = 16;

  constructor(gameManagers: IGameManagers) {
    super(gameManagers, Entities.COIN);

    this.extensions = [
      new Positionable(this).setSize(Coin.Size),
      new OneTimeTrigger(this, {
        triggerRadius: Coin.TRIGGER_RADIUS,
        targetTypes: [Entities.PLAYER],
      }).onTrigger(() => this.collect()),
    ];
  }

  private collect(): void {
    // Find the nearest player
    const nearbyPlayers = this.getEntityManager().getNearbyEntities(
      this.getExt(Positionable).getCenterPosition(),
      Coin.TRIGGER_RADIUS,
      [Entities.PLAYER]
    );

    if (nearbyPlayers.length > 0) {
      const player = nearbyPlayers[0] as any;
      // Increment player's coins
      if (player.addCoins) {
        player.addCoins(1);
      }
    }

    // Remove the coin from the world
    this.getEntityManager().markEntityForRemoval(this);
  }
}
