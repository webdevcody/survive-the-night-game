import { ExtensionTypes } from "@/util/extension-types";
import { encodeExtensionType } from "@shared/util/extension-type-encoding";
import PoolManager from "@shared/util/pool-manager";
import { ExtensionBase } from "./extension-base";
class Positionable extends ExtensionBase {
    constructor(self) {
        super(self, { position: { x: 0, y: 0 }, size: { x: 0, y: 0 } });
        this.position = PoolManager.getInstance().vector2.claim(0, 0);
        this.size = PoolManager.getInstance().vector2.claim(0, 0);
        this.centerPosition = PoolManager.getInstance().vector2.claim(0, 0);
    }
    setOnPositionChange(callback) {
        this.onPositionChange = callback;
        return this;
    }
    getSize() {
        return this.size.clone();
    }
    setSize(size) {
        const sizeChanged = this.size.x !== size.x || this.size.y !== size.y;
        this.setVector2Field("size", this.size, size);
        return this;
    }
    getCenterPosition() {
        this.centerPosition.reset(this.position.x + this.size.x / 2, this.position.y + this.size.y / 2);
        return this.centerPosition;
    }
    getPosition() {
        return this.position.clone();
    }
    setPosition(position) {
        // Only trigger callback if position actually changed
        const positionChanged = this.position.x !== position.x || this.position.y !== position.y;
        this.setVector2Field("position", this.position, position);
        if (positionChanged && this.onPositionChange) {
            this.onPositionChange(this.self);
        }
        return this;
    }
    serializeToBuffer(writer, onlyDirty = false) {
        writer.writeUInt8(encodeExtensionType(Positionable.type));
        writer.writePosition2(this.position);
        writer.writeSize2(this.size);
    }
}
Positionable.type = ExtensionTypes.POSITIONABLE;
export default Positionable;
