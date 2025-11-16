import { Rectangle } from "@shared/util/shape";
import { ExtensionTypes } from "../../../game-shared/src/util/extension-types";
import { Hitbox } from "../../../game-shared/src/util/hitbox";
import { ClientExtensionSerialized } from "@/extensions/types";
import { ClientPositionable } from "./positionable";
import Vector2 from "@shared/util/vector2";
import { BaseClientExtension } from "./base-extension";
import { BufferReader } from "@shared/util/buffer-serialization";

export class ClientCollidable extends BaseClientExtension {
  public static readonly type = ExtensionTypes.COLLIDABLE;

  private size = new Vector2(16, 16);
  private offset = new Vector2(0, 0);
  private enabled = true;

  public setEnabled(enabled: boolean): this {
    this.enabled = enabled;
    return this;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public getSize(): Vector2 {
    return this.size;
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
    this.offset = data.offset;
    this.size = data.size;
    if (data.enabled !== undefined) {
      this.enabled = data.enabled;
    }
    return this;
  }

  public deserializeFromBuffer(reader: BufferReader): this {
    // Type is already read by the entity deserializer
    this.offset = reader.readVector2();
    this.size = reader.readVector2();
    this.enabled = reader.readBoolean();
    return this;
  }
}
