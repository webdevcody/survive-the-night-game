import { RawEntity } from "@shared/types/entity";
import { AssetManager } from "@/managers/asset";
import { EnemyClient } from "./enemy-client";

export class AcidFlyerClient extends EnemyClient {
  constructor(data: RawEntity, assetManager: AssetManager) {
    super(data, assetManager);
  }
}

