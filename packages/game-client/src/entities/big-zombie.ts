import { RawEntity } from "@shared/types/entity";
import { AssetManager } from "@/managers/asset";
import { EnemyClient } from "./enemy-client";

export class BigZombieClient extends EnemyClient {
  constructor(data: RawEntity, assetManager: AssetManager) {
    super(data, assetManager);
  }

  protected getDebugWaypointColor(): string {
    return "purple";
  }

  protected getEnemyAssetPrefix(): string {
    return "big_zombie";
  }

  protected getAnimationDuration(): number {
    return 500;
  }
}
