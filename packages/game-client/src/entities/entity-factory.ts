import { Entities } from "@survive-the-night/game-server";
import { PlayerClient } from "./player";
import { TreeClient } from "./items/tree";
import { BulletClient } from "./bullet";
import { WallClient } from "./items/wall";
import { WeaponClient } from "./weapons/weapon";
import { BandageClient } from "./items/bandage";
import { ClothClient } from "./items/cloth";
import { ZombieClient } from "./zombie";
import { SpikesClient } from "./items/spikes";
import { EntityDto } from "../managers/client-socket-manager";
import { AssetManager } from "@/managers/asset";
import { FireClient } from "./environment/fire";
import { EntityType } from "@survive-the-night/game-server/src/shared/entity-types";
import { TorchClient } from "./items/torch";
import { GasolineClient } from "./items/gasoline";

const ENTITY_MAP = {
  [Entities.PLAYER]: PlayerClient,
  [Entities.TREE]: TreeClient,
  [Entities.BULLET]: BulletClient,
  [Entities.WALL]: WallClient,
  [Entities.WEAPON]: WeaponClient,
  [Entities.FIRE]: FireClient,
  [Entities.BANDAGE]: BandageClient,
  [Entities.CLOTH]: ClothClient,
  [Entities.GASOLINE]: GasolineClient,
  [Entities.TORCH]: TorchClient,
  [Entities.ZOMBIE]: ZombieClient,
  [Entities.SPIKES]: SpikesClient,
};

export class EntityFactory {
  private assetManager: AssetManager;

  constructor(assetManager: AssetManager) {
    this.assetManager = assetManager;
  }

  public createEntity(entityType: EntityType, entityData: EntityDto) {
    const entity = new ENTITY_MAP[entityType](entityData, this.assetManager);
    entity.deserialize(entityData);
    return entity;
  }
}
