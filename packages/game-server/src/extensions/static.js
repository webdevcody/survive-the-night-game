import { ExtensionTypes } from "@/util/extension-types";
import { encodeExtensionType } from "@shared/util/extension-type-encoding";
import { ExtensionBase } from "./extension-base";
class Static extends ExtensionBase {
    constructor(self) {
        super(self, {});
    }
    serializeToBuffer(writer, onlyDirty = false) {
        writer.writeUInt8(encodeExtensionType(Static.type));
    }
}
Static.type = ExtensionTypes.STATIC;
export default Static;
