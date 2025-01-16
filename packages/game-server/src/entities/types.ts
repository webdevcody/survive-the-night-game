import { EntityType, RawEntity } from "@/types/entity";
import { Extension, ExtensionCtor } from "@/extensions/types";
import { IEntityManager } from "@/managers/types";

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
