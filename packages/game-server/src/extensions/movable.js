import { encodeExtensionType } from "@shared/util/extension-type-encoding";
import PoolManager from "@shared/util/pool-manager";
import { ExtensionBase } from "./extension-base";
class Movable extends ExtensionBase {
    constructor(self) {
        super(self, { velocity: { x: 0, y: 0 } });
        this.velocity = PoolManager.getInstance().vector2.claim(0, 0);
        this.hasFriction = true; // Default to having friction (not serialized)
    }
    getVelocity() {
        return this.velocity.clone();
    }
    setVelocity(velocity) {
        this.setVector2Field("velocity", this.velocity, velocity);
    }
    setHasFriction(hasFriction) {
        this.hasFriction = hasFriction; // Not serialized, so no need to mark dirty
        return this;
    }
    serializeToBuffer(writer, onlyDirty = false) {
        writer.writeUInt8(encodeExtensionType(Movable.type));
        writer.writeVelocity2(this.velocity);
    }
    update(deltaTime) {
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
                this.serialized.set('velocity', { x: this.velocity.x, y: this.velocity.y });
            }
        }
    }
}
Movable.type = "movable";
export default Movable;
