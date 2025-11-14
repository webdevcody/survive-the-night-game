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
  protected extensions: Map<ExtensionCtor, Extension> = new Map();
  private updatableExtensions: Extension[] = []; // Extensions that have an update method
  private dirtyExtensions: Set<Extension> = new Set(); // Track which extensions are dirty
  private dirty: boolean = false; // Entity-level dirty flag for O(1) lookup
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
    this.extensions = new Map();
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

  /**
   * Notify the entity state tracker that this entity is dirty.
   * This is called automatically when the entity becomes dirty.
   */
  private notifyTrackerDirty(): void {
    try {
      const tracker = this.gameManagers.getEntityManager().getEntityStateTracker();
      tracker.trackDirtyEntity(this);
    } catch (error) {
      // Entity manager or tracker may not be initialized yet (e.g., during construction)
      // This is fine - the entity will be tracked when it's added to the entity manager
    }
  }

  /**
   * Notify the entity state tracker that this entity is no longer dirty.
   * This is called automatically when dirty flags are cleared.
   */
  private notifyTrackerClean(): void {
    try {
      const tracker = this.gameManagers.getEntityManager().getEntityStateTracker();
      tracker.untrackDirtyEntity(this);
    } catch (error) {
      // Entity manager or tracker may not be initialized yet
      // This is fine - nothing to clean up if not tracked
    }
  }

  public addExtension(extension: Extension) {
    this.extensions.set(extension.constructor as ExtensionCtor, extension);
    // Track extensions with update methods
    if ("update" in extension && typeof (extension as any).update === "function") {
      this.updatableExtensions.push(extension);
    }
    // Mark new extensions as dirty (they need to be sent to clients)
    extension.markDirty();
    this.dirtyExtensions.add(extension);
    // Mark entity as dirty when new extensions are added (entity structure changed)
    if (!this.dirty) {
      this.dirty = true;
      this.notifyTrackerDirty();
    }
  }

  public removeExtension(extension: Extension) {
    const constructor = extension.constructor as ExtensionCtor;
    if (this.extensions.has(constructor)) {
      this.extensions.delete(constructor);
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
      // Mark entity as dirty when extensions are removed (entity structure changed)
      if (!this.dirty) {
        this.dirty = true;
        this.notifyTrackerDirty();
      }
    }
  }

  public getExtensions(): Extension[] {
    return Array.from(this.extensions.values());
  }

  public getUpdatableExtensions(): Extension[] {
    return this.updatableExtensions;
  }

  public hasUpdatableExtensions(): boolean {
    return this.updatableExtensions.length > 0;
  }

  public isDirty(): boolean {
    // Constant-time O(1) check using entity-level dirty flag
    // Extensions bubble up their dirty state via markExtensionDirty()
    return this.dirty;
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
    if (this.dirty) {
      this.dirty = false;
      this.notifyTrackerClean();
    }
  }

  /**
   * Mark a field as dirty so it will be included in the next dirty-only serialization.
   * @param fieldName - The name of the field to mark as dirty
   */
  protected markFieldDirty(fieldName: TSerializableFields[number]): void {
    this.dirtyFields.add(fieldName);
    // Mark entity as dirty when a field is marked dirty
    if (!this.dirty) {
      this.dirty = true;
      this.notifyTrackerDirty();
    }
  }

  /**
   * Check if a field is marked as dirty.
   * @param fieldName - The name of the field to check
   */
  protected isFieldDirty(fieldName: TSerializableFields[number]): boolean {
    return this.dirtyFields.has(fieldName);
  }

  public markExtensionDirty(extension: Extension): void {
    // Extension already marked itself dirty before calling this
    // Bubble up dirty state to entity level for O(1) lookup
    this.dirtyExtensions.add(extension);
    if (!this.dirty) {
      this.dirty = true;
      this.notifyTrackerDirty();
    }
  }

  public hasExt<T>(ext: ExtensionCtor<T>): boolean {
    return this.extensions.has(ext);
  }

  public getExt<T>(ext: ExtensionCtor<T>): T {
    const extension = this.extensions.get(ext);
    if (!extension) {
      throw new Error(`Extension ${(ext as any).type} not found`);
    }
    return extension as T;
  }

  public serialize(onlyDirty: boolean = false): RawEntity {
    const serialized: RawEntity = {
      id: this.id,
      type: this.type,
      extensions: Array.from(this.extensions.values())
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
