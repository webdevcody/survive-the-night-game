import Interactive from "@/extensions/interactive";
import Positionable from "@/extensions/positionable";
import { IGameManagers } from "@/managers/types";
import { Entities } from "@/constants";
import { Entity } from "@/entities/entity";
import Vector2 from "@/util/vector2";
import { Player } from "@/entities/player";

export class Wood extends Entity {
  public static readonly Size = new Vector2(16, 16);

  constructor(gameManagers: IGameManagers) {
    super(gameManagers, Entities.WOOD);

    this.addExtension(new Positionable(this).setSize(Wood.Size));
    this.addExtension(
      new Interactive(this).onInteract(this.interact.bind(this)).setDisplayName("wood")
    );
  }

  private interact(entityId: string): void {
    const player = this.getEntityManager().getEntityById(entityId) as Player;
    if (!player) return;

    // Increment player's wood counter (this will broadcast the pickup event)
    player.addResource("wood", 1);

    // Remove this wood from the world
    this.getEntityManager().markEntityForRemoval(this);
  }
}
