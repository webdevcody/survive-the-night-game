import Positionable from "@/extensions/positionable";
import { encodeExtensionType } from "@shared/util/extension-type-encoding";
import PoolManager from "@shared/util/pool-manager";
import { ExtensionBase } from "./extension-base";
class Destructible extends ExtensionBase {
    constructor(self) {
        super(self, { health: 0, maxHealth: 0 });
        this.offset = PoolManager.getInstance().vector2.claim(0, 0);
        this.deathHandler = null;
        this.onDamagedHandler = null;
        this.onBeforeDamageHandler = null;
    }
    onDeath(deathHandler) {
        this.deathHandler = deathHandler;
        return this;
    }
    setOffset(offset) {
        this.offset.reset(offset.x, offset.y);
        return this;
    }
    onDamaged(onDamagedHandler) {
        this.onDamagedHandler = onDamagedHandler;
        return this;
    }
    /** Adjust incoming damage (e.g. evade / mitigation). Return value must be >= 0. */
    onBeforeDamage(handler) {
        this.onBeforeDamageHandler = handler;
        return this;
    }
    setHealth(health) {
        this.serialized.set("health", health);
        return this;
    }
    setMaxHealth(maxHealth) {
        this.serialized.set("maxHealth", maxHealth);
        return this;
    }
    damage(damage, attackerId) {
        var _a, _b;
        if (this.isDead()) {
            return;
        }
        let applied = damage;
        if (this.onBeforeDamageHandler) {
            applied = Math.max(0, this.onBeforeDamageHandler(damage, attackerId));
        }
        const currentHealth = this.serialized.get("health");
        this.serialized.set("health", Math.max(0, currentHealth - applied));
        (_a = this.onDamagedHandler) === null || _a === void 0 ? void 0 : _a.call(this, attackerId, applied);
        if (this.isDead()) {
            (_b = this.deathHandler) === null || _b === void 0 ? void 0 : _b.call(this, attackerId);
        }
    }
    kill(killerId) {
        var _a;
        this.serialized.set("health", 0);
        (_a = this.deathHandler) === null || _a === void 0 ? void 0 : _a.call(this, killerId);
    }
    getDamageBox() {
        const poolManager = PoolManager.getInstance();
        const positionable = this.self.getExt(Positionable);
        const position = positionable.getPosition();
        const size = positionable.getSize();
        const adjustedPos = poolManager.vector2.claim(position.x + this.offset.x, position.y + this.offset.y);
        const rect = poolManager.rectangle.claim(adjustedPos, size);
        poolManager.vector2.release(adjustedPos);
        return rect;
    }
    heal(amount) {
        if (this.isDead()) {
            return;
        }
        const currentHealth = this.serialized.get("health");
        const maxHealth = this.serialized.get("maxHealth");
        this.serialized.set("health", Math.min(currentHealth + amount, maxHealth));
    }
    isDead() {
        return this.serialized.get("health") === 0;
    }
    getHealth() {
        return this.serialized.get("health");
    }
    getMaxHealth() {
        return this.serialized.get("maxHealth");
    }
    serializeToBuffer(writer, onlyDirty = false) {
        writer.writeUInt8(encodeExtensionType(Destructible.type));
        const health = Math.max(0, Math.min(255, Math.round(this.serialized.get("health"))));
        const maxHealth = Math.max(0, Math.min(255, Math.round(this.serialized.get("maxHealth"))));
        writer.writeUInt8(health);
        writer.writeUInt8(maxHealth);
    }
}
Destructible.type = "destructible";
export default Destructible;
