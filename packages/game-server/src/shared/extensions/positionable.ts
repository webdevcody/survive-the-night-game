import { GenericEntity } from "../entities";
import { Extension, ExtensionNames, ExtensionSerialized } from "./types";
import { Vector2 } from "../physics";

export default class Positionable implements Extension {
  public static readonly Name = ExtensionNames.positionable;

  private self: GenericEntity;
  private x = 0;
  private y = 0;

  public constructor(self: GenericEntity) {
    this.self = self;
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
    return this;
  }

  public serialize(): ExtensionSerialized {
    return {
      name: Positionable.Name,
      x: this.x,
      y: this.y,
    };
  }
}
