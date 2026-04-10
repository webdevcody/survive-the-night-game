import { Entity } from "@/entities/entity";
import { IGameManagers } from "@/managers/types";
import Positionable from "@/extensions/positionable";
import Interactive from "@/extensions/interactive";
import { Entities } from "@shared/constants";
import PoolManager from "@shared/util/pool-manager";
import { getConfig } from "@shared/config";
import { SerializableFields } from "@/util/serializable-fields";

/** Map-placed interactable sign; lines are authored in world-map.json `messageDecals`. */
export class MessageDecal extends Entity {
  constructor(gameManagers: IGameManagers, dialogueLines: string[], tileX: number, tileY: number) {
    super(gameManagers, Entities.MESSAGE_DECAL);

    this.serialized = new SerializableFields(
      {
        dialogueLines,
      },
      () => this.markEntityDirty(),
      {},
    );

    const poolManager = PoolManager.getInstance();
    const TILE_SIZE = getConfig().world.TILE_SIZE;
    const size = poolManager.vector2.claim(16, 16);
    const topLeft = poolManager.vector2.claim(tileX * TILE_SIZE, tileY * TILE_SIZE);

    this.addExtension(new Positionable(this).setSize(size).setPosition(topLeft));
    this.addExtension(
      new Interactive(this).onInteract(() => {}).setDisplayName("search"),
    );
  }
}
