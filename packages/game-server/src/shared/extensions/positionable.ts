import { GenericEntity } from "../generic-entity";
import { Extension, ExtensionSerialized } from "./types";
import { Vector2 } from "../physics";

export default class Positionable implements Extension {
  public static readonly type = "positionable";

  private self: GenericEntity;
  private x = 0;
  private y = 0;
  private size = 0;

  public constructor(self: GenericEntity) {
    this.self = self;
  }

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

  public deserialize(data: ExtensionSerialized): this {
    this.x = data.x;
    this.y = data.y;
    this.size = data.size;
    return this;
  }

  public serialize(): ExtensionSerialized {
    return {
      type: Positionable.type,
      x: this.x,
      y: this.y,
      size: this.size,
    };
  }
}
