import Interactive from "@/extensions/interactive";
import Positionable from "@/extensions/positionable";
import { IGameManagers } from "@/managers/types";
import { Entities } from "@/constants";
import { Entity } from "@/entities/entity";
import Vector2 from "@/util/vector2";
import PoolManager from "@shared/util/pool-manager";
import { Player } from "@/entities/player";

export class Cloth extends Entity {
  public static get Size(): Vector2 {
    return PoolManager.getInstance().vector2.claim(16, 16);
  }

  constructor(gameManagers: IGameManagers) {
    super(gameManagers, Entities.CLOTH);
    const poolManager = PoolManager.getInstance();
    const size = poolManager.vector2.claim(16, 16);
    this.addExtension(new Positionable(this).setSize(size));
    this.addExtension(new Interactive(this).onInteract(this.interact.bind(this)).setDisplayName("cloth"));
  }

  private interact(entityId: number): void {
    const player = this.getEntityManager().getEntityById(entityId) as Player;
    if (!player) return;

    // Increment player's cloth counter (this will broadcast the pickup event)
    player.addResource("cloth", 1);

    // Remove this cloth from the world
    this.getEntityManager().markEntityForRemoval(this);
  }
}
