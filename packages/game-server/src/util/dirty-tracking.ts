/**
 * Utility function to extract only the dirty fields from an object based on a Set of dirty field keys.
 *
 * @param fieldsMap - Object containing all the fields and their current values
 * @param dirtyFields - Set of field names that have been modified
 * @returns Object containing only the fields that are dirty
 *
 * @example
 * ```typescript
 * class MyEntity {
 *   private field1 = "value1";
 *   private field2 = "value2";
 *   private dirtyFields: Set<string> = new Set();
 *
 *   updateField1(value: string) {
 *     this.field1 = value;
 *     this.dirtyFields.add("field1");
 *   }
 *
 *   serialize(onlyDirty: boolean) {
 *     if (onlyDirty) {
 *       const fieldsMap = {
 *         field1: this.field1,
 *         field2: this.field2,
 *       };
 *       return getDirtyFields(fieldsMap, this.dirtyFields);
 *     }
 *     return { field1: this.field1, field2: this.field2 };
 *   }
 * }
 * ```
 */
export function getDirtyFields<T extends Record<string, any>>(
  fieldsMap: T,
  dirtyFields: Set<string>
): Partial<T> {
  const result: Partial<T> = {};

  for (const fieldKey of dirtyFields) {
    if (fieldKey in fieldsMap) {
      result[fieldKey as keyof T] = fieldsMap[fieldKey];
    }
  }

  return result;
}

/**
 * Serializes an entity with specified fields, automatically handling dirty-only mode.
 * This utility helps DRY up entity serialization by defining fields once.
 *
 * @param serializableFields - Object containing the fields to serialize with their values
 * @param baseResult - The base serialization result (typically from super.serialize())
 * @param dirtyFields - Set of field names that have been modified
 * @param onlyDirty - Whether to only include dirty fields
 * @returns The serialized result with specified fields added
 *
 * @example
 * ```typescript
 * class Survivor extends Entity {
 *   private isRescued: boolean = false;
 *   private dirtyFields: Set<string> = new Set();
 *
 *   serialize(onlyDirty: boolean = false): RawEntity {
 *     const serializableFields = {
 *       isRescued: this.isRescued,
 *       health: this.getExt(Destructible).getHealth(),
 *     };
 *     return serializeEntityFields(
 *       serializableFields,
 *       super.serialize(onlyDirty),
 *       this.dirtyFields,
 *       onlyDirty
 *     );
 *   }
 * }
 * ```
 */
export function serializeEntityFields<T extends Record<string, any>, R extends Record<string, any>>(
  serializableFields: T,
  baseResult: R,
  dirtyFields: Set<string>,
  onlyDirty: boolean
): R {
  const result = { ...baseResult };

  if (!onlyDirty) {
    // Include all fields from serializableFields
    Object.assign(result, serializableFields);
  } else {
    // Only include dirty fields
    for (const fieldName of Object.keys(serializableFields)) {
      if (dirtyFields.has(fieldName)) {
        result[fieldName as keyof R] = serializableFields[fieldName] as any;
      }
    }
  }

  return result;
}
