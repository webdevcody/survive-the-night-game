import { ExtensionTypes } from "../../../game-shared/src/util/extension-types";
import Vector2 from "@shared/util/vector2";
import PoolManager from "@shared/util/pool-manager";
import { ClientExtensionSerialized } from "@/extensions/types";
import { BaseClientExtension } from "./base-extension";
import { BufferReader } from "@shared/util/buffer-serialization";

export class ClientMovable extends BaseClientExtension {
  public static readonly type = ExtensionTypes.MOVABLE;

  private velocity: Vector2 = PoolManager.getInstance().vector2.claim(0, 0);

  public getVelocity(): Vector2 {
    return this.velocity;
  }

  public setVelocity(velocity: Vector2): void {
    this.velocity = velocity;
  }

  public deserialize(data: ClientExtensionSerialized): this {
    if (data.velocity) {
      // Ensure velocity is a Vector2 instance
      if (data.velocity instanceof Vector2) {
        this.velocity = data.velocity;
      } else {
        const poolManager = PoolManager.getInstance();
        this.velocity = poolManager.vector2.claim(data.velocity.x || 0, data.velocity.y || 0);
      }
    }
    return this;
  }

  public deserializeFromBuffer(reader: BufferReader): this {
    // Type is already read by the entity deserializer
    this.velocity = reader.readVelocity2();
    return this;
  }
}
