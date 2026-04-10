import { Cooldown } from "@/entities/util/cooldown";
import Positionable from "@/extensions/positionable";
import { encodeExtensionType } from "@shared/util/extension-type-encoding";
import { ExtensionBase } from "./extension-base";
import Poison from "./poison";
import { Entities } from "@shared/constants";
import { getConfig } from "@shared/config";
import { Player } from "@/entities/players/player";
import { distance } from "@/util/physics";
class AcidTrigger extends ExtensionBase {
    constructor(self, options) {
        var _a, _b, _c;
        super(self, { isReady: true });
        this.triggerCooldown = new Cooldown(options.triggerCooldown, true);
        this.checkCooldown = new Cooldown(AcidTrigger.CHECK_INTERVAL);
        // Set random offset to spread checks across time
        this.checkCooldown.setTimeRemaining(Math.random() * AcidTrigger.CHECK_INTERVAL);
        this.poisonMaxDamage = (_a = options.poisonMaxDamage) !== null && _a !== void 0 ? _a : 3;
        this.poisonDamagePerTick = (_b = options.poisonDamagePerTick) !== null && _b !== void 0 ? _b : 1;
        this.poisonDamageInterval = (_c = options.poisonDamageInterval) !== null && _c !== void 0 ? _c : 1;
    }
    getIsReady() {
        return this.serialized.get("isReady");
    }
    update(deltaTime) {
        this.triggerCooldown.update(deltaTime);
        this.checkCooldown.update(deltaTime);
        // Only update serialized if value actually changed to avoid unnecessary dirty marking
        const newIsReady = this.triggerCooldown.isReady();
        const currentIsReady = this.serialized.get("isReady");
        if (currentIsReady !== newIsReady) {
            this.serialized.set("isReady", newIsReady);
        }
        // Early exit: skip expensive spatial query if trigger cooldown isn't ready
        if (!this.triggerCooldown.isReady()) {
            return;
        }
        // Only check for players every half second
        if (!this.checkCooldown.isReady()) {
            return;
        }
        // Reset check cooldown
        this.checkCooldown.reset();
        const positionable = this.self.getExt(Positionable);
        const position = positionable.getCenterPosition();
        // Use RADIUS instead of hardcoded 100 to avoid querying unnecessary entities
        // Add small buffer (2) to account for entity size when querying spatial grid
        const queryRadius = AcidTrigger.RADIUS + 2;
        const playerTypeSet = new Set([Entities.PLAYER]);
        const entities = this.self
            .getEntityManager()
            .getNearbyEntities(positionable.getPosition(), queryRadius, playerTypeSet);
        for (const entity of entities) {
            if (!entity.hasExt(Positionable)) {
                continue;
            }
            // Skip zombie players - acid only affects human players
            if (entity instanceof Player && entity.isZombie()) {
                continue;
            }
            const entityCenter = entity.getExt(Positionable).getCenterPosition();
            const centerDistance = distance(position, entityCenter);
            if (centerDistance < AcidTrigger.RADIUS) {
                // Add poison extension if player doesn't already have it
                if (!entity.hasExt(Poison)) {
                    entity.addExtension(new Poison(entity, this.poisonMaxDamage, this.poisonDamagePerTick, this.poisonDamageInterval));
                }
                this.triggerCooldown.reset();
                break;
            }
        }
    }
    serializeToBuffer(writer, onlyDirty = false) {
        writer.writeUInt8(encodeExtensionType(AcidTrigger.type));
        writer.writeBoolean(this.serialized.get("isReady"));
    }
}
AcidTrigger.type = "acid-trigger";
AcidTrigger.RADIUS = getConfig().combat.ITEM_TRIGGER_RADIUS;
AcidTrigger.CHECK_INTERVAL = 0.2; // Check for players every half second
export default AcidTrigger;
