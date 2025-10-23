import { EntityType, RawEntity } from "@/types/entity";
import { Extension, ExtensionCtor } from "@/extensions/types";
import { IEntityManager } from "@/managers/types";
import { EntityCategory } from "@shared/entities";

export interface IEntity extends EventTarget {
  getType(): EntityType;
  getId(): string;
  getEntityManager(): IEntityManager;
  getCategory(): EntityCategory;

  addExtension(extension: Extension): void;
  removeExtension(extension: Extension): void;
  getExtensions(): Extension[];

  hasExt<T>(ext: ExtensionCtor<T>): boolean;
  getExt<T>(ext: ExtensionCtor<T>): T;

  serialize(): RawEntity;
}
