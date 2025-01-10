import { RawEntity, EntityType, Extension, ExtensionCtor } from "@survive-the-night/game-shared";
import { EntityManager } from "../managers/entity-manager";

export class Entity extends EventTarget {
  private id: string;
  private type: EntityType;
  protected extensions: Extension[] = [];
  private entityManager: EntityManager;

  public constructor(entityManager: EntityManager, type: EntityType) {
    super();

    this.id = entityManager.generateEntityId();
    this.entityManager = entityManager;
    this.type = type;
    this.extensions = [];
  }

  public getType(): EntityType {
    return this.type;
  }

  public getId(): string {
    return this.id;
  }

  public getEntityManager(): EntityManager {
    return this.entityManager;
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
    return this.extensions.some((e) => e instanceof ext);
  }

  public getExt<T>(ext: ExtensionCtor<T>): T {
    const extension = this.extensions.find((e) => e instanceof ext);
    if (!extension) {
      throw new Error(`Extension ${(ext as any).type} not found`);
    }
    return extension as T;
  }

  public serialize(): RawEntity {
    return {
      id: this.id,
      type: this.type,
      extensions: this.extensions.map((ext) => {
        return ext.serialize();
      }),
    };
  }
}
