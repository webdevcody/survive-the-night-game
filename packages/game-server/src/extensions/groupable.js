import { encodeExtensionType } from "@shared/util/extension-type-encoding";
import { encodeGroup } from "@shared/util/group-encoding";
import { ExtensionBase } from "./extension-base";
class Groupable extends ExtensionBase {
    constructor(self, group) {
        super(self, { group });
    }
    getGroup() {
        return this.serialized.get("group");
    }
    setGroup(group) {
        this.serialized.set("group", group);
    }
    serializeToBuffer(writer, onlyDirty = false) {
        writer.writeUInt8(encodeExtensionType(Groupable.type));
        writer.writeUInt8(encodeGroup(this.serialized.get("group")));
    }
}
Groupable.type = "groupable";
export default Groupable;
