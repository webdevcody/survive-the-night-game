import { Entity } from "../entity";
import { Extension, ExtensionSerialized } from "./types";
import { Vector2 } from "../physics";
import { ExtensionTypes } from "../extension-types";

export default class Positionable implements Extension {
  public static readonly type = ExtensionTypes.POSITIONABLE;

  private serialized?: ExtensionSerialized;
  private self: Entity;
  private x = 0;
  private y = 0;
  private size = 0;

  public constructor(self: Entity) {
    this.self = self;
  }

  public getSize(): number {
    return this.size;
  }

  public setSize(size: number): this {
    this.size = size;
    this.serialized = undefined;
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
    this.serialized = undefined;
  }

  public deserialize(data: ExtensionSerialized): this {
    this.x = data.x;
    this.y = data.y;
    this.size = data.size;

    return this;
  }

  public serialize() {
    if (!this.serialized) {
      this.serialized = {
        type: Positionable.type,
        x: this.x,
        y: this.y,
        size: this.size,
      };
    }

    return this.serialized;
  }
}
