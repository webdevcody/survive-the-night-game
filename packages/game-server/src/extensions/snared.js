import { encodeExtensionType } from "@shared/util/extension-type-encoding";
import { ExtensionBase } from "./extension-base";
class Snared extends ExtensionBase {
    constructor(self) {
        super(self, {});
    }
    serializeToBuffer(writer, onlyDirty = false) {
        writer.writeUInt8(encodeExtensionType(Snared.type));
    }
}
Snared.type = "snared";
export default Snared;
