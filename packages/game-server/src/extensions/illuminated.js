import { encodeExtensionType } from "@shared/util/extension-type-encoding";
import { ExtensionBase } from "./extension-base";
import { getConfig } from "@shared/config";
class Illuminated extends ExtensionBase {
    constructor(self, radius = getConfig().world.LIGHT_RADIUS_FIRE) {
        super(self, { radius });
    }
    getRadius() {
        return this.serialized.get('radius');
    }
    setRadius(radius) {
        this.serialized.set('radius', radius);
        return this;
    }
    serializeToBuffer(writer, onlyDirty = false) {
        writer.writeUInt8(encodeExtensionType(Illuminated.type));
        writer.writeUInt16(this.serialized.get('radius'));
    }
}
Illuminated.type = "illuminated";
export default Illuminated;
export { Illuminated };
