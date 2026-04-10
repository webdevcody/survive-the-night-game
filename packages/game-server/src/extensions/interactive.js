import PoolManager from "@shared/util/pool-manager";
import { encodeExtensionType } from "@shared/util/extension-type-encoding";
import { encodeInteractableText } from "@shared/util/interactable-text-encoding";
import { ExtensionBase } from "./extension-base";
class Interactive extends ExtensionBase {
    constructor(self) {
        super(self, { displayName: "", offset: { x: 0, y: 0 }, autoPickupEnabled: false });
        this.handler = null;
        this.offset = PoolManager.getInstance().vector2.claim(0, 0);
    }
    onInteract(handler) {
        this.handler = handler;
        return this;
    }
    setOffset(offset) {
        this.setVector2Field("offset", this.offset, offset);
        return this;
    }
    getOffset() {
        return this.offset.clone();
    }
    setDisplayName(name) {
        this.serialized.set('displayName', name);
        return this;
    }
    getDisplayName() {
        return this.serialized.get('displayName');
    }
    setAutoPickupEnabled(enabled) {
        this.serialized.set('autoPickupEnabled', enabled);
        return this;
    }
    getAutoPickupEnabled() {
        return this.serialized.get('autoPickupEnabled');
    }
    interact(entityId) {
        var _a;
        (_a = this.handler) === null || _a === void 0 ? void 0 : _a.call(this, entityId);
    }
    serializeToBuffer(writer, onlyDirty = false) {
        writer.writeUInt8(encodeExtensionType(Interactive.type));
        writer.writeUInt8(encodeInteractableText(this.serialized.get('displayName')));
        writer.writeVector2(this.offset);
        writer.writeBoolean(this.serialized.get('autoPickupEnabled'));
    }
}
Interactive.type = "interactive";
export default Interactive;
