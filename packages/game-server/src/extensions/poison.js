import { encodeExtensionType } from "@shared/util/extension-type-encoding";
import { ExtensionBase } from "./extension-base";
import Destructible from "./destructible";
import { Cooldown } from "@/entities/util/cooldown";
class Poison extends ExtensionBase {
    constructor(self, maxDamage = 3, damagePerTick = 1, damageInterval = 1) {
        super(self, { maxDamage, totalDamage: 0 });
        this.cooldown = new Cooldown(damageInterval);
        this.damage = damagePerTick;
        this.damageInterval = damageInterval;
    }
    update(deltaTime) {
        this.cooldown.update(deltaTime);
        if (this.cooldown.isReady()) {
            this.cooldown.reset();
            if (this.self.hasExt(Destructible)) {
                this.self.getExt(Destructible).damage(this.damage);
                const currentTotalDamage = this.serialized.get("totalDamage");
                this.serialized.set("totalDamage", currentTotalDamage + this.damage);
                const maxDamage = this.serialized.get("maxDamage");
                if (currentTotalDamage + this.damage >= maxDamage) {
                    this.self.removeExtension(this);
                }
            }
        }
    }
    /**
     * Refresh the poison by resetting totalDamage to 0
     * Used by toxic zones to keep poison active while player remains in zone
     */
    refresh() {
        this.serialized.set("totalDamage", 0);
    }
    serializeToBuffer(writer, onlyDirty = false) {
        writer.writeUInt8(encodeExtensionType(Poison.type));
        // maxDamage and totalDamage are small integers (typically 0-255)
        writer.writeUInt8(Math.min(255, Math.max(0, this.serialized.get("maxDamage"))));
        writer.writeUInt8(Math.min(255, Math.max(0, this.serialized.get("totalDamage"))));
    }
}
Poison.type = "poison";
export default Poison;
