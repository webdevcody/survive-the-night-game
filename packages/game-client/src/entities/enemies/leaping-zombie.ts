import { RawEntity } from "@shared/types/entity";
import { AssetManager } from "@/managers/asset";
import { EnemyClient } from "@/entities/enemy-client";

export class LeapingZombieClient extends EnemyClient {
  constructor(data: RawEntity, assetManager: AssetManager) {
    super(data, assetManager);
  }
}
