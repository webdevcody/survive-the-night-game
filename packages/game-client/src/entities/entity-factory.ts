import { RawEntity } from "@survive-the-night/game-shared/src/types/entity";
import { Entities } from "@survive-the-night/game-shared/src/constants";
import { AssetManager } from "../managers/asset";
import { IClientEntity } from "./util";
import { BulletClient } from "./bullet";
import { ZombieClient } from "./zombie";
import { WallClient } from "./items/wall";
import { ClothClient } from "./items/cloth";
import { WeaponClient } from "./weapons/weapon";
import { PlayerClient } from "./player";
import { TreeClient } from "./items/tree";
import { BandageClient } from "./items/bandage";
import { SpikesClient } from "./items/spikes";
import { FireClient } from "./environment/fire";
import { TorchClient } from "./items/torch";
import { GasolineClient } from "./items/gasoline";

export class EntityFactory {
  private assetManager: AssetManager;

  constructor(assetManager: AssetManager) {
    this.assetManager = assetManager;
  }

  public createEntity(data: RawEntity): IClientEntity {
    if (!data || !data.type) {
      throw new Error(`Invalid entity data: ${JSON.stringify(data)}`);
    }

    switch (data.type) {
      case Entities.PLAYER:
        return new PlayerClient(data, this.assetManager);
      case Entities.TREE:
        return new TreeClient(data, this.assetManager);
      case Entities.BULLET:
        return new BulletClient(data, this.assetManager);
      case Entities.WALL:
        return new WallClient(data, this.assetManager);
      case Entities.WEAPON:
        return new WeaponClient(data, this.assetManager);
      case Entities.BANDAGE:
        return new BandageClient(data, this.assetManager);
      case Entities.CLOTH:
        return new ClothClient(data, this.assetManager);
      case Entities.SPIKES:
        return new SpikesClient(data, this.assetManager);
      case Entities.FIRE:
        return new FireClient(data, this.assetManager);
      case Entities.TORCH:
        return new TorchClient(data, this.assetManager);
      case Entities.GASOLINE:
        return new GasolineClient(data, this.assetManager);
      case Entities.ZOMBIE:
        return new ZombieClient(data, this.assetManager);
      case Entities.BOUNDARY:
      case Entities.SOUND:
        // These entities don't need client-side representation
        throw new Error(`Entity type ${data.type} does not need client-side representation`);
      default:
        throw new Error(`Unknown entity type: ${data.type}`);
    }
  }
}
