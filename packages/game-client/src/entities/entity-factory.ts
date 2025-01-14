import { RawEntity } from "@survive-the-night/game-shared/src/types/entity";
import { Entities } from "@survive-the-night/game-shared/src/constants";
import { AssetManager } from "../managers/asset";
import { IClientEntity } from "./util";
import { BulletClient } from "./bullet";
import { ZombieClient } from "./zombie";
import { WallClient } from "./items/wall";
import { ClothClient } from "./items/cloth";
import { PlayerClient } from "./player";
import { TreeClient } from "./items/tree";
import { BandageClient } from "./items/bandage";
import { SpikesClient } from "./items/spikes";
import { FireClient } from "./environment/fire";
import { TorchClient } from "./items/torch";
import { GasolineClient } from "./items/gasoline";
import { PistolClient } from "./weapons/pistol";
import { ShotgunClient } from "./weapons/shotgun";
import { KnifeClient } from "./weapons/knife";
import { PistolAmmoClient } from "./weapons/pistol-ammo";
import { ShotgunAmmoClient } from "./weapons/shotgun-ammo";

const entityMap = {
  [Entities.PLAYER]: PlayerClient,
  [Entities.TREE]: TreeClient,
  [Entities.BULLET]: BulletClient,
  [Entities.WALL]: WallClient,
  [Entities.PISTOL]: PistolClient,
  [Entities.PISTOL_AMMO]: PistolAmmoClient,
  [Entities.SHOTGUN]: ShotgunClient,
  [Entities.SHOTGUN_AMMO]: ShotgunAmmoClient,
  [Entities.KNIFE]: KnifeClient,
  [Entities.BANDAGE]: BandageClient,
  [Entities.CLOTH]: ClothClient,
  [Entities.SPIKES]: SpikesClient,
  [Entities.FIRE]: FireClient,
  [Entities.TORCH]: TorchClient,
  [Entities.GASOLINE]: GasolineClient,
  [Entities.ZOMBIE]: ZombieClient,
};
export class EntityFactory {
  private assetManager: AssetManager;

  constructor(assetManager: AssetManager) {
    this.assetManager = assetManager;
  }

  public createEntity(data: RawEntity): IClientEntity {
    if (!data || !data.type) {
      throw new Error(`Invalid entity data: ${JSON.stringify(data)}`);
    }

    const EntityClass = entityMap[data.type];
    if (!EntityClass) {
      throw new Error(`Unknown entity type: ${data.type}`);
    }

    return new EntityClass(data, this.assetManager);
  }
}
