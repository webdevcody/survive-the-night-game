import { IEntity } from "@/entities/types";
import Positionable from "@/extensions/positionable";
import { Extension } from "@/extensions/types";
import { Rectangle } from "@/util/shape";
import Vector2 from "@/util/vector2";
import { BufferWriter } from "@shared/util/buffer-serialization";
import { encodeExtensionType } from "@shared/util/extension-type-encoding";
import PoolManager from "@shared/util/pool-manager";

export default class Collidable implements Extension {
  public static readonly type = "collidable";

  private self: IEntity;
  private size: Vector2 = PoolManager.getInstance().vector2.claim(16, 16);
  private offset: Vector2 = PoolManager.getInstance().vector2.claim(0, 0);
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
    this.size.reset(size.x, size.y);
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
    this.offset.reset(offset.x, offset.y);
    if (offsetChanged) {
      this.markDirty();
    }
    return this;
  }

  public getHitBox(): Rectangle {
    const poolManager = PoolManager.getInstance();
    const positionable = this.self.getExt(Positionable);
    const position = positionable.getPosition();
    const adjustedPos = poolManager.vector2.claim(position.x + this.offset.x, position.y + this.offset.y);
    const rect = poolManager.rectangle.claim(adjustedPos, this.size);
    poolManager.vector2.release(adjustedPos);
    return rect;
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
