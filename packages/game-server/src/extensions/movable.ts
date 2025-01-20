import { IEntity } from "@/entities/types";
import { Extension, ExtensionSerialized } from "@/extensions/types";
import Vector2 from "@/util/vector2";

export default class Movable implements Extension {
  public static readonly type = "movable";

  private self: IEntity;
  private velocity: Vector2;
  private hasFriction: boolean;

  public constructor(self: IEntity) {
    this.self = self;
    this.velocity = new Vector2(0, 0);
    this.hasFriction = true; // Default to having friction
  }

  public getVelocity(): Vector2 {
    return this.velocity.clone();
  }

  public setVelocity(velocity: Vector2): void {
    this.velocity = velocity;
  }

  public setHasFriction(hasFriction: boolean): this {
    this.hasFriction = hasFriction;
    return this;
  }

  public serialize(): ExtensionSerialized {
    return {
      type: Movable.type,
      velocity: this.velocity,
    };
  }

  public update(deltaTime: number): void {
    if (this.hasFriction) {
      // Apply friction to slow down movement
      const friction = 0.85; // Friction coefficient (adjust as needed)
      this.velocity.x *= Math.pow(friction, deltaTime * 60);
      this.velocity.y *= Math.pow(friction, deltaTime * 60);
    }
  }
}
