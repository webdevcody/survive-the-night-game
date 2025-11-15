import Expirable from "@/extensions/expirable";
import Positionable from "@/extensions/positionable";
import { IGameManagers } from "@/managers/types";
import { Entity } from "@/entities/entity";
import Vector2 from "@/util/vector2";
import { decalRegistry } from "@shared/entities";

export class Blood extends Entity {
  public static readonly Size = new Vector2(16, 16);

  constructor(gameManagers: IGameManagers) {
    // Get entity type from decal registry
    const bloodDecal = decalRegistry.get("blood");
    const entityType = bloodDecal?.id || "blood";

    super(gameManagers, entityType as any);

    this.addExtension(new Positionable(this).setSize(Blood.Size));
    this.addExtension(new Expirable(this, 10)); // Expires after 10 seconds
  }
}
