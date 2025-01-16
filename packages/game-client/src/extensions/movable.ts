import { ExtensionTypes } from "../../../game-shared/src/util/extension-types";
import { Vector2 } from "../../../game-shared/src/util/physics";
import { ClientExtension, ClientExtensionSerialized } from "@/extensions/types";

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
