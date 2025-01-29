import { RawEntity } from "@shared/types/entity";
import { AssetManager } from "@/managers/asset";
import { EnemyClient } from "./enemy-client";

export class ZombieClient extends EnemyClient {
  constructor(data: RawEntity, assetManager: AssetManager) {
    super(data, assetManager);
  }

  protected getDebugWaypointColor(): string {
    return "yellow";
  }

  protected getEnemyAssetPrefix(): string {
    return "zombie";
  }

  protected getAnimationDuration(): number {
    return 500;
  }
}
