import { Vector2 } from "@shared/geom/physics";
import { IEntity } from "@shared/geom/types";
import { Extension, ExtensionSerialized } from "@/extensions/types";

export default class Movable implements Extension {
  public static readonly type = "movable";

  private self: IEntity;
  private velocity: Vector2;

  public constructor(self: IEntity) {
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
