import { Extension } from "@/extensions/types";
import { IEntity } from "@/entities/types";
import { ExtensionTypes } from "@/util/extension-types";
import Vector2 from "@shared/util/vector2";
import { BufferWriter } from "@shared/util/buffer-serialization";
import { encodeExtensionType } from "@shared/util/extension-type-encoding";
import PoolManager from "@shared/util/pool-manager";

export default class Positionable implements Extension {
  public static readonly type = ExtensionTypes.POSITIONABLE;

  private self: IEntity;
  private position: Vector2 = PoolManager.getInstance().vector2.claim(0, 0);
  private size: Vector2 = PoolManager.getInstance().vector2.claim(0, 0);
  private onPositionChange?: (entity: IEntity) => void;
  private dirty: boolean = false;

  public constructor(self: IEntity) {
    this.self = self;
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
    this.size.reset(size.x, size.y);
    if (sizeChanged) {
      this.markDirty();
    }
    return this;
  }

  public getCenterPosition(): Vector2 {
    // Return a new Vector2 to prevent mutation of pooled vectors
    // x_center = position.x + size.x/2, y_center = position.y + size.y/2
    return new Vector2(
      this.position.x + this.size.x / 2,
      this.position.y + this.size.y / 2
    );
  }

  public getPosition(): Vector2 {
    return this.position.clone();
  }

  public setPosition(position: Vector2): this {
    // Only trigger callback if position actually changed
    const positionChanged = this.position.x !== position.x || this.position.y !== position.y;
    this.position.reset(position.x, position.y);

    if (positionChanged) {
      if (this.onPositionChange) {
        this.onPositionChange(this.self);
      }
      this.markDirty();
    }

    return this;
  }

  public isDirty(): boolean {
    return this.dirty;
  }

  public markDirty(): void {
    this.dirty = true;
    // Notify entity that this extension is dirty
    if (this.self.markExtensionDirty) {
      this.self.markExtensionDirty(this);
    }
  }

  public clearDirty(): void {
    this.dirty = false;
  }

  public serializeToBuffer(writer: BufferWriter): void {
    writer.writeUInt32(encodeExtensionType(Positionable.type));
    writer.writePosition2(this.position);
    writer.writeSize2(this.size);
  }
}
