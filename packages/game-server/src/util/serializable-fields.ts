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
 * Uses a Proxy to intercept property access and automatically mark fields as dirty on assignment.
 *
 * Usage:
 *   const serialized = new SerializableFields(
 *     { ping: 0, stamina: 100 },
 *     () => entity.markDirty(),
 *     { ping: { numberType: 'uint16' } }
 *   );
 *   serialized.ping = 5; // Automatically marks 'ping' as dirty and calls callback
 *   const value = serialized.ping; // Gets value
 *   serialized.resetDirty(); // Clears dirty tracking
 *   const dirtyFields = serialized.getDirtyFields(); // Returns Set of dirty field names
 */
export class SerializableFields {
  private fields: Map<string, any> = new Map();
  private dirtyFields: Set<string> = new Set();
  private onFieldDirty?: () => void;
  private fieldMetadata: Map<string, FieldSerializationMetadata> = new Map();

  // Index signature to allow dynamic property access via Proxy
  [key: string]: any;

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

    // Return proxy that intercepts property access
    return new Proxy(this, {
      get: (target, prop: string | symbol) => {
        // Handle method calls on the class
        if (prop === "get") {
          return (key: string) => target.fields.get(key);
        }
        if (prop === "set") {
          return (key: string, value: any) => {
            target.fields.set(key, value);
            target.dirtyFields.add(key);
          };
        }
        if (prop === "has") {
          return (key: string) => target.fields.has(key);
        }
        if (prop === "resetDirty") {
          return () => target.resetDirty();
        }
        if (prop === "getDirtyFields") {
          return () => target.getDirtyFields();
        }
        if (prop === "getAllKeys") {
          return () => target.getAllKeys();
        }
        if (prop === "fields" || prop === "dirtyFields") {
          // Prevent access to internal properties
          return undefined;
        }

        // Handle property access (for Proxy-based access like serialized.ping)
        if (typeof prop === "string") {
          return target.fields.get(prop);
        }
        return undefined;
      },

      set: (target, prop: string | symbol, value: any) => {
        if (typeof prop === "string") {
          // Store the value
          target.fields.set(prop, value);
          // Automatically mark as dirty
          const wasAlreadyDirty = target.dirtyFields.has(prop);
          target.dirtyFields.add(prop);
          // Notify entity if field wasn't already dirty
          if (!wasAlreadyDirty && target.onFieldDirty) {
            target.onFieldDirty();
          }
          return true;
        }
        return false;
      },

      has: (target, prop: string | symbol) => {
        if (typeof prop === "string") {
          return target.fields.has(prop);
        }
        return false;
      },

      ownKeys: (target) => {
        return Array.from(target.fields.keys());
      },

      getOwnPropertyDescriptor: (target, prop: string | symbol) => {
        if (typeof prop === "string" && target.fields.has(prop)) {
          return {
            enumerable: true,
            configurable: true,
            value: target.fields.get(prop),
          };
        }
        return undefined;
      },
    }) as SerializableFields;
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
