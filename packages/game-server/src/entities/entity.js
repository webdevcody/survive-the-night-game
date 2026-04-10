import { EntityCategories } from "@shared/entities";
import { entityTypeRegistry } from "@shared/util/entity-type-encoding";
import { encodeExtensionType } from "@shared/util/extension-type-encoding";
import { SerializableFields } from "@/util/serializable-fields";
import { FIELD_TYPE_STRING, FIELD_TYPE_NUMBER, FIELD_TYPE_BOOLEAN, FIELD_TYPE_OBJECT, FIELD_TYPE_NULL, } from "@shared/util/serialization-constants";
export class Entity extends EventTarget {
    constructor(gameManagers, type) {
        super();
        this.extensions = new Map();
        this.updatableExtensions = []; // Extensions that have an update method
        this.dirtyExtensions = new Set(); // Track which extensions are dirty
        this.dirty = false; // Entity-level dirty flag for O(1) lookup
        this.markedForRemoval = false;
        this.removedExtensions = []; // Track removed extensions
        // Serializable fields with automatic dirty tracking
        // Subclasses should initialize this in their constructor with default values
        this.serialized = new SerializableFields({}, () => this.markEntityDirty());
        this.id = gameManagers.getEntityManager().generateEntityId();
        this.gameManagers = gameManagers;
        this.type = type;
        this.extensions = new Map();
    }
    getSerialized() {
        return this.serialized;
    }
    setMarkedForRemoval(isMarkedForRemoval) {
        this.markedForRemoval = isMarkedForRemoval;
    }
    isMarkedForRemoval() {
        return this.markedForRemoval;
    }
    getGameManagers() {
        return this.gameManagers;
    }
    getType() {
        return this.type;
    }
    getId() {
        return this.id;
    }
    getCategory() {
        // Default implementation - subclasses should override
        return EntityCategories.ITEM;
    }
    getEntityManager() {
        return this.gameManagers.getEntityManager();
    }
    /**
     * Notify the entity state tracker that this entity is dirty.
     * This is called automatically when the entity becomes dirty.
     */
    notifyTrackerDirty() {
        try {
            const tracker = this.gameManagers.getEntityManager().getEntityStateTracker();
            tracker.trackDirtyEntity(this);
        }
        catch (error) {
            // Entity manager or tracker may not be initialized yet (e.g., during construction)
            // This is fine - the entity will be tracked when it's added to the entity manager
        }
    }
    /**
     * Notify the entity state tracker that this entity is no longer dirty.
     * This is called automatically when dirty flags are cleared.
     */
    notifyTrackerClean() {
        try {
            const tracker = this.gameManagers.getEntityManager().getEntityStateTracker();
            tracker.untrackDirtyEntity(this);
        }
        catch (error) {
            // Entity manager or tracker may not be initialized yet
            // This is fine - nothing to clean up if not tracked
        }
    }
    addExtension(extension) {
        const constructor = extension.constructor;
        // Remove old extension of the same type if it exists
        const oldExtension = this.extensions.get(constructor);
        if (oldExtension && oldExtension !== extension) {
            // Remove old extension from dirtyExtensions Set
            this.dirtyExtensions.delete(oldExtension);
            // Remove from updatableExtensions array if present
            const updatableIndex = this.updatableExtensions.indexOf(oldExtension);
            if (updatableIndex > -1) {
                this.updatableExtensions.splice(updatableIndex, 1);
            }
        }
        this.extensions.set(constructor, extension);
        // Track extensions with update methods
        if ("update" in extension && typeof extension.update === "function") {
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
    removeExtension(extension) {
        const constructor = extension.constructor;
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
            const type = extension.constructor.type;
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
    getExtensions() {
        return Array.from(this.extensions.values());
    }
    getUpdatableExtensions() {
        return this.updatableExtensions;
    }
    hasUpdatableExtensions() {
        return this.updatableExtensions.length > 0;
    }
    isDirty() {
        // Constant-time O(1) check using entity-level dirty flag
        // Extensions bubble up their dirty state via markExtensionDirty()
        return this.dirty;
    }
    getDirtyExtensions() {
        return Array.from(this.dirtyExtensions);
    }
    clearDirtyFlags() {
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
     * @deprecated Use serialized.set() instead
     */
    markFieldDirty(fieldName) {
        // Legacy support - now handled automatically by SerializableFields.set()
        // This method is kept for backward compatibility but does nothing
        // since set() automatically marks fields dirty
    }
    /**
     * Internal method to mark entity as dirty when serialized fields change.
     * Made protected so subclasses can use it in callbacks.
     */
    markEntityDirty() {
        if (!this.dirty) {
            this.dirty = true;
            this.notifyTrackerDirty();
        }
    }
    /**
     * Check if a field is marked as dirty.
     * @param fieldName - The name of the field to check
     */
    isFieldDirty(fieldName) {
        return this.serialized.getDirtyFields().has(fieldName);
    }
    markExtensionDirty(extension) {
        // Extension already marked itself dirty before calling this
        // Bubble up dirty state to entity level for O(1) lookup
        this.dirtyExtensions.add(extension);
        if (!this.dirty) {
            this.dirty = true;
            this.notifyTrackerDirty();
        }
    }
    hasExt(ext) {
        return this.extensions.has(ext);
    }
    getExt(ext) {
        const extension = this.extensions.get(ext);
        if (!extension) {
            throw new Error(`Extension ${ext.type} not found`);
        }
        return extension;
    }
    serializeToBuffer(writer, onlyDirty = false) {
        var _a, _b;
        // When onlyDirty=false, serialize all fields and all extensions with all their data
        const shouldSerializeAllExtensions = !onlyDirty;
        const shouldSerializeAllFields = !onlyDirty;
        // Write entity ID as unsigned 2-byte integer
        global.logDepth = 0;
        writer.writeUInt16(this.id);
        // Write entity type as 1-byte numeric ID
        writer.writeUInt8(entityTypeRegistry.encode(this.type));
        // Write custom entity fields from serialized Map
        // First write count of fields that will be included
        const dirtyFields = this.serialized.getDirtyFields();
        const allKeys = this.serialized.getAllKeys();
        const fieldValues = [];
        for (const fieldName of allKeys) {
            if (shouldSerializeAllFields || dirtyFields.has(fieldName)) {
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
            const metadata = (_b = (_a = this.serialized).getFieldMetadata) === null || _b === void 0 ? void 0 : _b.call(_a, field.name);
            if (typeof value === "string") {
                writer.writeUInt8(FIELD_TYPE_STRING);
                writer.writeString(value);
            }
            else if (typeof value === "number") {
                writer.writeUInt8(FIELD_TYPE_NUMBER);
                // Use metadata to determine number serialization type, fallback to float64
                const numberType = (metadata === null || metadata === void 0 ? void 0 : metadata.numberType) || "float64";
                // Write number subtype: 0=uint8, 1=uint16, 2=uint32, 3=float64
                const numberSubtype = numberType === "uint8"
                    ? 0
                    : numberType === "uint16"
                        ? 1
                        : numberType === "uint32"
                            ? 2
                            : 3;
                writer.writeUInt8(numberSubtype);
                if (numberType === "uint8") {
                    writer.writeUInt8(value);
                }
                else if (numberType === "uint16") {
                    writer.writeUInt16(value);
                }
                else if (numberType === "uint32") {
                    // Handle optional fields: undefined/-1 becomes 0xFFFFFFFF
                    const numValue = (metadata === null || metadata === void 0 ? void 0 : metadata.optional) && (value === undefined || value === -1) ? 0xffffffff : value;
                    writer.writeUInt32(numValue);
                }
                else {
                    // float64 - handle optional fields: undefined becomes NaN
                    const numValue = (metadata === null || metadata === void 0 ? void 0 : metadata.optional) && value === undefined ? NaN : value;
                    writer.writeFloat64(numValue);
                }
            }
            else if (typeof value === "boolean") {
                writer.writeUInt8(FIELD_TYPE_BOOLEAN);
                writer.writeBoolean(value);
            }
            else if (value === null) {
                // Handle null values using dedicated null type
                writer.writeUInt8(FIELD_TYPE_NULL);
                // No value written for null
            }
            else if (value && typeof value === "object") {
                writer.writeUInt8(FIELD_TYPE_OBJECT);
                writer.writeString(JSON.stringify(value));
            }
            else {
                writer.writeUInt8(FIELD_TYPE_STRING); // Type: string (fallback)
                writer.writeString(String(value !== null && value !== void 0 ? value : ""));
            }
        }
        // Write extensions
        // When onlyDirty is true, only send extensions that are dirty
        // When onlyDirty is false (full state), send all extensions with all their data
        global.logDepth = 1;
        let extensionsToWrite = shouldSerializeAllExtensions
            ? Array.from(this.extensions.values())
            : this.getDirtyExtensions();
        // Deduplicate extensions by type (safety check - should never be needed)
        // Keep only the first instance of each extension type
        const seenTypes = new Set();
        const deduplicatedExtensions = [];
        for (const ext of extensionsToWrite) {
            const extType = ext.constructor.type;
            if (!seenTypes.has(extType)) {
                seenTypes.add(extType);
                deduplicatedExtensions.push(ext);
            }
        }
        extensionsToWrite = deduplicatedExtensions;
        if (extensionsToWrite.length > 255) {
            throw new Error(`Extension count ${extensionsToWrite.length} exceeds UInt8 maximum (255)`);
        }
        writer.writeUInt8(extensionsToWrite.length);
        // When onlyDirty=false, serialize all extension data. When onlyDirty=true, serialize only dirty extension data
        const extensionOnlyDirty = onlyDirty;
        for (let i = 0; i < extensionsToWrite.length; i++) {
            const ext = extensionsToWrite[i];
            ext.serializeToBuffer(writer, extensionOnlyDirty);
        }
        // Write removed extensions array (if any)
        if (this.removedExtensions.length > 255) {
            throw new Error(`Removed extensions count ${this.removedExtensions.length} exceeds UInt8 maximum (255)`);
        }
        writer.writeUInt8(this.removedExtensions.length);
        for (let i = 0; i < this.removedExtensions.length; i++) {
            const removedType = this.removedExtensions[i];
            writer.writeUInt8(encodeExtensionType(removedType));
        }
        // Clear the removed extensions after serializing
        this.removedExtensions = [];
    }
}
