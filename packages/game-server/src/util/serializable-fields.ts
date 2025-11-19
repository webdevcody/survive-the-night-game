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
  private fields: Map<string, any> = new Map();
  private dirtyFields: Set<string> = new Set();
  private onFieldDirty?: () => void;
  private fieldMetadata: Map<string, FieldSerializationMetadata> = new Map();

  constructor(
    initialFields: Record<string, any> = {},
    onFieldDirty?: () => void,
    fieldMetadata?: Record<string, FieldSerializationMetadata>
  ) {
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
  get(key: string): any {
    return this.fields.get(key);
  }

  /**
   * Explicit setter for a field value (marks dirty automatically)
   */
  set(key: string, value: any): void {
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
  has(key: string): boolean {
    return this.fields.has(key);
  }

  /**
   * Clear dirty tracking for all fields (keeps values)
   */
  resetDirty(): void {
    this.dirtyFields.clear();
  }

  /**
   * Get set of all dirty field names
   */
  getDirtyFields(): Set<string> {
    return new Set(this.dirtyFields);
  }

  /**
   * Get all field keys
   */
  getAllKeys(): string[] {
    return Array.from(this.fields.keys());
  }

  /**
   * Get serialization metadata for a field
   */
  getFieldMetadata(fieldName: string): FieldSerializationMetadata | undefined {
    return this.fieldMetadata.get(fieldName);
  }
}
