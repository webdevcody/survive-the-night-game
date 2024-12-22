import { IClientEntity } from "./util";
import { Entities, EntityType } from "@survive-the-night/game-server";
import { PlayerClient } from "./player";
import { TreeClient } from "./tree";
import { BulletClient } from "./bullet";
import { WallClient } from "./wall";
import { WeaponClient } from "./weapon";
import { BandageClient } from "./items/bandage";
import { ClothClient } from "./items/cloth";
import { ZombieClient } from "./zombie";
import { SoundClient } from "./sound";
import { SpikesClient } from "./buildings/spikes";
import { EntityDto } from "../managers/client-socket-manager";
import { AssetManager } from "@/managers/asset";
import { GameState } from "@/state";

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
        const entity = new PlayerClient(data.id, this.assetManager);
        this.initializeEntity(entity, data);
        return entity;
      },
      [Entities.TREE]: (data: EntityDto) => {
        const entity = new TreeClient(data, this.assetManager);
        entity.deserialize(data);
        return entity;
      },
      [Entities.BULLET]: (data: EntityDto) => {
        const entity = new BulletClient(data.id, this.assetManager);
        this.initializeEntity(entity, data);
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
      [Entities.ZOMBIE]: (data: EntityDto) => {
        const entity = new ZombieClient(data.id, this.assetManager);
        this.initializeEntity(entity, data);
        return entity;
      },
      [Entities.SOUND]: (data: EntityDto) => {
        const entity = new SoundClient(data, this.gameState);
        entity.deserialize(data);
        return entity;
      },
      [Entities.SPIKES]: (data: EntityDto) => {
        const entity = new SpikesClient(data, this.assetManager);
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
