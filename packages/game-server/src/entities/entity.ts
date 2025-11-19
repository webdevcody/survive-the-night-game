import { IEntityManager, IGameManagers } from "@/managers/types";
import { Extension, ExtensionCtor } from "@/extensions/types";
import { EntityType } from "@/types/entity";
import { IEntity } from "./types";
import { EntityCategory, EntityCategories } from "@shared/entities";
import { BufferWriter } from "@shared/util/buffer-serialization";
import { entityTypeRegistry } from "@shared/util/entity-type-encoding";
import { encodeExtensionType } from "@shared/util/extension-type-encoding";
import { SerializableFields } from "@/util/serializable-fields";
import {
  FIELD_TYPE_STRING,
  FIELD_TYPE_NUMBER,
  FIELD_TYPE_BOOLEAN,
  FIELD_TYPE_OBJECT,
  FIELD_TYPE_NULL,
} from "@shared/util/serialization-constants";

export class Entity<TSerializableFields extends readonly string[] = readonly string[]>
  extends EventTarget
  implements IEntity
{
  private id: number;
  private readonly type: EntityType;
  protected extensions: Map<ExtensionCtor, Extension> = new Map();
  private updatableExtensions: Extension[] = []; // Extensions that have an update method
  private dirtyExtensions: Set<Extension> = new Set(); // Track which extensions are dirty
  private dirty: boolean = false; // Entity-level dirty flag for O(1) lookup
  private readonly gameManagers: IGameManagers;
  private markedForRemoval = false;
  private removedExtensions: string[] = []; // Track removed extensions
  private hasBeenSerialized: boolean = false; // Track if entity has been serialized at least once

  // Serializable fields with automatic dirty tracking
  // Subclasses should initialize this in their constructor with default values
  protected serialized: SerializableFields = new SerializableFields({}, () =>
    this.markEntityDirty()
  );

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

  public resetId(newId: number): void {
    this.id = newId;
  }

  public resetState(): void {
    this.hasBeenSerialized = false;
    this.markedForRemoval = false;
    this.removedExtensions = [];
    this.dirty = true;
    this.dirtyExtensions.clear();

    // Mark all extensions as dirty
    for (const extension of this.extensions.values()) {
      extension.markDirty();
      this.dirtyExtensions.add(extension);
    }

    this.serialized.resetDirty();
    this.notifyTrackerDirty();
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
    this.serialized.resetDirty();
    if (this.dirty) {
      this.dirty = false;
      this.notifyTrackerClean();
    }
  }

  /**
   * Mark entity as dirty (called automatically when serialized fields change).
   * @deprecated Use serialized.set() or serialized.field = value instead
   */
  protected markFieldDirty(fieldName: TSerializableFields[number]): void {
    // Legacy support - now handled automatically by SerializableFields Proxy
    // This method is kept for backward compatibility but does nothing
    // since the Proxy automatically marks fields dirty
  }

  /**
   * Internal method to mark entity as dirty when serialized fields change.
   * Made protected so subclasses can use it in callbacks.
   */
  protected markEntityDirty(): void {
    if (!this.dirty) {
      this.dirty = true;
      this.notifyTrackerDirty();
    }
  }

  /**
   * Check if a field is marked as dirty.
   * @param fieldName - The name of the field to check
   */
  protected isFieldDirty(fieldName: string): boolean {
    return this.serialized.getDirtyFields().has(fieldName);
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
    (global as any).logDepth = 0;
    writer.writeUInt16(this.id);

    // Write entity type as 1-byte numeric ID
    writer.writeUInt8(entityTypeRegistry.encode(this.type));

    // Write custom entity fields from serialized Map
    // First write count of fields that will be included
    const dirtyFields = this.serialized.getDirtyFields();
    const allKeys = this.serialized.getAllKeys();
    const fieldValues: Array<{ name: string; value: any }> = [];

    for (const fieldName of allKeys) {
      if (!onlyDirty || dirtyFields.has(fieldName)) {
        fieldValues.push({
          name: fieldName,
          value: this.serialized.get(fieldName),
        });
      }
    }

    if (fieldValues.length > 255) {
      throw new Error(`Field count ${fieldValues.length} exceeds UInt8 maximum (255)`);
    }
    writer.writeUInt8(fieldValues.length);

    // Write field names and values
    for (let i = 0; i < fieldValues.length; i++) {
      const field = fieldValues[i];
      writer.writeString(field.name);
      const value = field.value;
      const metadata = this.serialized.getFieldMetadata?.(field.name);

      if (typeof value === "string") {
        writer.writeUInt8(FIELD_TYPE_STRING);
        writer.writeString(value);
      } else if (typeof value === "number") {
        writer.writeUInt8(FIELD_TYPE_NUMBER);
        // Use metadata to determine number serialization type, fallback to float64
        const numberType = metadata?.numberType || "float64";
        // Write number subtype: 0=uint8, 1=uint16, 2=uint32, 3=float64
        const numberSubtype =
          numberType === "uint8"
            ? 0
            : numberType === "uint16"
            ? 1
            : numberType === "uint32"
            ? 2
            : 3;
        writer.writeUInt8(numberSubtype);
        if (numberType === "uint8") {
          writer.writeUInt8(value);
        } else if (numberType === "uint16") {
          writer.writeUInt16(value);
        } else if (numberType === "uint32") {
          // Handle optional fields: undefined/-1 becomes 0xFFFFFFFF
          const numValue =
            metadata?.optional && (value === undefined || value === -1) ? 0xffffffff : value;
          writer.writeUInt32(numValue);
        } else {
          // float64 - handle optional fields: undefined becomes NaN
          const numValue = metadata?.optional && value === undefined ? NaN : value;
          writer.writeFloat64(numValue);
        }
      } else if (typeof value === "boolean") {
        writer.writeUInt8(FIELD_TYPE_BOOLEAN);
        writer.writeBoolean(value);
      } else if (value === null) {
        // Handle null values using dedicated null type
        writer.writeUInt8(FIELD_TYPE_NULL);
        // No value written for null
      } else if (value && typeof value === "object") {
        writer.writeUInt8(FIELD_TYPE_OBJECT);
        writer.writeString(JSON.stringify(value));
      } else {
        writer.writeUInt8(FIELD_TYPE_STRING); // Type: string (fallback)
        writer.writeString(String(value ?? ""));
      }
    }

    // Write extensions
    // When onlyDirty is true, only send extensions that are dirty
    // When onlyDirty is false (full state), send all extensions
    // Exception: For first serialization, always send all extensions (even if onlyDirty=true)
    // The "only dirty" logic also applies to fields within extensions
    (global as any).logDepth = 1;
    const extensionsToWrite: Extension[] =
      shouldSerializeAllExtensions || !onlyDirty
        ? Array.from(this.extensions.values())
        : this.getDirtyExtensions();
    if (extensionsToWrite.length > 255) {
      throw new Error(`Extension count ${extensionsToWrite.length} exceeds UInt8 maximum (255)`);
    }
    writer.writeUInt8(extensionsToWrite.length);
    for (let i = 0; i < extensionsToWrite.length; i++) {
      const ext = extensionsToWrite[i];
      ext.serializeToBuffer(writer, onlyDirty && !isFirstSerialization);
    }

    // Write removed extensions array (if any)
    if (this.removedExtensions.length > 255) {
      throw new Error(
        `Removed extensions count ${this.removedExtensions.length} exceeds UInt8 maximum (255)`
      );
    }
    writer.writeUInt8(this.removedExtensions.length);
    for (let i = 0; i < this.removedExtensions.length; i++) {
      const removedType = this.removedExtensions[i];
      writer.writeUInt8(encodeExtensionType(removedType));
    }
    // Clear the removed extensions after serializing
    this.removedExtensions = [];

    // Mark entity as having been serialized
    this.hasBeenSerialized = true;
  }
}
