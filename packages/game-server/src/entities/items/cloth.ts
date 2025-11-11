import Interactive from "@/extensions/interactive";
import Positionable from "@/extensions/positionable";
import { IGameManagers } from "@/managers/types";
import { Entities } from "@/constants";
import { Entity } from "@/entities/entity";
import Vector2 from "@/util/vector2";
import { Player } from "@/entities/player";

export class Cloth extends Entity {
  public static readonly Size = new Vector2(16, 16);

  constructor(gameManagers: IGameManagers) {
    super(gameManagers, Entities.CLOTH);

    this.extensions = [
      new Positionable(this).setSize(Cloth.Size),
      new Interactive(this).onInteract(this.interact.bind(this)).setDisplayName("cloth"),
    ];
  }

  private interact(entityId: string): void {
    const player = this.getEntityManager().getEntityById(entityId) as Player;
    if (!player) return;

    // Increment player's cloth counter (this will broadcast the pickup event)
    player.addResource("cloth", 1);

    // Remove this cloth from the world
    this.getEntityManager().markEntityForRemoval(this);
  }
}
