import { ExtensionTypes } from "@shared/geom/extension-types";
import { Vector2 } from "@shared/geom/physics";
import { ClientExtension, ClientExtensionSerialized } from "./types";

export class ClientPositionable implements ClientExtension {
  public static readonly type = ExtensionTypes.POSITIONABLE;

  private x = 0;
  private y = 0;
  private size = 0;

  public getSize(): number {
    return this.size;
  }

  public setSize(size: number): this {
    this.size = size;
    return this;
  }

  public getCenterPosition(): Vector2 {
    return {
      x: this.x + this.size / 2,
      y: this.y + this.size / 2,
    };
  }

  public getPosition(): Vector2 {
    return { x: this.x, y: this.y };
  }

  public setPosition(position: Vector2): void {
    this.x = position.x;
    this.y = position.y;
  }

  public deserialize(data: ClientExtensionSerialized): this {
    this.x = data.x;
    this.y = data.y;
    this.size = data.size;
    return this;
  }
}
