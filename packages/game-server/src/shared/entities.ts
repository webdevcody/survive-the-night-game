import { EntityManager } from "../managers/entity-manager";
import { Extension, ExtensionCtor, ExtensionSerialized, extensionsMap } from "./extensions";

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

  getType(): EntityType {
    return this.type;
  }

  getId(): string {
    return this.id;
  }

  setId(id: string) {
    this.id = id;
  }

  setType(type: EntityType) {
    this.type = type;
  }

  public hasExt<T>(ext: ExtensionCtor<T>): boolean {
    return this.extensions.some((it) => it instanceof ext);
  }

  public getExt<T>(ext: ExtensionCtor<T>): T {
    const found = this.extensions.find((it) => it instanceof ext);

    if (found === undefined) {
      throw new Error("Unable to find extension");
    }

    return found;
  }

  public deserialize(data: RawEntity): void {
    if (Array.isArray(data.extensions)) {
      const dataExtensions: ExtensionSerialized[] = data.extensions;

      this.extensions = dataExtensions.map((extData) => {
        const Ext = extensionsMap[extData.name];
        return new Ext(this).deserialize(extData);
      });
    }
  }

  public serialize(): RawEntity {
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
