import { IEntity } from "@/entities/types";
import { BufferWriter } from "@shared/util/buffer-serialization";
import { encodeExtensionType } from "@shared/util/extension-type-encoding";
import { ExtensionBase } from "./extension-base";
import Positionable from "./positionable";
import Poison from "./poison";
import { Entities } from "@shared/constants";
import { getConfig } from "@shared/config";
import { Player } from "@/entities/players/player";

type ToxicBiomeZoneFields = {
  age: number;
};

/**
 * Extension for ToxicBiomeZone that handles poison application to players within the zone.
 * Unlike ToxicGasCloudExtension, this does not spread - it only poisons players.
 */
export class ToxicBiomeZoneExtension extends ExtensionBase<ToxicBiomeZoneFields> {
  public static readonly type = "toxic-biome-zone";

  private readonly TILE_SIZE = getConfig().world.TILE_SIZE;

  public constructor(self: IEntity) {
    super(self, {
      age: 0,
    });
  }

  public update(deltaTime: number): void {
    const age = this.serialized.get("age") + deltaTime;
    this.serialized.set("age", age);

    // Check for nearby players and apply poison
    this.checkForPlayers();
  }

  /**
   * Check for players within the zone bounds and apply poison
   * Made public so it can be called immediately when zone spawns
   */
  public checkForPlayers(): void {
    const positionable = this.self.getExt(Positionable);
    const position = positionable.getPosition();
    const size = positionable.getSize();

    // Get nearby entities within the zone's bounding box plus generous margin
    // Use diagonal distance to ensure we catch all players, even on corners
    const diagonalDistance = Math.sqrt(size.x * size.x + size.y * size.y) / 2;
    const checkRadius = diagonalDistance + this.TILE_SIZE * 2; // Extra margin for safety
    const centerX = position.x + size.x / 2;
    const centerY = position.y + size.y / 2;

    const playerTypeSet = new Set([Entities.PLAYER]);
    const nearbyEntities = this.self
      .getEntityManager()
      .getNearbyEntities({ x: centerX, y: centerY }, checkRadius, playerTypeSet);

    for (const entity of nearbyEntities) {
      if (!entity.hasExt(Positionable)) continue;

      // Skip zombie players - toxic zones only affect human players
      if (entity instanceof Player && entity.isZombie()) continue;

      const entityPos = entity.getExt(Positionable);
      const entityCenter = entityPos.getCenterPosition();

      // Check if entity center is within zone bounds (inclusive on all sides)
      // Use <= on max bounds to catch players exactly on the edge
      if (
        entityCenter.x >= position.x &&
        entityCenter.x <= position.x + size.x &&
        entityCenter.y >= position.y &&
        entityCenter.y <= position.y + size.y
      ) {
        // Player is in zone - apply or refresh poison
        if (entity.hasExt(Poison)) {
          // Refresh the poison to keep damaging while in zone
          entity.getExt(Poison).refresh();
        } else {
          entity.addExtension(new Poison(entity, 3, 1, 1)); // maxDamage: 3, damagePerTick: 1, interval: 1
        }
      }
    }
  }

  public serializeToBuffer(writer: BufferWriter, onlyDirty: boolean = false): void {
    writer.writeUInt8(encodeExtensionType(ToxicBiomeZoneExtension.type));
    writer.writeFloat64(this.serialized.get("age"));
  }
}
