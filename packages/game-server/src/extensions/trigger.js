import Positionable from "@/extensions/positionable";
import Collidable from "@/extensions/collidable";
import { ExtensionTypes } from "@/util/extension-types";
import { encodeExtensionType } from "@shared/util/extension-type-encoding";
import PoolManager from "@shared/util/pool-manager";
import { ExtensionBase } from "./extension-base";
class Triggerable extends ExtensionBase {
    /**
     * will create a trigger box around an entity which should be used for various purposes.
     */
    constructor(self, size, filter) {
        super(self, { size: { x: size.x, y: size.y }, filter });
        this.size = PoolManager.getInstance().vector2.claim(size.x, size.y);
        this.filter = filter;
    }
    setOnEntityEntered(cb) {
        this.onEntityEntered = cb;
        return this;
    }
    update(deltaTime) {
        var _a;
        const positionable = this.self.getExt(Positionable);
        const filterSet = new Set(this.filter);
        const entities = this.self
            .getEntityManager()
            .getNearbyEntities(positionable.getCenterPosition(), this.size.x / 2, filterSet);
        for (const entity of entities) {
            if (!entity.hasExt(Collidable))
                continue;
            (_a = this.onEntityEntered) === null || _a === void 0 ? void 0 : _a.call(this, entity);
        }
    }
    serializeToBuffer(writer, onlyDirty = false) {
        writer.writeUInt8(encodeExtensionType(Triggerable.type));
        writer.writeFloat64(this.size.x);
        writer.writeFloat64(this.size.y);
    }
}
Triggerable.type = ExtensionTypes.TRIGGERABLE;
export default Triggerable;
