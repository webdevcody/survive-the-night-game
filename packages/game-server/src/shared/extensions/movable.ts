import { GenericEntity } from "../entities";
import { Extension, ExtensionSerialized } from "./types";
import { Vector2 } from "../physics";

export default class Movable implements Extension {
  public static readonly type = "movable";

  private self: GenericEntity;
  private velocity: Vector2;

  public constructor(self: GenericEntity) {
    this.self = self;
    this.velocity = {
      x: 0,
      y: 0,
    };
  }

  public getVelocity(): Vector2 {
    return this.velocity;
  }

  public setVelocity(velocity: Vector2): void {
    this.velocity = velocity;
  }

  public deserialize(data: ExtensionSerialized): this {
    this.velocity = data.velocity;
    return this;
  }

  public serialize(): ExtensionSerialized {
    return {
      type: Movable.type,
      velocity: this.velocity,
    };
  }
}
