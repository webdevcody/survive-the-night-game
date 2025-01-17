import { IEntity } from "@/entities/types";
import { Extension, ExtensionSerialized } from "@/extensions/types";
import Vector2 from "@/util/vector2";

export default class Movable implements Extension {
  public static readonly type = "movable";

  private self: IEntity;
  private velocity: Vector2;

  public constructor(self: IEntity) {
    this.self = self;
    this.velocity = new Vector2(0, 0);
  }

  public getVelocity(): Vector2 {
    return this.velocity.clone();
  }

  public setVelocity(velocity: Vector2): void {
    this.velocity = velocity;
  }

  public serialize(): ExtensionSerialized {
    return {
      type: Movable.type,
      velocity: this.velocity,
    };
  }
}
