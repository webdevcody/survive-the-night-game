import { Rectangle } from "@shared/util/shape";
import { ExtensionTypes } from "../../../game-shared/src/util/extension-types";
import { Hitbox } from "../../../game-shared/src/util/hitbox";
import { ClientExtensionSerialized } from "@/extensions/types";
import { ClientPositionable } from "./positionable";
import Vector2 from "@shared/util/vector2";
import PoolManager from "@shared/util/pool-manager";
import { BaseClientExtension } from "./base-extension";
import { BufferReader } from "@shared/util/buffer-serialization";

export class ClientCollidable extends BaseClientExtension {
  public static readonly type = ExtensionTypes.COLLIDABLE;

  private size = PoolManager.getInstance().vector2.claim(16, 16);
  private offset = PoolManager.getInstance().vector2.claim(0, 0);
  private enabled = true;

  public setEnabled(enabled: boolean): this {
    this.enabled = enabled;
    return this;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public getSize(): Vector2 {
    return this.size.clone();
  }

  public getHitBox(): Hitbox {
    const positionable = this.clientEntity.getExt(ClientPositionable);
    const position = positionable.getPosition();
    return {
      x: position.x + this.offset.x,
      y: position.y + this.offset.y,
      width: this.size.x,
      height: this.size.y,
    };
  }

  public deserialize(data: ClientExtensionSerialized): this {
    this.offset.reset(data.offset.x, data.offset.y);
    this.size.reset(data.size.x, data.size.y);
    if (data.enabled !== undefined) {
      this.enabled = data.enabled;
    }
    return this;
  }

  public deserializeFromBuffer(reader: BufferReader): this {
    // Type is already read by the entity deserializer
    const offset = reader.readVector2();
    const size = reader.readVector2();
    this.offset.reset(offset.x, offset.y);
    this.size.reset(size.x, size.y);
    PoolManager.getInstance().vector2.release(offset);
    PoolManager.getInstance().vector2.release(size);
    this.enabled = reader.readBoolean();
    return this;
  }
}
