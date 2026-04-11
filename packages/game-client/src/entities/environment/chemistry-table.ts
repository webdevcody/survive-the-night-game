import type { RawEntity } from "@shared/types/entity";
import type { AssetManager } from "@/managers/asset";
import { CraftingStationClient } from "./crafting-station";

export class ChemistryTableClient extends CraftingStationClient {
  constructor(data: RawEntity, assetManager: AssetManager) {
    super(data, assetManager);
  }
}
