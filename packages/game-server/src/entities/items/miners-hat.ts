import Carryable from "@/extensions/carryable";
import Interactive from "@/extensions/interactive";
import Positionable from "@/extensions/positionable";
import { IGameManagers } from "@/managers/types";
import { Entities } from "@/constants";
import { Entity } from "@/entities/entity";
import Vector2 from "@/util/vector2";
import PoolManager from "@shared/util/pool-manager";

export class MinersHat extends Entity {
  public static get Size(): Vector2 {
    return PoolManager.getInstance().vector2.claim(16, 16);
  }

  constructor(gameManagers: IGameManagers) {
    super(gameManagers, Entities.MINERS_HAT);
    const poolManager = PoolManager.getInstance();
    const size = poolManager.vector2.claim(16, 16);
    this.addExtension(new Positionable(this).setSize(size));
    this.addExtension(new Interactive(this).onInteract(this.interact.bind(this)).setDisplayName("miners hat"));
    this.addExtension(new Carryable(this, "miners_hat"));
  }

  private interact(entityId: number): void {
    this.getExt(Carryable).pickup(entityId);
  }
}

