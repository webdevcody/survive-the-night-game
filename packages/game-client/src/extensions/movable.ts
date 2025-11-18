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
    return this.velocity.clone();
  }

  public setVelocity(velocity: Vector2): void {
    this.velocity.reset(velocity.x, velocity.y);
  }

  public deserialize(data: ClientExtensionSerialized): this {
    if (data.velocity) {
      const vx = data.velocity.x || 0;
      const vy = data.velocity.y || 0;
      this.velocity.reset(vx, vy);
    }
    return this;
  }

  public deserializeFromBuffer(reader: BufferReader): this {
    const vel = reader.readVelocity2();
    this.velocity.reset(vel.x, vel.y);
    PoolManager.getInstance().vector2.release(vel);
    return this;
  }
}
