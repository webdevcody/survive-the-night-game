import { Extension } from "@/extensions/types";
import { IEntity } from "@/entities/types";
import { ExtensionTypes } from "@/util/extension-types";
import Vector2 from "@shared/util/vector2";
import { BufferWriter } from "@shared/util/buffer-serialization";
import { encodeExtensionType } from "@shared/util/extension-type-encoding";
import PoolManager from "@shared/util/pool-manager";
import { ExtensionBase } from "./extension-base";

export default class Positionable extends ExtensionBase {
  public static readonly type = ExtensionTypes.POSITIONABLE;

  private position: Vector2;
  private size: Vector2;
  private onPositionChange?: (entity: IEntity) => void;

  public constructor(self: IEntity) {
    super(self, { position: { x: 0, y: 0 }, size: { x: 0, y: 0 } });
    this.position = PoolManager.getInstance().vector2.claim(0, 0);
    this.size = PoolManager.getInstance().vector2.claim(0, 0);
  }

  public setOnPositionChange(callback: (entity: IEntity) => void): this {
    this.onPositionChange = callback;
    return this;
  }

  public getSize(): Vector2 {
    return this.size.clone();
  }

  public setSize(size: Vector2): this {
    const sizeChanged = this.size.x !== size.x || this.size.y !== size.y;
    this.setVector2Field("size", this.size, size);
    return this;
  }

  public getCenterPosition(): Vector2 {
    // Return a new Vector2 to prevent mutation of pooled vectors
    // x_center = position.x + size.x/2, y_center = position.y + size.y/2
    return new Vector2(this.position.x + this.size.x / 2, this.position.y + this.size.y / 2);
  }

  public getPosition(): Vector2 {
    return this.position.clone();
  }

  public setPosition(position: Vector2): this {
    // Only trigger callback if position actually changed
    const positionChanged = this.position.x !== position.x || this.position.y !== position.y;
    this.setVector2Field("position", this.position, position);

    if (positionChanged && this.onPositionChange) {
      this.onPositionChange(this.self);
    }

    return this;
  }

  public serializeToBuffer(writer: BufferWriter, onlyDirty: boolean = false): void {
    const serialized = this.serialized as any;
    writer.writeUInt8(encodeExtensionType(Positionable.type));

    if (onlyDirty) {
      const dirtyFields = this.serialized.getDirtyFields();
      const fieldsToWrite: Array<{ index: number; value: any }> = [];

      // Field indices: position = 0, size = 1
      if (dirtyFields.has("position")) {
        fieldsToWrite.push({ index: 0, value: this.position });
      }
      if (dirtyFields.has("size")) {
        fieldsToWrite.push({ index: 1, value: this.size });
      }

      writer.writeUInt8(fieldsToWrite.length);
      for (const field of fieldsToWrite) {
        writer.writeUInt8(field.index);
        if (field.index === 0) {
          writer.writePosition2(field.value);
        } else if (field.index === 1) {
          writer.writeSize2(field.value);
        }
      }
    } else {
      // Write all fields: field count = 2, then fields in order
      writer.writeUInt8(2); // field count
      writer.writeUInt8(0); // position index
      writer.writePosition2(this.position);
      writer.writeUInt8(1); // size index
      writer.writeSize2(this.size);
    }
  }
}
