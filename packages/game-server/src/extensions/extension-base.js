import { SerializableFields } from "@/util/serializable-fields";
/**
 * Base class for extensions that provides automatic dirty tracking via SerializableFields.
 * Extensions can extend this class and use `this.serialized.set('field', value)` to automatically mark dirty.
 *
 * Usage:
 *   class MyExtension extends ExtensionBase<{ myField: number }> {
 *     constructor(self: IEntity) {
 *       super(self, { myField: 0 });
 *     }
 *
 *     setMyField(value: number) {
 *       this.serialized.set('myField', value); // Automatically marks dirty, type-safe!
 *     }
 *
 *     serializeToBuffer(writer: BufferWriter) {
 *       writer.writeFloat64(this.serialized.get('myField')); // Type-safe with autocomplete!
 *     }
 *   }
 *
 * For Vector2 fields, use setVector2Field() helper to sync between Vector2 and serialized:
 *   private position: Vector2;
 *   constructor(self: IEntity) {
 *     super(self, { position: {x: 0, y: 0} });
 *     this.position = PoolManager.getInstance().vector2.claim(0, 0);
 *   }
 *
 *   setPosition(pos: Vector2) {
 *     this.setVector2Field('position', this.position, pos);
 *   }
 */
export class ExtensionBase {
    constructor(self, initialFields) {
        this.self = self;
        this.serialized = new SerializableFields(initialFields, () => this.markDirty());
    }
    /**
     * Helper method to sync a Vector2 field between the actual Vector2 object and serialized storage.
     * Updates both the Vector2 object and the serialized field, automatically marking dirty.
     */
    setVector2Field(fieldName, vector, newValue) {
        const changed = vector.x !== newValue.x || vector.y !== newValue.y;
        if (changed) {
            vector.reset(newValue.x, newValue.y);
            this.serialized.set(fieldName, { x: newValue.x, y: newValue.y });
        }
    }
    /**
     * Helper method to get a Vector2 field from serialized storage.
     */
    getVector2FromSerialized(fieldName) {
        return this.serialized.get(fieldName);
    }
    isDirty() {
        return this.serialized.getDirtyFields().size > 0;
    }
    markDirty() {
        // Mark extension as dirty and notify entity
        if (this.self.markExtensionDirty) {
            this.self.markExtensionDirty(this);
        }
    }
    clearDirty() {
        this.serialized.resetDirty();
    }
    /**
     * Get the field indices for this extension.
     * Subclasses should override this to define which fields map to which indices.
     * Field indices are used for efficient field-level delta compression.
     *
     * @returns Map of field name to field index (0-based)
     */
    getFieldIndices() {
        // Default implementation: use order from getAllKeys()
        const indices = new Map();
        const keys = this.serialized.getAllKeys();
        keys.forEach((key, index) => {
            indices.set(key, index);
        });
        return indices;
    }
    /**
     * Get the field name for a given index.
     * Subclasses should override this if they want custom field ordering.
     */
    getFieldNameForIndex(index) {
        const keys = this.serialized.getAllKeys();
        return keys[index] || null;
    }
}
