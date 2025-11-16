import { IEntityManager, IGameManagers } from "@/managers/types";
import { Extension, ExtensionCtor } from "@/extensions/types";
import { EntityType } from "@/types/entity";
import { IEntity } from "./types";
import { EntityCategory, EntityCategories } from "@shared/entities";
import { BufferWriter } from "@shared/util/buffer-serialization";
import { entityTypeRegistry } from "@shared/util/entity-type-encoding";

export class Entity<TSerializableFields extends readonly string[] = readonly string[]>
  extends EventTarget
  implements IEntity
{
  private readonly id: number;
  private readonly type: EntityType;
  protected extensions: Map<ExtensionCtor, Extension> = new Map();
  private updatableExtensions: Extension[] = []; // Extensions that have an update method
  private dirtyExtensions: Set<Extension> = new Set(); // Track which extensions are dirty
  private dirty: boolean = false; // Entity-level dirty flag for O(1) lookup
  private readonly gameManagers: IGameManagers;
  private markedForRemoval = false;
  private removedExtensions: string[] = []; // Track removed extensions
  private hasBeenSerialized: boolean = false; // Track if entity has been serialized at least once

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

  public getId(): number {
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

  public serializeToBuffer(writer: BufferWriter, onlyDirty: boolean = false): void {
    // For new entities (first serialization), always serialize all extensions
    const isFirstSerialization = !this.hasBeenSerialized;
    const shouldSerializeAllExtensions = !onlyDirty || isFirstSerialization;

    // Write entity ID as unsigned 2-byte integer
    writer.writeUInt16(this.id);

    // Write entity type as 1-byte numeric ID
    writer.writeUInt8(entityTypeRegistry.encode(this.type));

    // Write custom entity fields based on serializableFields definition
    // First write count of fields that will be included
    let fieldsToWrite = 0;
    const fieldValues: Array<{ name: string; value: any }> = [];
    if (this.serializableFields.length > 0) {
      for (const fieldName of this.serializableFields) {
        if (!onlyDirty || this.dirtyFields.has(fieldName)) {
          fieldsToWrite++;
          fieldValues.push({
            name: fieldName,
            value: (this as any)[fieldName],
          });
        }
      }
    }
    writer.writeUInt32(fieldsToWrite);
    // Write each field: name, type byte, then value
    // Type bytes: 0 = string, 1 = number, 2 = boolean, 3 = object (JSON string)
    for (const field of fieldValues) {
      writer.writeString(field.name);
      const value = field.value;
      if (typeof value === "string") {
        writer.writeUInt32(0); // Type: string
        writer.writeString(value);
      } else if (typeof value === "number") {
        writer.writeUInt32(1); // Type: number
        writer.writeFloat64(value);
      } else if (typeof value === "boolean") {
        writer.writeUInt32(2); // Type: boolean
        writer.writeBoolean(value);
      } else if (value && typeof value === "object") {
        writer.writeUInt32(3); // Type: object (JSON string)
        writer.writeString(JSON.stringify(value));
      } else {
        writer.writeUInt32(0); // Type: string (fallback)
        writer.writeString(String(value ?? ""));
      }
    }

    // Write extensions
    const extensionsToWrite: Extension[] = [];
    for (const ext of this.extensions.values()) {
      if (shouldSerializeAllExtensions) {
        extensionsToWrite.push(ext);
      } else {
        // Only serialize dirty extensions for subsequent updates
        if (ext.isDirty()) {
          extensionsToWrite.push(ext);
        }
      }
    }
    writer.writeUInt32(extensionsToWrite.length);
    for (const ext of extensionsToWrite) {
      // Write extension to temporary buffer first to get its length
      const tempWriter = new BufferWriter(1024);
      ext.serializeToBuffer(tempWriter);
      const extensionBuffer = tempWriter.getBuffer();
      // Write extension data (length prefix handled by writeBuffer)
      writer.writeBuffer(extensionBuffer);
    }

    // Write removed extensions array (if any)
    writer.writeUInt32(this.removedExtensions.length);
    for (const removedType of this.removedExtensions) {
      writer.writeString(removedType);
    }
    // Clear the removed extensions after serializing
    this.removedExtensions = [];

    // Mark entity as having been serialized
    this.hasBeenSerialized = true;
  }
}
