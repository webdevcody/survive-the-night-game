import { IEntity } from "@/entities/types";
import Positionable from "@/extensions/positionable";
import { Extension } from "@/extensions/types";
import { Rectangle } from "@/util/shape";
import Vector2 from "@/util/vector2";
import { BufferWriter } from "@shared/util/buffer-serialization";
import { encodeExtensionType } from "@shared/util/extension-type-encoding";

export default class Collidable implements Extension {
  public static readonly type = "collidable";

  private self: IEntity;
  private size: Vector2 = new Vector2(16, 16);
  private offset: Vector2 = new Vector2(0, 0);
  private enabled: boolean;
  private dirty: boolean = false;

  public constructor(self: IEntity) {
    this.self = self;
    this.enabled = true;
  }

  public setEnabled(enabled: boolean) {
    const enabledChanged = this.enabled !== enabled;
    this.enabled = enabled;
    if (enabledChanged) {
      this.markDirty();
    }
    return this;
  }

  public isEnabled() {
    return this.enabled;
  }

  public setSize(size: Vector2) {
    const sizeChanged = this.size.x !== size.x || this.size.y !== size.y;
    this.size = size;
    if (sizeChanged) {
      this.markDirty();
    }
    return this;
  }

  public getSize(): Vector2 {
    return this.size.clone();
  }

  public setOffset(offset: Vector2) {
    const offsetChanged = this.offset.x !== offset.x || this.offset.y !== offset.y;
    this.offset = offset;
    if (offsetChanged) {
      this.markDirty();
    }
    return this;
  }

  public getHitBox(): Rectangle {
    const positionable = this.self.getExt(Positionable);
    const position = positionable.getPosition();
    return new Rectangle(position.add(this.offset), this.size);
  }

  public isDirty(): boolean {
    return this.dirty;
  }

  public markDirty(): void {
    this.dirty = true;
    if (this.self.markExtensionDirty) {
      this.self.markExtensionDirty(this);
    }
  }

  public clearDirty(): void {
    this.dirty = false;
  }

  public serializeToBuffer(writer: BufferWriter): void {
    writer.writeUInt32(encodeExtensionType(Collidable.type));
    writer.writeVector2(this.offset);
    writer.writeVector2(this.size);
    writer.writeBoolean(this.enabled);
  }
}
