import { Vector2 } from "@survive-the-night/game-server";
import { ExtensionTypes } from "@survive-the-night/game-server/src/shared/extension-types";
import { ClientExtension, ClientExtensionSerialized } from "./types";

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
