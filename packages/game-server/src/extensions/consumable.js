import { encodeExtensionType } from "@shared/util/extension-type-encoding";
import { ExtensionBase } from "./extension-base";
class Consumable extends ExtensionBase {
    constructor(self) {
        super(self, {});
        this.handler = null;
    }
    onConsume(handler) {
        this.handler = handler;
        return this;
    }
    consume(entityId, idx) {
        var _a;
        (_a = this.handler) === null || _a === void 0 ? void 0 : _a.call(this, entityId, idx);
    }
    serializeToBuffer(writer, onlyDirty = false) {
        writer.writeUInt8(encodeExtensionType(Consumable.type));
    }
}
Consumable.type = "consumable";
export default Consumable;
