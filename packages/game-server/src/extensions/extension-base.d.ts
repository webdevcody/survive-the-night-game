import { Extension } from "@/extensions/types";
import { IEntity } from "@/entities/types";
import { SerializableFields } from "@/util/serializable-fields";
import Vector2 from "@/util/vector2";
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
export declare abstract class ExtensionBase<TFields extends Record<string, any> = Record<string, any>> implements Extension {
    protected self: IEntity;
    protected serialized: SerializableFields<TFields>;
    constructor(self: IEntity, initialFields: TFields);
    /**
     * Helper method to sync a Vector2 field between the actual Vector2 object and serialized storage.
     * Updates both the Vector2 object and the serialized field, automatically marking dirty.
     */
    protected setVector2Field<K extends keyof TFields>(fieldName: K, vector: Vector2, newValue: Vector2): void;
    /**
     * Helper method to get a Vector2 field from serialized storage.
     */
    protected getVector2FromSerialized<K extends keyof TFields>(fieldName: K): {
        x: number;
        y: number;
    };
    isDirty(): boolean;
    markDirty(): void;
    clearDirty(): void;
    /**
     * Get the field indices for this extension.
     * Subclasses should override this to define which fields map to which indices.
     * Field indices are used for efficient field-level delta compression.
     *
     * @returns Map of field name to field index (0-based)
     */
    protected getFieldIndices(): Map<string, number>;
    /**
     * Get the field name for a given index.
     * Subclasses should override this if they want custom field ordering.
     */
    protected getFieldNameForIndex(index: number): string | null;
    abstract serializeToBuffer(writer: any, onlyDirty?: boolean): void;
}
