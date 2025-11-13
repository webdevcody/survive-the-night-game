import { ExtensionTypes } from "../../../game-shared/src/util/extension-types";
import Vector2 from "@shared/util/vector2";
import { ClientExtensionSerialized } from "@/extensions/types";
import { BaseClientExtension } from "./base-extension";

export class ClientMovable extends BaseClientExtension {
  public static readonly type = ExtensionTypes.MOVABLE;

  private velocity: Vector2 = new Vector2(0, 0);

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
        this.velocity = new Vector2(data.velocity.x || 0, data.velocity.y || 0);
      }
    }
    return this;
  }
}
