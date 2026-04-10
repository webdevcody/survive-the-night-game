import Carryable from "@/extensions/carryable";
import Interactive from "@/extensions/interactive";
import Inventory from "@/extensions/inventory";
import { shouldAutoPickup as shouldAutoPickupShared } from "@shared/util/auto-pickup-rules";
/**
 * Determines if an item should be auto-picked up when walked over.
 * Uses shared auto-pickup rules logic.
 */
export function shouldAutoPickup(entity, player) {
    const entityType = entity.getType();
    const isCarryable = entity.hasExt(Carryable);
    let itemType;
    let playerHasItem = false;
    if (isCarryable) {
        const carryable = entity.getExt(Carryable);
        itemType = carryable.getItemType();
        const inventory = player.getExt(Inventory);
        playerHasItem = inventory.hasItem(itemType);
    }
    return shouldAutoPickupShared({
        entityType,
        isCarryable,
        itemType: itemType,
        playerHasItem,
        isZombiePlayer: player.isZombie(),
    });
}
/**
 * Attempts to auto-pickup an entity for a player.
 * Returns true if pickup was successful.
 */
export function attemptAutoPickup(entity, player) {
    // For resources and items with Interactive extension, trigger interact
    if (entity.hasExt(Interactive)) {
        const interactive = entity.getExt(Interactive);
        // Auto-pickup if:
        // 1. autoPickupEnabled is explicitly true (for resources, gallon drums, etc.)
        // 2. OR shouldAutoPickup returns true (for ammo that player already has)
        if (interactive.getAutoPickupEnabled() || shouldAutoPickup(entity, player)) {
            interactive.interact(player.getId());
            return true;
        }
    }
    return false;
}
