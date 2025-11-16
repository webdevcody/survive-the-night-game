import Expirable from "@/extensions/expirable";
import Positionable from "@/extensions/positionable";
import { IGameManagers } from "@/managers/types";
import { Entity } from "@/entities/entity";
import Vector2 from "@/util/vector2";
import PoolManager from "@shared/util/pool-manager";
import { decalRegistry } from "@shared/entities";

export class Blood extends Entity {
  public static get Size(): Vector2 {
    return PoolManager.getInstance().vector2.claim(16, 16);
  }

  constructor(gameManagers: IGameManagers) {
    // Get entity type from decal registry
    const bloodDecal = decalRegistry.get("blood");
    const entityType = bloodDecal?.id || "blood";

    super(gameManagers, entityType as any);
    const poolManager = PoolManager.getInstance();
    const size = poolManager.vector2.claim(16, 16);
    this.addExtension(new Positionable(this).setSize(size));
    this.addExtension(new Expirable(this, 10)); // Expires after 10 seconds
  }
}
