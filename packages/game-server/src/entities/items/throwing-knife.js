import Positionable from "@/extensions/positionable";
import Inventory from "@/extensions/inventory";
import { Weapon } from "@/entities/weapons/weapon";
import Carryable from "@/extensions/carryable";
import Interactive from "@/extensions/interactive";
import { ThrowingKnifeProjectile } from "@/entities/projectiles/throwing-knife-projectile";
import { getConfig } from "@shared/config";
export class ThrowingKnife extends Weapon {
    constructor(gameManagers, itemState) {
        var _a;
        super(gameManagers, "throwing_knife");
        // Make throwing knives stackable by setting count from itemState or default
        if (this.hasExt(Carryable)) {
            const carryable = this.getExt(Carryable);
            const count = (_a = itemState === null || itemState === void 0 ? void 0 : itemState.count) !== null && _a !== void 0 ? _a : ThrowingKnife.DEFAULT_COUNT;
            carryable.setItemState({ count });
        }
        // Override Interactive callback to use merge strategy for stacking
        if (this.hasExt(Interactive)) {
            const interactive = this.getExt(Interactive);
            interactive.onInteract((entityId) => {
                const carryable = this.getExt(Carryable);
                carryable.pickup(entityId, Carryable.createStackablePickupOptions(carryable, ThrowingKnife.DEFAULT_COUNT));
            });
        }
    }
    getCooldown() {
        return ThrowingKnife.COOLDOWN;
    }
    attack(playerId, position, facing, aimAngle) {
        var _a;
        const player = this.getEntityManager().getEntityById(playerId);
        if (!player || !player.hasExt(Positionable))
            return;
        const playerPos = player.getExt(Positionable).getCenterPosition();
        const inventory = player.getExt(Inventory);
        // Find the throwing knife in inventory
        const inventoryItems = inventory.getItems();
        const knifeIndex = inventoryItems.findIndex((item) => item && item.itemType === this.getType());
        if (knifeIndex === -1)
            return;
        const knifeItem = inventoryItems[knifeIndex];
        if (!knifeItem)
            return;
        // Decrement count for stackable throwing knives
        const currentCount = ((_a = knifeItem.state) === null || _a === void 0 ? void 0 : _a.count) || 1;
        if (currentCount > 1) {
            inventory.updateItemState(knifeIndex, { count: currentCount - 1 });
        }
        else {
            inventory.removeItem(knifeIndex);
        }
        // Create and launch the throwing knife projectile
        const throwingKnife = new ThrowingKnifeProjectile(this.getGameManagers());
        throwingKnife.setPosition(playerPos);
        // Use aimAngle if provided (mouse aiming), otherwise use facing direction
        if (aimAngle !== undefined) {
            throwingKnife.setDirectionFromAngle(aimAngle);
        }
        else {
            throwingKnife.setDirection(facing);
        }
        throwingKnife.setShooterId(playerId);
        this.getEntityManager().addEntity(throwingKnife);
    }
}
ThrowingKnife.COOLDOWN = getConfig().combat.THROWING_KNIFE_COOLDOWN;
ThrowingKnife.DEFAULT_COUNT = 5;
