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
    this.velocity = data.velocity;
    return this;
  }
}
