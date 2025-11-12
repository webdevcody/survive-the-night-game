import { IEntity } from "@/entities/types";
import { Extension, ExtensionSerialized } from "@/extensions/types";
import Vector2 from "@/util/vector2";

export default class Movable implements Extension {
  public static readonly type = "movable";

  private self: IEntity;
  private velocity: Vector2;
  private hasFriction: boolean;
  private dirty: boolean = false;

  public constructor(self: IEntity) {
    this.self = self;
    this.velocity = new Vector2(0, 0);
    this.hasFriction = true; // Default to having friction
  }

  public getVelocity(): Vector2 {
    return this.velocity.clone();
  }

  public setVelocity(velocity: Vector2): void {
    const velocityChanged = this.velocity.x !== velocity.x || this.velocity.y !== velocity.y;
    this.velocity = velocity;
    if (velocityChanged) {
      this.markDirty();
    }
  }

  public setHasFriction(hasFriction: boolean): this {
    const frictionChanged = this.hasFriction !== hasFriction;
    this.hasFriction = hasFriction;
    if (frictionChanged) {
      this.markDirty();
    }
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
      const oldX = this.velocity.x;
      const oldY = this.velocity.y;
      this.velocity.x *= Math.pow(friction, deltaTime * 60);
      this.velocity.y *= Math.pow(friction, deltaTime * 60);
      // Only mark dirty if velocity actually changed (avoid marking dirty every frame if velocity is 0)
      if (Math.abs(oldX - this.velocity.x) > 0.001 || Math.abs(oldY - this.velocity.y) > 0.001) {
        this.markDirty();
      }
    }
  }

  public isDirty(): boolean {
    return this.dirty;
  }

  public markDirty(): void {
    this.dirty = true;
    if (this.self.markExtensionDirty) {
      this.self.markExtensionDirty(this);
    }
  }

  public clearDirty(): void {
    this.dirty = false;
  }

  public serializeDirty(): ExtensionSerialized | null {
    if (!this.dirty) {
      return null;
    }
    return this.serialize();
  }
}
