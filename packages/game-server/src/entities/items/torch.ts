import Carryable from "@/extensions/carryable";
import Illuminated from "@/extensions/illuminated";
import Interactive from "@/extensions/interactive";
import Positionable from "@/extensions/positionable";
import Placeable from "@/extensions/placeable";
import { IGameManagers } from "@/managers/types";
import { Entities } from "@/constants";
import { Entity } from "@/entities/entity";
import Vector2 from "@/util/vector2";
import PoolManager from "@shared/util/pool-manager";

export class Torch extends Entity {
  public static get Size(): Vector2 {
    return PoolManager.getInstance().vector2.claim(16, 16);
  }

  constructor(gameManagers: IGameManagers) {
    super(gameManagers, Entities.TORCH);
    const poolManager = PoolManager.getInstance();
    const size = poolManager.vector2.claim(16, 16);
    this.addExtension(new Positionable(this).setSize(size));
    this.addExtension(new Interactive(this).onInteract(this.interact.bind(this)).setDisplayName("torch"));
    this.addExtension(new Carryable(this, "torch"));
    this.addExtension(new Placeable(this));
    this.addExtension(new Illuminated(this, 200));
  }

  private interact(entityId: number): void {
    this.getExt(Carryable).pickup(entityId);
  }
}
