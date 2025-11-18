import { Extension } from "@/extensions/types";
import { IEntity } from "@/entities/types";
import { ExtensionTypes } from "@/util/extension-types";
import Vector2 from "@shared/util/vector2";
import { BufferWriter, MonitoredBufferWriter } from "@shared/util/buffer-serialization";
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

  public serializeToBuffer(writer: BufferWriter | MonitoredBufferWriter, onlyDirty: boolean = false): void {
    if (writer instanceof MonitoredBufferWriter || (writer as any).constructor?.name === 'MonitoredBufferWriter') {
      (writer as MonitoredBufferWriter).writeUInt8(encodeExtensionType(Positionable.type), "ExtensionType");
      (writer as MonitoredBufferWriter).writePosition2(this.position, "Position");
      (writer as MonitoredBufferWriter).writeSize2(this.size, "Size");
    } else {
      writer.writeUInt8(encodeExtensionType(Positionable.type));
      writer.writePosition2(this.position);
      writer.writeSize2(this.size);
    }
  }
}
