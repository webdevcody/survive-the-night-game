import { IEntityManager, IGameManagers } from "@/managers/types";
import { Extension, ExtensionCtor } from "@/extensions/types";
import { EntityType } from "@/types/entity";
import { IEntity } from "./types";
import { EntityCategory } from "@shared/entities";
import { BufferWriter } from "@shared/util/buffer-serialization";
import { SerializableFields } from "@/util/serializable-fields";
export declare class Entity<TSerializableFields extends readonly string[] = readonly string[]> extends EventTarget implements IEntity {
    private readonly id;
    private readonly type;
    protected extensions: Map<ExtensionCtor, Extension>;
    private updatableExtensions;
    private dirtyExtensions;
    private dirty;
    private readonly gameManagers;
    private markedForRemoval;
    private removedExtensions;
    protected serialized: SerializableFields;
    constructor(gameManagers: IGameManagers, type: EntityType);
    getSerialized(): SerializableFields;
    setMarkedForRemoval(isMarkedForRemoval: boolean): void;
    isMarkedForRemoval(): boolean;
    getGameManagers(): IGameManagers;
    getType(): EntityType;
    getId(): number;
    getCategory(): EntityCategory;
    getEntityManager(): IEntityManager;
    /**
     * Notify the entity state tracker that this entity is dirty.
     * This is called automatically when the entity becomes dirty.
     */
    private notifyTrackerDirty;
    /**
     * Notify the entity state tracker that this entity is no longer dirty.
     * This is called automatically when dirty flags are cleared.
     */
    private notifyTrackerClean;
    addExtension(extension: Extension): void;
    removeExtension(extension: Extension): void;
    getExtensions(): Extension[];
    getUpdatableExtensions(): Extension[];
    hasUpdatableExtensions(): boolean;
    isDirty(): boolean;
    getDirtyExtensions(): Extension[];
    clearDirtyFlags(): void;
    /**
     * Mark entity as dirty (called automatically when serialized fields change).
     * @deprecated Use serialized.set() instead
     */
    protected markFieldDirty(fieldName: TSerializableFields[number]): void;
    /**
     * Internal method to mark entity as dirty when serialized fields change.
     * Made protected so subclasses can use it in callbacks.
     */
    protected markEntityDirty(): void;
    /**
     * Check if a field is marked as dirty.
     * @param fieldName - The name of the field to check
     */
    protected isFieldDirty(fieldName: string): boolean;
    markExtensionDirty(extension: Extension): void;
    hasExt<T>(ext: ExtensionCtor<T>): boolean;
    getExt<T>(ext: ExtensionCtor<T>): T;
    serializeToBuffer(writer: BufferWriter, onlyDirty?: boolean): void;
}
