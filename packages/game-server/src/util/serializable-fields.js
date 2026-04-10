/**
 * SerializableFields manages serializable entity fields with automatic dirty tracking.
 * Uses explicit get() and set() methods for field access, automatically marking fields as dirty on assignment.
 *
 * Usage:
 *   const serialized = new SerializableFields(
 *     { ping: 0, stamina: 100 },
 *     () => entity.markDirty(),
 *     { ping: { numberType: 'uint16' } }
 *   );
 *   serialized.set('ping', 5); // Automatically marks 'ping' as dirty and calls callback
 *   const value = serialized.get('ping'); // Gets value
 *   serialized.resetDirty(); // Clears dirty tracking
 *   const dirtyFields = serialized.getDirtyFields(); // Returns Set of dirty field names
 */
export class SerializableFields {
    constructor(initialFields, onFieldDirty, fieldMetadata) {
        this.fields = new Map();
        this.dirtyFields = new Set();
        this.fieldMetadata = new Map();
        this.onFieldDirty = onFieldDirty;
        // Initialize fields from initial values
        for (const [key, value] of Object.entries(initialFields)) {
            this.fields.set(key, value);
        }
        // Store field metadata
        if (fieldMetadata) {
            for (const [key, metadata] of Object.entries(fieldMetadata)) {
                this.fieldMetadata.set(key, metadata);
            }
        }
    }
    /**
     * Explicit getter for a field value
     */
    get(key) {
        return this.fields.get(key);
    }
    /**
     * Explicit setter for a field value (marks dirty automatically)
     */
    set(key, value) {
        const wasAlreadyDirty = this.dirtyFields.has(key);
        this.fields.set(key, value);
        this.dirtyFields.add(key);
        // Notify entity if field wasn't already dirty
        if (!wasAlreadyDirty && this.onFieldDirty) {
            this.onFieldDirty();
        }
    }
    /**
     * Check if a field exists
     */
    has(key) {
        return this.fields.has(key);
    }
    /**
     * Clear dirty tracking for all fields (keeps values)
     */
    resetDirty() {
        this.dirtyFields.clear();
    }
    /**
     * Get set of all dirty field names
     */
    getDirtyFields() {
        return new Set(this.dirtyFields);
    }
    /**
     * Get all field keys
     */
    getAllKeys() {
        return Array.from(this.fields.keys());
    }
    /**
     * Get serialization metadata for a field
     */
    getFieldMetadata(fieldName) {
        return this.fieldMetadata.get(fieldName);
    }
}
