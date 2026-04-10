import { Cooldown } from "@/entities/util/cooldown";
import Positionable from "@/extensions/positionable";
import Placeable from "@/extensions/placeable";
import Destructible from "@/extensions/destructible";
import { encodeExtensionType } from "@shared/util/extension-type-encoding";
import { ExtensionBase } from "./extension-base";
import { getConfig } from "@shared/config";
import { Entities } from "@shared/constants";
import { distance } from "@/util/physics";
class TriggerCooldownAttacker extends ExtensionBase {
    constructor(self, options) {
        super(self, { isReady: true });
        this.attackCooldown = new Cooldown(options.cooldown, true);
        this.checkCooldown = new Cooldown(TriggerCooldownAttacker.CHECK_INTERVAL);
        // Set random offset to spread checks across time
        this.checkCooldown.setTimeRemaining(Math.random() * TriggerCooldownAttacker.CHECK_INTERVAL);
        this.options = options;
    }
    getIsReady() {
        return this.serialized.get('isReady');
    }
    update(deltaTime) {
        this.attackCooldown.update(deltaTime);
        this.checkCooldown.update(deltaTime);
        // Only update serialized if value actually changed to avoid unnecessary dirty marking
        const newIsReady = this.attackCooldown.isReady();
        const currentIsReady = this.serialized.get('isReady');
        if (currentIsReady !== newIsReady) {
            this.serialized.set('isReady', newIsReady);
        }
        // Early exit: skip expensive spatial query if attack cooldown isn't ready
        if (!this.attackCooldown.isReady()) {
            return;
        }
        // Only check for enemies every half second
        if (!this.checkCooldown.isReady()) {
            return;
        }
        // Reset check cooldown
        this.checkCooldown.reset();
        const positionable = this.self.getExt(Positionable);
        const position = positionable.getCenterPosition();
        // Use RADIUS instead of hardcoded 100 to avoid querying unnecessary entities
        // Add small buffer (2) to account for entity size when querying spatial grid
        const queryRadius = TriggerCooldownAttacker.RADIUS + 2;
        const victimTypeSet = new Set([this.options.victimType]);
        // Check if we should include players based on game mode (Battle Royale friendly fire)
        if (this.options.includePlayersInBattleRoyale) {
            const strategy = this.self.getGameManagers().getGameServer().getGameLoop().getGameModeStrategy();
            if (strategy.getConfig().friendlyFireEnabled) {
                victimTypeSet.add(Entities.PLAYER);
            }
        }
        const entities = this.self
            .getEntityManager()
            .getNearbyEntities(positionable.getPosition(), queryRadius, victimTypeSet);
        // Get owner ID to exclude from targeting
        const ownerId = this.self.hasExt(Placeable) ? this.self.getExt(Placeable).getOwnerId() : null;
        for (const entity of entities) {
            if (!entity.hasExt(Destructible)) {
                continue;
            }
            // Skip the owner (never damage the player who placed this)
            if (ownerId !== null && entity.getId() === ownerId)
                continue;
            const destructible = entity.getExt(Destructible);
            const entityCenter = entity.getExt(Positionable).getCenterPosition();
            const centerDistance = distance(position, entityCenter);
            if (centerDistance < TriggerCooldownAttacker.RADIUS) {
                destructible.damage(this.options.damage);
                this.attackCooldown.reset();
                break;
            }
        }
    }
    serializeToBuffer(writer, onlyDirty = false) {
        writer.writeUInt8(encodeExtensionType(TriggerCooldownAttacker.type));
        writer.writeBoolean(this.serialized.get('isReady'));
    }
}
TriggerCooldownAttacker.type = "trigger-cooldown-attacker";
TriggerCooldownAttacker.RADIUS = getConfig().combat.ITEM_TRIGGER_RADIUS;
TriggerCooldownAttacker.CHECK_INTERVAL = getConfig().entity.PLAYER_CHECK_INTERVAL;
export default TriggerCooldownAttacker;
