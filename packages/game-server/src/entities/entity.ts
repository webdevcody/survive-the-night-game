import { IEntityManager, IGameManagers } from "@/managers/types";
import { Extension, ExtensionCtor } from "@/extensions/types";
import { EntityType, RawEntity } from "@/types/entity";
import { IEntity } from "./types";

export class Entity extends EventTarget implements IEntity {
  private readonly id: string;
  private readonly type: EntityType;
  protected extensions: Extension[] = [];
  private readonly gameManagers: IGameManagers;
  private markedForRemoval = false;
  private removedExtensions: string[] = []; // Track removed extensions

  public constructor(gameManagers: IGameManagers, type: EntityType) {
    super();

    this.id = gameManagers.getEntityManager().generateEntityId();
    this.gameManagers = gameManagers;
    this.type = type;
    this.extensions = [];
  }

  public setMarkedForRemoval(isMarkedForRemoval: boolean) {
    this.markedForRemoval = isMarkedForRemoval;
  }

  public isMarkedForRemoval(): boolean {
    return this.markedForRemoval;
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
      // Track the removed extension type
      const type = (extension.constructor as any).type;
      if (type) {
        this.removedExtensions.push(type);
      }
    }
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
    const serialized: RawEntity = {
      id: this.id,
      type: this.type,
      extensions: this.extensions.map((ext) => {
        return ext.serialize();
      }),
    };

    // Only include removedExtensions if there are any
    if (this.removedExtensions.length > 0) {
      serialized.removedExtensions = [...this.removedExtensions];
      // Clear the removed extensions after serializing
      this.removedExtensions = [];
    }

    return serialized;
  }
}
