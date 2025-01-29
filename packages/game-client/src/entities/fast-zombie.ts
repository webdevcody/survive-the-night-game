import { RawEntity } from "@shared/types/entity";
import { AssetManager } from "@/managers/asset";
import { EnemyClient } from "./enemy-client";

export class FastZombieClient extends EnemyClient {
  constructor(data: RawEntity, assetManager: AssetManager) {
    super(data, assetManager);
  }

  protected getDebugWaypointColor(): string {
    return "red";
  }

  protected getEnemyAssetPrefix(): string {
    return "fast_zombie";
  }

  protected getAnimationDuration(): number {
    return 250; // Faster animation for fast zombie
  }
}
