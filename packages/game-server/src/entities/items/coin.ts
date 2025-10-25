import Interactive from "@/extensions/interactive";
import Positionable from "@/extensions/positionable";
import { IGameManagers } from "@/managers/types";
import { Entities } from "@/constants";
import { Entity } from "@/entities/entity";
import Vector2 from "@/util/vector2";

export class Coin extends Entity {
  public static readonly Size = new Vector2(16, 16);

  constructor(gameManagers: IGameManagers) {
    super(gameManagers, Entities.COIN);

    this.extensions = [
      new Positionable(this).setSize(Coin.Size),
      new Interactive(this).onInteract(this.interact.bind(this)).setDisplayName("coin"),
    ];
  }

  private interact(entityId: string): void {
    const entity = this.getEntityManager().getEntityById(entityId);
    if (!entity) return;

    // Check if it's a player
    if (entity.getType() === Entities.PLAYER) {
      const player = entity as any;
      // Increment player's coins
      if (player.addCoins) {
        player.addCoins(1);
      }
      // Remove the coin from the world
      this.getEntityManager().markEntityForRemoval(this);
    }
  }
}
