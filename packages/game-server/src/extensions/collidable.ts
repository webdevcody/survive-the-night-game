import { IEntity } from "@/entities/types";
import Positionable from "@/extensions/positionable";
import { Extension } from "@/extensions/types";
import { Rectangle } from "@/util/shape";
import Vector2 from "@/util/vector2";
import { BufferWriter } from "@shared/util/buffer-serialization";
import { encodeExtensionType } from "@shared/util/extension-type-encoding";
import PoolManager from "@shared/util/pool-manager";
import { ExtensionBase } from "./extension-base";

export default class Collidable extends ExtensionBase {
  public static readonly type = "collidable";

  private size: Vector2;
  private offset: Vector2;

  public constructor(self: IEntity) {
    super(self, { size: { x: 16, y: 16 }, offset: { x: 0, y: 0 }, enabled: true });
    this.size = PoolManager.getInstance().vector2.claim(16, 16);
    this.offset = PoolManager.getInstance().vector2.claim(0, 0);
  }

  public setEnabled(enabled: boolean) {
    const serialized = this.serialized as any;
    serialized.enabled = enabled;
    return this;
  }

  public isEnabled() {
    const serialized = this.serialized as any;
    return serialized.enabled;
  }

  public setSize(size: Vector2) {
    this.setVector2Field("size", this.size, size);
    return this;
  }

  public getSize(): Vector2 {
    return this.size.clone();
  }

  public setOffset(offset: Vector2) {
    this.setVector2Field("offset", this.offset, offset);
    return this;
  }

  public getHitBox(): Rectangle {
    const poolManager = PoolManager.getInstance();
    const positionable = this.self.getExt(Positionable);
    const position = positionable.getPosition();
    const adjustedPos = poolManager.vector2.claim(
      position.x + this.offset.x,
      position.y + this.offset.y
    );
    const rect = poolManager.rectangle.claim(adjustedPos, this.size);
    poolManager.vector2.release(adjustedPos);
    return rect;
  }

  public serializeToBuffer(writer: BufferWriter, onlyDirty: boolean = false): void {
    const serialized = this.serialized as any;
    writer.writeUInt8(encodeExtensionType(Collidable.type));

    if (onlyDirty) {
      const dirtyFields = this.serialized.getDirtyFields();
      const fieldsToWrite: Array<{ index: number; value: any }> = [];

      // Field indices: offset = 0, size = 1, enabled = 2
      if (dirtyFields.has("offset")) {
        fieldsToWrite.push({ index: 0, value: this.offset });
      }
      if (dirtyFields.has("size")) {
        fieldsToWrite.push({ index: 1, value: this.size });
      }
      if (dirtyFields.has("enabled")) {
        fieldsToWrite.push({ index: 2, value: serialized.enabled });
      }

      writer.writeUInt8(fieldsToWrite.length);
      for (const field of fieldsToWrite) {
        writer.writeUInt8(field.index);
        if (field.index === 0) {
          writer.writeVector2(field.value);
        } else if (field.index === 1) {
          writer.writeVector2(field.value);
        } else if (field.index === 2) {
          writer.writeBoolean(field.value);
        }
      }
    } else {
      // Write all fields: field count = 3, then fields in order
      writer.writeUInt8(3); // field count
      writer.writeUInt8(0); // offset index
      writer.writeVector2(this.offset);
      writer.writeUInt8(1); // size index
      writer.writeVector2(this.size);
      writer.writeUInt8(2); // enabled index
      writer.writeBoolean(serialized.enabled);
    }
  }
}
