import { Extension } from "@/extensions/types";
import { IEntity } from "@/entities/types";
import { SerializableFields } from "@/util/serializable-fields";
import Vector2 from "@/util/vector2";

/**
 * Base class for extensions that provides automatic dirty tracking via SerializableFields.
 * Extensions can extend this class and use `this.serialized.field = value` to automatically mark dirty.
 *
 * Usage:
 *   class MyExtension extends ExtensionBase {
 *     constructor(self: IEntity) {
 *       super(self, { myField: 0 });
 *     }
 *
 *     setMyField(value: number) {
 *       this.serialized.myField = value; // Automatically marks dirty
 *     }
 *
 *     serializeToBuffer(writer: BufferWriter) {
 *       writer.writeFloat64(this.serialized.myField);
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
export abstract class ExtensionBase implements Extension {
  protected self: IEntity;
  protected serialized: SerializableFields;

  constructor(self: IEntity, initialFields: Record<string, any> = {}) {
    this.self = self;
    this.serialized = new SerializableFields(initialFields, () => this.markDirty());
  }

  /**
   * Helper method to sync a Vector2 field between the actual Vector2 object and serialized storage.
   * Updates both the Vector2 object and the serialized field, automatically marking dirty.
   */
  protected setVector2Field(fieldName: string, vector: Vector2, newValue: Vector2): void {
    const serialized = this.serialized as any;
    const changed = vector.x !== newValue.x || vector.y !== newValue.y;
    if (changed) {
      vector.reset(newValue.x, newValue.y);
      serialized[fieldName] = { x: newValue.x, y: newValue.y };
    }
  }

  /**
   * Helper method to get a Vector2 field from serialized storage.
   */
  protected getVector2FromSerialized(fieldName: string): { x: number; y: number } {
    const serialized = this.serialized as any;
    return serialized[fieldName];
  }

  public isDirty(): boolean {
    return this.serialized.getDirtyFields().size > 0;
  }

  public markDirty(): void {
    // Mark extension as dirty and notify entity
    if (this.self.markExtensionDirty) {
      this.self.markExtensionDirty(this);
    }
  }

  public clearDirty(): void {
    this.serialized.resetDirty();
  }

  abstract serializeToBuffer(writer: any): void;
}
