import { ExtensionTypes } from "@server/shared/extension-types";
import { ClientExtension, ClientExtensionSerialized } from "./types";
import { Vector2 } from "@server/shared/physics";

export class ClientMovable implements ClientExtension {
  public static readonly type = ExtensionTypes.MOVABLE;

  private velocity: Vector2 = { x: 0, y: 0 };

  public getVelocity(): Vector2 {
    return this.velocity;
  }

  public setVelocity(velocity: Vector2): void {
    this.velocity = velocity;
  }

  public deserialize(data: ClientExtensionSerialized): this {
    this.velocity = data.velocity;
    return this;
  }
}
