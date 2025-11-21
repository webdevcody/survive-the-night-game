import { IEntity } from "@/entities/types";
import Positionable from "@/extensions/positionable";
import { Extension } from "@/extensions/types";
import { Rectangle } from "@/util/shape";
import Vector2 from "@/util/vector2";
import { BufferWriter } from "@shared/util/buffer-serialization";
import { encodeExtensionType } from "@shared/util/extension-type-encoding";
import PoolManager from "@shared/util/pool-manager";
import { ExtensionBase } from "./extension-base";

type CollidableFields = {
  size: { x: number; y: number };
  offset: { x: number; y: number };
  enabled: boolean;
};

export default class Collidable extends ExtensionBase<CollidableFields> {
  public static readonly type = "collidable";

  private size: Vector2;
  private offset: Vector2;
  private readonly hitBox: Rectangle;

  public constructor(self: IEntity) {
    super(self, { size: { x: 16, y: 16 }, offset: { x: 0, y: 0 }, enabled: true });
    this.size = PoolManager.getInstance().vector2.claim(16, 16);
    this.offset = PoolManager.getInstance().vector2.claim(0, 0);
    this.hitBox = PoolManager.getInstance().rectangle.claim(0, 0, 0, 0);
  }

  public setEnabled(enabled: boolean) {
    this.serialized.set("enabled", enabled);
    return this;
  }

  public isEnabled() {
    return this.serialized.get("enabled");
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
    const positionable = this.self.getExt(Positionable);
    const position = positionable.getPosition();
    this.hitBox.position.reset(position.x + this.offset.x, position.y + this.offset.y);
    this.hitBox.size.reset(this.size.x, this.size.y);
    return this.hitBox;
  }

  public serializeToBuffer(writer: BufferWriter, onlyDirty: boolean = false): void {
    writer.writeUInt8(encodeExtensionType(Collidable.type));
    writer.writeVector2(this.offset);
    writer.writeVector2(this.size);
    writer.writeBoolean(this.serialized.get("enabled"));
  }
}
