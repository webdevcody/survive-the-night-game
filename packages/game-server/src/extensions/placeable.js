import { encodeExtensionType } from "@shared/util/extension-type-encoding";
import { ExtensionBase } from "./extension-base";
class Placeable extends ExtensionBase {
    constructor(self) {
        super(self, { ownerId: null });
    }
    /**
     * Set the owner (player who placed this structure)
     */
    setOwnerId(ownerId) {
        this.serialized.set("ownerId", ownerId);
        return this;
    }
    /**
     * Get the owner ID (player who placed this structure)
     */
    getOwnerId() {
        return this.serialized.get("ownerId");
    }
    serializeToBuffer(writer, onlyDirty = false) {
        writer.writeUInt8(encodeExtensionType(Placeable.type));
    }
}
Placeable.type = "placeable";
export default Placeable;
