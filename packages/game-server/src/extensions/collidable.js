import Positionable from "@/extensions/positionable";
import { encodeExtensionType } from "@shared/util/extension-type-encoding";
import PoolManager from "@shared/util/pool-manager";
import { ExtensionBase } from "./extension-base";
class Collidable extends ExtensionBase {
    constructor(self) {
        super(self, { size: { x: 16, y: 16 }, offset: { x: 0, y: 0 }, enabled: true });
        this.size = PoolManager.getInstance().vector2.claim(16, 16);
        this.offset = PoolManager.getInstance().vector2.claim(0, 0);
        this.hitBox = PoolManager.getInstance().rectangle.claim(0, 0, 0, 0);
    }
    setEnabled(enabled) {
        this.serialized.set("enabled", enabled);
        return this;
    }
    isEnabled() {
        return this.serialized.get("enabled");
    }
    setSize(size) {
        this.setVector2Field("size", this.size, size);
        return this;
    }
    getSize() {
        return this.size.clone();
    }
    setOffset(offset) {
        this.setVector2Field("offset", this.offset, offset);
        return this;
    }
    getHitBox() {
        const positionable = this.self.getExt(Positionable);
        const position = positionable.getPosition();
        this.hitBox.position.reset(position.x + this.offset.x, position.y + this.offset.y);
        this.hitBox.size.reset(this.size.x, this.size.y);
        return this.hitBox;
    }
    serializeToBuffer(writer, onlyDirty = false) {
        writer.writeUInt8(encodeExtensionType(Collidable.type));
        writer.writeVector2(this.offset);
        writer.writeVector2(this.size);
        writer.writeBoolean(this.serialized.get("enabled"));
    }
}
Collidable.type = "collidable";
export default Collidable;
