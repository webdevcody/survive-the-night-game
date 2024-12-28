import { EntityManager } from "../managers/entity-manager";
import {
  Extension,
  ExtensionCtor,
  ExtensionSerialized,
  extensionsMap,
  TriggerCooldownAttacker,
} from "./extensions";

export const Entities = {
  WEAPON: "weapon",
  ZOMBIE: "zombie",
  PLAYER: "player",
  TREE: "tree",
  BULLET: "bullet",
  WALL: "wall",
  BOUNDARY: "boundary",
  BANDAGE: "bandage",
  CLOTH: "cloth",
  SOUND: "sound",
  SPIKES: "spikes",
  FIRE: "fire",
} as const;

export type EntityType = (typeof Entities)[keyof typeof Entities];

export type RawEntity = {
  id: string;
  type: EntityType;
  [key: string]: any;
};

export class GenericEntity extends EventTarget {
  private id: string;
  private type: EntityType;
  protected extensions: Extension[] = [];

  public constructor(data: RawEntity) {
    super();
    this.id = data.id;
    this.type = data.type;
    this.extensions = [];
  }

  public getType(): EntityType {
    return this.type;
  }

  public getId(): string {
    return this.id;
  }

  public addExtension(extension: Extension) {
    this.extensions.push(extension);
  }

  public setId(id: string) {
    this.id = id;
  }

  public setType(type: EntityType) {
    this.type = type;
  }

  public getExtensions(): Extension[] {
    return this.extensions;
  }

  public hasExt<T>(ext: ExtensionCtor<T>): boolean {
    return this.extensions.some((it) => it instanceof ext);
  }

  public getExt<T>(ext: ExtensionCtor<T>): T {
    const found = this.extensions.find((it) => it instanceof ext);

    if (found === undefined) {
      throw new Error(`Unable to find extension ${ext.name}`);
    }

    return found as T;
  }

  public deserialize(data: RawEntity): void {
    if (Array.isArray(data.extensions)) {
      const dataExtensions: ExtensionSerialized[] = data.extensions;

      this.extensions = dataExtensions.map((dataFromServer) => {
        const ExtensionConstructor = extensionsMap[dataFromServer.name];

        if (!ExtensionConstructor) {
          throw new Error(
            `Unable to find extension ${dataFromServer.name}, please update the extensionsMap`
          );
        }
        // TODO: this feels hacky, we shouldn't need to remember to update this when an extension needs more server managers
        if (dataFromServer.name === TriggerCooldownAttacker.Name) {
          return new TriggerCooldownAttacker(this, this.entityManager, dataFromServer).deserialize(
            dataFromServer
          );
        } else {
          return new ExtensionConstructor(this).deserialize(dataFromServer);
        }
      });
    }
  }

  public serialize(): RawEntity {
    return this.baseSerialize();
  }

  protected baseSerialize(): RawEntity {
    return {
      id: this.id,
      type: this.type,
      extensions: this.extensions.map((it) => it.serialize()),
    };
  }
}

export abstract class Entity extends GenericEntity {
  private entityManager: EntityManager;

  constructor(entityManager: EntityManager, type: EntityType) {
    super({
      id: entityManager.generateEntityId(),
      type,
    });

    this.entityManager = entityManager;
  }

  public getEntityManager(): EntityManager {
    return this.entityManager;
  }
}
