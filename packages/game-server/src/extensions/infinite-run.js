import { encodeExtensionType } from "@shared/util/extension-type-encoding";
import { ExtensionBase } from "./extension-base";
import { Cooldown } from "@/entities/util/cooldown";
class InfiniteRun extends ExtensionBase {
    constructor(self, duration) {
        super(self, { duration });
        this.cooldown = new Cooldown(duration);
    }
    update(deltaTime) {
        this.cooldown.update(deltaTime);
        if (this.cooldown.isReady()) {
            // Remove extension when duration expires
            this.self.removeExtension(this);
        }
    }
    getRemainingTime() {
        return this.cooldown.getRemainingTime();
    }
    isActive() {
        return !this.cooldown.isReady();
    }
    serializeToBuffer(writer, onlyDirty = false) {
        writer.writeUInt8(encodeExtensionType(InfiniteRun.type));
        writer.writeFloat64(this.serialized.get("duration"));
        writer.writeFloat64(this.getRemainingTime());
    }
}
InfiniteRun.type = "infinite-run";
export default InfiniteRun;
