import Interactive from "@/extensions/interactive";
import Positionable from "@/extensions/positionable";
import { Entity } from "@/entities/entity";
import type { IGameManagers } from "@/managers/types";
import PoolManager from "@shared/util/pool-manager";
import Vector2 from "@/util/vector2";

export class CraftingStation extends Entity {
  public static get Size(): Vector2 {
    return PoolManager.getInstance().vector2.claim(16, 16);
  }

  constructor(gameManagers: IGameManagers, entityType: string, displayName: string) {
    super(gameManagers, entityType as any);
    const poolManager = PoolManager.getInstance();
    const size = poolManager.vector2.claim(16, 16);
    this.addExtension(new Positionable(this).setSize(size));
    this.addExtension(new Interactive(this).onInteract(() => {}).setDisplayName(displayName));
  }

  setPosition(position: Vector2): void {
    this.getExt(Positionable).setPosition(position);
  }
}
