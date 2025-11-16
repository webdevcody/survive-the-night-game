import { IGameManagers } from "@/managers/types";
import { Entities } from "@shared/constants";
import Positionable from "@/extensions/positionable";
import Collidable from "@/extensions/collidable";
import { Entity } from "@/entities/entity";
import Vector2 from "@/util/vector2";
import PoolManager from "@shared/util/pool-manager";

export class Boundary extends Entity {
  public static get Size(): Vector2 {
    return PoolManager.getInstance().vector2.claim(16, 16);
  }

  constructor(gameManagers: IGameManagers) {
    super(gameManagers, Entities.BOUNDARY);
    const poolManager = PoolManager.getInstance();
    const size = poolManager.vector2.claim(16, 16);
    this.addExtension(new Positionable(this).setSize(size));
    this.addExtension(new Collidable(this).setSize(size));
  }

  setPosition(position: Vector2): void {
    this.getExt(Positionable).setPosition(position);
  }

  setSize(size: Vector2): void {
    this.getExt(Positionable).setSize(size);
    this.getExt(Collidable).setSize(size);
  }
}
