import Carryable from "@/extensions/carryable";
import Interactive from "@/extensions/interactive";
import Positionable from "@/extensions/positionable";
import { IGameManagers } from "@/managers/types";
import { Entities } from "@/constants";
import { Entity } from "@/entities/entity";
import Vector2 from "@/util/vector2";

export class Cloth extends Entity {
  public static readonly Size = new Vector2(16, 16);

  constructor(gameManagers: IGameManagers) {
    super(gameManagers, Entities.CLOTH);

    this.extensions = [
      new Positionable(this).setSize(Cloth.Size),
      new Interactive(this).onInteract(this.interact.bind(this)).setDisplayName("cloth"),
      new Carryable(this, "cloth"),
    ];
  }

  private interact(entityId: string): void {
    this.getExt(Carryable).pickup(entityId);
  }
}
