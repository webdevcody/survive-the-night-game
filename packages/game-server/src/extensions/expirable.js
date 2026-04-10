import { Cooldown } from "@/entities/util/cooldown";
import { encodeExtensionType } from "@shared/util/extension-type-encoding";
import { ExtensionBase } from "./extension-base";
class Expirable extends ExtensionBase {
    constructor(self, expiresIn) {
        super(self, { expiresIn });
        this.expireCooldown = new Cooldown(expiresIn);
    }
    update(deltaTime) {
        this.expireCooldown.update(deltaTime);
        if (this.expireCooldown.isReady()) {
            this.self.getEntityManager().markEntityForRemoval(this.self);
        }
    }
    serializeToBuffer(writer, onlyDirty = false) {
        writer.writeUInt8(encodeExtensionType(Expirable.type));
    }
}
Expirable.type = "expirable";
export default Expirable;
