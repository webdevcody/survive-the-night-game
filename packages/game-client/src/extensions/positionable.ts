import Vector2 from "@shared/util/vector2";
import { ExtensionTypes } from "../../../game-shared/src/util/extension-types";
import { ClientExtension, ClientExtensionSerialized } from "@/extensions/types";

export class ClientPositionable implements ClientExtension {
  public static readonly type = ExtensionTypes.POSITIONABLE;

  private position: Vector2 = new Vector2(0, 0)
  private size: Vector2 = new Vector2(0, 0);

  public getSize(): Vector2 {
    return this.size.clone();
  }

  public setSize(size: Vector2): this {
    this.size = size;
    return this;
  }

  public getCenterPosition(): Vector2 {
    return this.size.div(2).add(this.position);
  }

  public getPosition(): Vector2 {
    return this.position.clone();
  }

  public setPosition(position: Vector2): void {
    this.position = position
  }

  public deserialize(data: ClientExtensionSerialized): this {
    this.position = data.position
    this.size = data.size;
    return this;
  }
}
