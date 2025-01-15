import { RawEntity, EntityType, Extension, ExtensionCtor } from "@shared/types/entity";
import { IEntityManager, IGameManagers } from "../managers/types";

export class Entity extends EventTarget {
  private id: string;
  private type: EntityType;
  protected extensions: Extension[] = [];
  private gameManagers: IGameManagers;

  public constructor(gameManagers: IGameManagers, type: EntityType) {
    super();

    this.id = gameManagers.getEntityManager().generateEntityId();
    this.gameManagers = gameManagers;
    this.type = type;
    this.extensions = [];
  }

  public getGameManagers(): IGameManagers {
    return this.gameManagers;
  }

  public getType(): EntityType {
    return this.type;
  }

  public getId(): string {
    return this.id;
  }

  public getEntityManager(): IEntityManager {
    return this.gameManagers.getEntityManager();
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
