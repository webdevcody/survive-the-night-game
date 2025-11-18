import { IEntity } from "@/entities/types";
import { Extension } from "@/extensions/types";
import Vector2 from "@/util/vector2";
import { BufferWriter } from "@shared/util/buffer-serialization";
import { encodeExtensionType } from "@shared/util/extension-type-encoding";
import PoolManager from "@shared/util/pool-manager";
import { ExtensionBase } from "./extension-base";

export default class Movable extends ExtensionBase {
  public static readonly type = "movable";

  private velocity: Vector2;
  private hasFriction: boolean;

  public constructor(self: IEntity) {
    super(self, { velocity: { x: 0, y: 0 } });
    this.velocity = PoolManager.getInstance().vector2.claim(0, 0);
    this.hasFriction = true; // Default to having friction (not serialized)
  }

  public getVelocity(): Vector2 {
    return this.velocity.clone();
  }

  public setVelocity(velocity: Vector2): void {
    this.setVector2Field("velocity", this.velocity, velocity);
  }

  public setHasFriction(hasFriction: boolean): this {
    this.hasFriction = hasFriction; // Not serialized, so no need to mark dirty
    return this;
  }

  public serializeToBuffer(writer: BufferWriter, onlyDirty: boolean = false): void {
    writer.writeUInt8(encodeExtensionType(Movable.type));
    writer.writeVelocity2(this.velocity);
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
        // Update serialized field to mark dirty
        const serialized = this.serialized as any;
        serialized.velocity = { x: this.velocity.x, y: this.velocity.y };
      }
    }
  }
}
