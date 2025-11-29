import { Entity } from "@/entities/entity";
import { IGameManagers } from "@/managers/types";
import Positionable from "@/extensions/positionable";
import Vector2 from "@/util/vector2";
import { ToxicBiomeZoneExtension } from "@/extensions/toxic-biome-zone-extension";

/**
 * Large toxic zone entity that covers an entire biome.
 * Used to replace many individual ToxicGasCloud entities for performance.
 * Only handles poison checking - no spreading logic.
 */
export class ToxicBiomeZone extends Entity {
  private zoneExtension: ToxicBiomeZoneExtension;

  constructor(gameManagers: IGameManagers, position: Vector2, size: Vector2) {
    super(gameManagers, "toxic_biome_zone" as any);

    this.addExtension(new Positionable(this).setSize(size).setPosition(position));

    // Add the zone extension that handles poison logic
    this.zoneExtension = new ToxicBiomeZoneExtension(this);
    this.addExtension(this.zoneExtension);
  }

  /**
   * Call this immediately after adding the zone to entity manager
   * to check for players that are already in the zone
   */
  public checkForPlayersImmediately(): void {
    if (!this.isMarkedForRemoval()) {
      this.zoneExtension.checkForPlayers();
    }
  }
}
