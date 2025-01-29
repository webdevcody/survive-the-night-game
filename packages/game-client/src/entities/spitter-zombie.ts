import { RawEntity } from "@shared/types/entity";
import { AssetManager } from "@/managers/asset";
import { EnemyClient } from "./enemy-client";

export class SpitterZombieClient extends EnemyClient {
  constructor(data: RawEntity, assetManager: AssetManager) {
    super(data, assetManager);
  }

  protected getDebugWaypointColor(): string {
    return "green"; // Different color for spitter zombie
  }

  protected getEnemyAssetPrefix(): string {
    return "spitter_zombie";
  }

  protected getAnimationDuration(): number {
    return 750; // Slower animation for spitter zombie
  }
}
