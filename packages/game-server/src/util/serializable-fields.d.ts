/**
 * Field serialization metadata
 */
export interface FieldSerializationMetadata {
    /** For number fields: 'uint8' | 'uint16' | 'uint32' | 'float64' */
    numberType?: "uint8" | "uint16" | "uint32" | "float64";
    /** Whether the field is optional (can be undefined/null) */
    optional?: boolean;
}
/**
 * SerializableFields manages serializable entity fields with automatic dirty tracking.
 * Uses explicit get() and set() methods for field access, automatically marking fields as dirty on assignment.
 *
 * Usage:
 *   const serialized = new SerializableFields(
 *     { ping: 0, stamina: 20 },
 *     () => entity.markDirty(),
 *     { ping: { numberType: 'uint16' } }
 *   );
 *   serialized.set('ping', 5); // Automatically marks 'ping' as dirty and calls callback
 *   const value = serialized.get('ping'); // Gets value
 *   serialized.resetDirty(); // Clears dirty tracking
 *   const dirtyFields = serialized.getDirtyFields(); // Returns Set of dirty field names
 */
export declare class SerializableFields<TFields extends Record<string, any> = Record<string, any>> {
    private fields;
    private dirtyFields;
    private onFieldDirty?;
    private fieldMetadata;
    constructor(initialFields: TFields, onFieldDirty?: () => void, fieldMetadata?: Partial<Record<keyof TFields, FieldSerializationMetadata>>);
    /**
     * Explicit getter for a field value
     */
    get<K extends keyof TFields>(key: K): TFields[K];
    /**
     * Explicit setter for a field value (marks dirty automatically)
     */
    set<K extends keyof TFields>(key: K, value: TFields[K]): void;
    /**
     * Check if a field exists
     */
    has<K extends keyof TFields>(key: K): boolean;
    /**
     * Clear dirty tracking for all fields (keeps values)
     */
    resetDirty(): void;
    /**
     * Get set of all dirty field names
     */
    getDirtyFields(): Set<string>;
    /**
     * Get all field keys
     */
    getAllKeys(): string[];
    /**
     * Get serialization metadata for a field
     */
    getFieldMetadata<K extends keyof TFields>(fieldName: K): FieldSerializationMetadata | undefined;
}
