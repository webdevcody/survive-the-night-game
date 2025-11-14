import { IEntityManager, IGameManagers } from "@/managers/types";
import { Extension, ExtensionCtor } from "@/extensions/types";
import { EntityType, RawEntity } from "@/types/entity";
import { IEntity } from "./types";
import { EntityCategory, EntityCategories } from "@shared/entities";

export class Entity<TSerializableFields extends readonly string[] = readonly string[]>
  extends EventTarget
  implements IEntity
{
  private readonly id: string;
  private readonly type: EntityType;
  protected extensions: Extension[] = [];
  private extensionTypes: Set<ExtensionCtor> = new Set(); // Fast O(1) lookup for hasExt
  private updatableExtensions: Extension[] = []; // Extensions that have an update method
  private dirtyExtensions: Set<Extension> = new Set(); // Track which extensions are dirty
  private readonly gameManagers: IGameManagers;
  private markedForRemoval = false;
  private removedExtensions: string[] = []; // Track removed extensions

  // Dirty field tracking for custom entity fields
  private dirtyFields: Set<TSerializableFields[number]> = new Set();

  // Subclasses should override this to define which fields should be serialized
  protected serializableFields: TSerializableFields = [] as unknown as TSerializableFields;

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

  public getCategory(): EntityCategory {
    // Default implementation - subclasses should override
    return EntityCategories.ITEM;
  }

  public getEntityManager(): IEntityManager {
    return this.gameManagers.getEntityManager();
  }

  public addExtension(extension: Extension) {
    this.extensions.push(extension);
    // Add the extension's constructor to the Set for fast lookup
    this.extensionTypes.add(extension.constructor as ExtensionCtor);
    // Track extensions with update methods
    if ("update" in extension && typeof (extension as any).update === "function") {
      this.updatableExtensions.push(extension);
    }
    // Mark new extensions as dirty (they need to be sent to clients)
    extension.markDirty();
    this.dirtyExtensions.add(extension);
  }

  public removeExtension(extension: Extension) {
    const index = this.extensions.indexOf(extension);
    if (index > -1) {
      this.extensions.splice(index, 1);
      // Remove from the Set
      this.extensionTypes.delete(extension.constructor as ExtensionCtor);
      // Remove from updatable extensions if present
      const updatableIndex = this.updatableExtensions.indexOf(extension);
      if (updatableIndex > -1) {
        this.updatableExtensions.splice(updatableIndex, 1);
      }
      // Remove from dirty extensions tracking
      this.dirtyExtensions.delete(extension);
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

  public getUpdatableExtensions(): Extension[] {
    return this.updatableExtensions;
  }

  public hasUpdatableExtensions(): boolean {
    return this.updatableExtensions.length > 0;
  }

  public isDirty(): boolean {
    // Check if any extension is dirty
    for (const extension of this.extensions) {
      if (extension.isDirty()) {
        return true;
      }
    }
    // Also check if there are removed extensions (entity structure changed)
    return this.removedExtensions.length > 0;
  }

  public getDirtyExtensions(): Extension[] {
    return Array.from(this.dirtyExtensions);
  }

  public clearDirtyFlags(): void {
    for (const extension of this.dirtyExtensions) {
      if (extension.clearDirty) {
        extension.clearDirty();
      }
    }
    this.dirtyExtensions.clear();
    this.dirtyFields.clear();
  }

  /**
   * Mark a field as dirty so it will be included in the next dirty-only serialization.
   * @param fieldName - The name of the field to mark as dirty
   */
  protected markFieldDirty(fieldName: TSerializableFields[number]): void {
    this.dirtyFields.add(fieldName);
  }

  /**
   * Check if a field is marked as dirty.
   * @param fieldName - The name of the field to check
   */
  protected isFieldDirty(fieldName: TSerializableFields[number]): boolean {
    return this.dirtyFields.has(fieldName);
  }

  public markExtensionDirty(extension: Extension): void {
    // Just add to dirty set - extension already marked itself dirty before calling this
    this.dirtyExtensions.add(extension);
  }

  public hasExt<T>(ext: ExtensionCtor<T>): boolean {
    return this.extensionTypes.has(ext);
  }

  public getExt<T>(ext: ExtensionCtor<T>): T {
    // Fast path: if we know the extension exists, find it directly
    if (this.extensionTypes.has(ext)) {
      const extension = this.extensions.find((e) => e instanceof ext);
      if (extension) {
        return extension as T;
      }
    }
    // Fallback for inheritance cases
    const extension = this.extensions.find((e) => e instanceof ext);
    if (!extension) {
      throw new Error(`Extension ${(ext as any).type} not found`);
    }
    return extension as T;
  }

  public serialize(onlyDirty: boolean = false): RawEntity {
    const serialized: RawEntity = {
      id: this.id,
      type: this.type,
      extensions: this.extensions
        .map((ext) => {
          if (onlyDirty) {
            // Only serialize dirty extensions
            if (ext.isDirty()) {
              // Use serializeDirty if available, otherwise fall back to serialize
              if (ext.serializeDirty) {
                const dirtyData = ext.serializeDirty();
                return dirtyData !== null ? dirtyData : ext.serialize();
              }
              return ext.serialize();
            }
            return null;
          } else {
            // Serialize all extensions
            return ext.serialize();
          }
        })
        .filter((ext) => ext !== null) as any[],
    };

    // Only include removedExtensions if there are any
    if (this.removedExtensions.length > 0) {
      serialized.removedExtensions = [...this.removedExtensions];
      // Clear the removed extensions after serializing
      this.removedExtensions = [];
    }

    // Serialize custom entity fields based on serializableFields definition
    if (this.serializableFields.length > 0) {
      for (const fieldName of this.serializableFields) {
        if (!onlyDirty || this.dirtyFields.has(fieldName)) {
          // Access the field value from the entity instance
          serialized[fieldName] = (this as any)[fieldName];
        }
      }
    }

    return serialized;
  }
}
