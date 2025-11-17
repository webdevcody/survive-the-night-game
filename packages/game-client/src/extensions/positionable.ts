import Vector2 from "@shared/util/vector2";
import PoolManager from "@shared/util/pool-manager";
import { ExtensionTypes } from "../../../game-shared/src/util/extension-types";
import { ClientExtensionSerialized } from "@/extensions/types";
import { BaseClientExtension } from "./base-extension";
import { BufferReader } from "@shared/util/buffer-serialization";

export class ClientPositionable extends BaseClientExtension {
  public static readonly type = ExtensionTypes.POSITIONABLE;

  private position: Vector2 = PoolManager.getInstance().vector2.claim(0, 0);
  private size: Vector2 = PoolManager.getInstance().vector2.claim(0, 0);

  public getSize(): Vector2 {
    return this.size.clone();
  }

  public setSize(size: Vector2): this {
    this.size.reset(size.x, size.y);
    return this;
  }

  public getCenterPosition(): Vector2 {
    return this.size.clone().div(2).add(this.position);
  }

  public getPosition(): Vector2 {
    return this.position.clone();
  }

  public setPosition(position: Vector2): void {
    this.position.reset(position.x, position.y);
  }

  public deserialize(data: ClientExtensionSerialized): this {
    this.position.reset(data.position.x, data.position.y);
    this.size.reset(data.size.x, data.size.y);
    return this;
  }

  public deserializeFromBuffer(reader: BufferReader): this {
    // Type is already read by the entity deserializer
    // Read field count (always present now)
    const fieldCount = reader.readUInt8();
    
    // Read fields by index
    for (let i = 0; i < fieldCount; i++) {
      const fieldIndex = reader.readUInt8();
      // Field indices: position = 0, size = 1
      if (fieldIndex === 0) {
        const pos = reader.readPosition2();
        this.position.reset(pos.x, pos.y);
        PoolManager.getInstance().vector2.release(pos);
      } else if (fieldIndex === 1) {
        const size = reader.readSize2();
        this.size.reset(size.x, size.y);
        PoolManager.getInstance().vector2.release(size);
      }
    }
    return this;
  }
}
