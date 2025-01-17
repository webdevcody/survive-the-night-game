import Carryable from "@/extensions/carryable";
import Illuminated from "@/extensions/illuminated";
import Interactive from "@/extensions/interactive";
import Positionable from "@/extensions/positionable";
import { IGameManagers } from "@/managers/types";
import { Entities } from "@/constants";
import { Entity } from "@/entities/entity";
import Vector2 from "@/util/vector2";

export class Torch extends Entity {
  public static readonly Size = new Vector2(16, 16);

  constructor(gameManagers: IGameManagers) {
    super(gameManagers, Entities.TORCH);

    this.extensions = [
      new Positionable(this).setSize(Torch.Size),
      new Interactive(this).onInteract(this.interact.bind(this)).setDisplayName("torch"),
      new Carryable(this, "torch"),
      new Illuminated(this, 200),
    ];
  }

  private interact(entityId: string): void {
    this.getExt(Carryable).pickup(entityId);
  }
}
