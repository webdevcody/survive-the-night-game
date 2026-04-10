import { Cooldown } from "@/entities/util/cooldown";
import Destructible from "@/extensions/destructible";
import { encodeExtensionType } from "@shared/util/extension-type-encoding";
import { ExtensionBase } from "./extension-base";
class Ignitable extends ExtensionBase {
    // TODO: this should be configurable for damage / cooldown
    constructor(self, maxDamage = 2) {
        super(self, { maxDamage, totalDamage: 0 });
        this.cooldown = new Cooldown(1);
        this.damage = 1;
    }
    update(deltaTime) {
        this.cooldown.update(deltaTime);
        if (this.cooldown.isReady()) {
            this.cooldown.reset();
            this.self.getExt(Destructible).damage(this.damage);
            const currentTotalDamage = this.serialized.get('totalDamage');
            this.serialized.set('totalDamage', currentTotalDamage + this.damage);
            const maxDamage = this.serialized.get('maxDamage');
            if (currentTotalDamage + this.damage >= maxDamage) {
                this.self.removeExtension(this);
            }
        }
    }
    serializeToBuffer(writer, onlyDirty = false) {
        writer.writeUInt8(encodeExtensionType(Ignitable.type));
    }
}
Ignitable.type = "ignitable";
export default Ignitable;
