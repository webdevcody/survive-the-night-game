import { EntityType } from "@/types/entity";
import { Extension, ExtensionCtor } from "@/extensions/types";
import { IEntityManager } from "@/managers/types";
import { EntityCategory } from "@shared/entities";
import { BufferWriter } from "@/util/buffer-serialization";

export interface IEntity extends EventTarget {
  getType(): EntityType;
  getId(): number;
  getEntityManager(): IEntityManager;
  getCategory(): EntityCategory;

  addExtension(extension: Extension): void;
  removeExtension(extension: Extension): void;
  getExtensions(): Extension[];

  hasExt<T>(ext: ExtensionCtor<T>): boolean;
  getExt<T>(ext: ExtensionCtor<T>): T;

  isDirty(): boolean;
  markExtensionDirty(extension: Extension): void;
  clearDirtyFlags(): void;
  serializeToBuffer(writer: BufferWriter, onlyDirty: boolean): void;
}
