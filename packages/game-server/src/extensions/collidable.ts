import { IEntity } from "@/entities/types";
import Positionable from "@/extensions/positionable";
import { Extension } from "@/extensions/types";
import { Rectangle } from "@/util/shape";
import Vector2 from "@/util/vector2";
import { BufferWriter, MonitoredBufferWriter } from "@shared/util/buffer-serialization";
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

  public serializeToBuffer(writer: BufferWriter | MonitoredBufferWriter, onlyDirty: boolean = false): void {
    const serialized = this.serialized as any;
    if (writer instanceof MonitoredBufferWriter || (writer as any).constructor?.name === 'MonitoredBufferWriter') {
      (writer as MonitoredBufferWriter).writeUInt8(encodeExtensionType(Collidable.type), "ExtensionType");
      (writer as MonitoredBufferWriter).writeVector2(this.offset, "Offset");
      (writer as MonitoredBufferWriter).writeVector2(this.size, "Size");
      (writer as MonitoredBufferWriter).writeBoolean(serialized.enabled, "Enabled");
    } else {
      writer.writeUInt8(encodeExtensionType(Collidable.type));
      writer.writeVector2(this.offset);
      writer.writeVector2(this.size);
      writer.writeBoolean(serialized.enabled);
    }
  }
}
