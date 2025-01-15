import { IEntityManager } from "@server/managers/types";
import { EntityType, Extension, ExtensionCtor, RawEntity } from "../types/entity";

export interface IEntity extends EventTarget {
  getType(): EntityType;
  getId(): string;
  getEntityManager(): IEntityManager;

  addExtension(extension: Extension): void;
  removeExtension(extension: Extension): void;
  getExtensions(): Extension[];

  setId(id: string): void;
  setType(type: EntityType): void;

  hasExt<T>(ext: ExtensionCtor<T>): boolean;
  getExt<T>(ext: ExtensionCtor<T>): T;

  serialize(): RawEntity;
}
