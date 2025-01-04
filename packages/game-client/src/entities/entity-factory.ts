import { IClientEntity } from "./util";
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
import { GameState } from "@/state";
import { FireClient } from "./environment/fire";
import { EntityType } from "@survive-the-night/game-server/src/shared/entity-types";
import { TorchClient } from "./items/torch";
import { GasolineClient } from "./items/gasoline";

export class EntityFactory {
  private assetManager: AssetManager;
  private gameState: GameState;

  constructor(assetManager: AssetManager, gameState: GameState) {
    this.assetManager = assetManager;
    this.gameState = gameState;
  }

  public createEntity(entityType: EntityType, entityData: EntityDto) {
    // TODO: find a way to reduce the need to update this every time we add a new entity
    // it's easy to forget.
    const entityMap = {
      [Entities.PLAYER]: (data: EntityDto) => {
        const entity = new PlayerClient(data, this.assetManager);
        entity.deserialize(data);
        return entity;
      },
      [Entities.TREE]: (data: EntityDto) => {
        const entity = new TreeClient(data, this.assetManager);
        entity.deserialize(data);
        return entity;
      },
      [Entities.BULLET]: (data: EntityDto) => {
        const entity = new BulletClient(data.id, this.assetManager);
        entity.deserialize(data);
        return entity;
      },
      [Entities.WALL]: (data: EntityDto) => {
        const entity = new WallClient(data.id, this.assetManager);
        entity.deserialize(data);
        return entity;
      },
      [Entities.WEAPON]: (data: EntityDto) => {
        const entity = new WeaponClient(data, this.assetManager, data.weaponType);
        entity.deserialize(data);
        return entity;
      },
      [Entities.FIRE]: (data: EntityDto) => {
        const entity = new FireClient(data, this.assetManager);
        entity.deserialize(data);
        return entity;
      },
      [Entities.BANDAGE]: (data: EntityDto) => {
        const entity = new BandageClient(data, this.assetManager);
        entity.deserialize(data);
        return entity;
      },
      [Entities.CLOTH]: (data: EntityDto) => {
        const entity = new ClothClient(data, this.assetManager);
        entity.deserialize(data);
        return entity;
      },
      [Entities.GASOLINE]: (data: EntityDto) => {
        const entity = new GasolineClient(data, this.assetManager);
        entity.deserialize(data);
        return entity;
      },
      [Entities.ZOMBIE]: (data: EntityDto) => {
        const entity = new ZombieClient(data, this.assetManager);
        entity.deserialize(data);
        return entity;
      },
      [Entities.SPIKES]: (data: EntityDto) => {
        const entity = new SpikesClient(data, this.assetManager);
        entity.deserialize(data);
        return entity;
      },
      [Entities.TORCH]: (data: EntityDto) => {
        const entity = new TorchClient(data, this.assetManager);
        entity.deserialize(data);
        return entity;
      },
    };

    return entityMap[entityType](entityData) as IClientEntity;
  }

  private initializeEntity(entity: IClientEntity, data: EntityDto): void {
    Object.assign(entity, data);
  }
}
