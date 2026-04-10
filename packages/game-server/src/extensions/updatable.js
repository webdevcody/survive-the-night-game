import { encodeExtensionType } from "@shared/util/extension-type-encoding";
import { ExtensionBase } from "./extension-base";
class Updatable extends ExtensionBase {
    /**
     * will create a trigger box around an entity which should be used for various purposes.
     */
    constructor(self, updateFunction) {
        super(self, {});
        this.updateFunction = updateFunction;
    }
    setUpdateFunction(cb) {
        this.updateFunction = cb;
        return this;
    }
    update(deltaTime) {
        this.updateFunction(deltaTime);
    }
    serializeToBuffer(writer, onlyDirty = false) {
        writer.writeUInt8(encodeExtensionType(Updatable.type));
    }
}
Updatable.type = "updatable";
export default Updatable;
