import { EntityManager } from "../managers/entity-manager";
import { EntityType } from "./entity-types";
import { Extension, ExtensionCtor, ExtensionSerialized, extensionsMap } from "./extensions";
export { Entities } from "./entity-types";

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

  public removeExtension(extension: Extension) {
    const index = this.extensions.indexOf(extension);
    if (index > -1) {
      this.extensions.splice(index, 1);
    }
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
      const type = (ext as any).type;
      throw new Error(`Unable to find extension ${type}`);
    }

    return found as T;
  }

  public deserialize(data: RawEntity): void {
    if (Array.isArray(data.extensions)) {
      const dataExtensions: ExtensionSerialized[] = data.extensions;

      this.extensions = dataExtensions.map((dataFromServer) => {
        const ExtensionConstructor = extensionsMap[
          dataFromServer.type as keyof typeof extensionsMap
        ] as unknown as ExtensionCtor<Extension>;

        if (!ExtensionConstructor) {
          throw new Error(
            `Unable to find extension ${dataFromServer.type}, please update the extensionsMap`
          );
        }

        return new ExtensionConstructor(this).deserialize(dataFromServer);
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
