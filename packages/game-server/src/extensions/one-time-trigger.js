import Positionable from "@/extensions/positionable";
import Placeable from "@/extensions/placeable";
import { Cooldown } from "@/entities/util/cooldown";
import { encodeExtensionType } from "@shared/util/extension-type-encoding";
import { ExtensionBase } from "./extension-base";
import { getConfig } from "@shared/config";
import { Entities } from "@shared/constants";
class OneTimeTrigger extends ExtensionBase {
    constructor(self, options) {
        var _a, _b;
        super(self, {
            hasTriggered: false,
            triggerRadius: options.triggerRadius,
            targetTypes: options.targetTypes,
            includePlayersInBattleRoyale: (_a = options.includePlayersInBattleRoyale) !== null && _a !== void 0 ? _a : false,
        });
        this.triggerRadius = options.triggerRadius;
        this.targetTypes = options.targetTypes;
        this.includePlayersInBattleRoyale = (_b = options.includePlayersInBattleRoyale) !== null && _b !== void 0 ? _b : false;
        this.checkCooldown = new Cooldown(OneTimeTrigger.CHECK_INTERVAL);
        // Set random offset to spread checks across time
        this.checkCooldown.setTimeRemaining(Math.random() * OneTimeTrigger.CHECK_INTERVAL);
    }
    onTrigger(callback) {
        this.triggerCallback = callback;
        return this;
    }
    update(deltaTime) {
        var _a;
        if (this.serialized.get("hasTriggered"))
            return;
        // Update cooldown
        this.checkCooldown.update(deltaTime);
        // Only check for enemies every half second
        if (!this.checkCooldown.isReady()) {
            return;
        }
        // Reset cooldown
        this.checkCooldown.reset();
        const positionable = this.self.getExt(Positionable);
        // Use serialized values for consistency (these never change after construction, but good practice)
        const targetTypesSet = new Set(this.serialized.get("targetTypes"));
        const triggerRadius = this.serialized.get("triggerRadius");
        // Check if we should include players based on game mode (Battle Royale friendly fire)
        const includePlayersInBR = this.serialized.get("includePlayersInBattleRoyale");
        if (includePlayersInBR) {
            const strategy = this.self.getGameManagers().getGameServer().getGameLoop().getGameModeStrategy();
            if (strategy.getConfig().friendlyFireEnabled) {
                targetTypesSet.add(Entities.PLAYER);
            }
        }
        const nearbyEntities = this.self
            .getEntityManager()
            .getNearbyEntities(positionable.getCenterPosition(), triggerRadius, targetTypesSet);
        // Get owner ID to exclude from targeting
        const ownerId = this.self.hasExt(Placeable) ? this.self.getExt(Placeable).getOwnerId() : null;
        // Check if any target entity is within trigger radius
        for (const entity of nearbyEntities) {
            if (!entity.hasExt(Positionable))
                continue;
            // Skip the owner (never trigger on the player who placed this)
            if (ownerId !== null && entity.getId() === ownerId)
                continue;
            const entityPos = entity.getExt(Positionable).getCenterPosition();
            const selfPos = this.self.getExt(Positionable).getCenterPosition();
            const distance = entityPos.clone().sub(selfPos).length();
            if (distance <= triggerRadius) {
                this.serialized.set("hasTriggered", true);
                (_a = this.triggerCallback) === null || _a === void 0 ? void 0 : _a.call(this);
                break;
            }
        }
    }
    serializeToBuffer(writer, onlyDirty = false) {
        writer.writeUInt8(encodeExtensionType(OneTimeTrigger.type));
        writer.writeBoolean(this.serialized.get("hasTriggered"));
    }
}
OneTimeTrigger.type = "one-time-trigger";
OneTimeTrigger.CHECK_INTERVAL = getConfig().combat.TRIGGER_CHECK_INTERVAL;
export default OneTimeTrigger;
