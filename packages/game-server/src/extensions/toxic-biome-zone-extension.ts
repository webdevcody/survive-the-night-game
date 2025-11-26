import { IEntity } from "@/entities/types";
import { BufferWriter } from "@shared/util/buffer-serialization";
import { encodeExtensionType } from "@shared/util/extension-type-encoding";
import { ExtensionBase } from "./extension-base";
import Positionable from "./positionable";
import Poison from "./poison";
import { Entities } from "@shared/constants";
import { getConfig } from "@shared/config";

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
   */
  private checkForPlayers(): void {
    const positionable = this.self.getExt(Positionable);
    const position = positionable.getPosition();
    const size = positionable.getSize();

    // Get nearby entities within the zone's bounding box plus some margin
    const checkRadius = Math.max(size.x, size.y) / 2 + this.TILE_SIZE;
    const centerX = position.x + size.x / 2;
    const centerY = position.y + size.y / 2;

    const playerTypeSet = new Set([Entities.PLAYER]);
    const nearbyEntities = this.self
      .getEntityManager()
      .getNearbyEntities({ x: centerX, y: centerY }, checkRadius, playerTypeSet);

    for (const entity of nearbyEntities) {
      if (!entity.hasExt(Positionable)) continue;

      const entityPos = entity.getExt(Positionable);
      const entityCenter = entityPos.getCenterPosition();

      // Check if entity center is within zone bounds
      if (
        entityCenter.x >= position.x &&
        entityCenter.x < position.x + size.x &&
        entityCenter.y >= position.y &&
        entityCenter.y < position.y + size.y
      ) {
        // Player is in zone - apply poison if not already poisoned
        if (!entity.hasExt(Poison)) {
          entity.addExtension(new Poison(entity, 3, 1, 1)); // maxDamage: 1, damagePerTick: 1, interval: 1
        }
      }
    }
  }

  public serializeToBuffer(writer: BufferWriter, onlyDirty: boolean = false): void {
    writer.writeUInt8(encodeExtensionType(ToxicBiomeZoneExtension.type));
    writer.writeFloat64(this.serialized.get("age"));
  }
}
