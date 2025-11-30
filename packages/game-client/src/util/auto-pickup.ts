import { ClientEntityBase } from "@/extensions/client-entity";
import { ClientCarryable, ClientInventory } from "@/extensions";
import { ItemType } from "@shared/util/inventory";
import { shouldAutoPickup as shouldAutoPickupShared } from "@shared/util/auto-pickup-rules";

/**
 * Client-side check to determine if an item will be auto-picked up.
 * Uses shared auto-pickup rules logic for consistent UI.
 */
export function isAutoPickupItem(entity: ClientEntityBase, player: ClientEntityBase): boolean {
  const entityType = entity.getType();
  const isCarryable = entity.hasExt(ClientCarryable);
  let itemType: ItemType | undefined;
  let playerHasItem = false;

  if (isCarryable) {
    const carryable = entity.getExt(ClientCarryable);
    itemType = carryable.getItemKey() as ItemType;

    if (player.hasExt(ClientInventory)) {
      const inventory = player.getExt(ClientInventory);
      const items = inventory.getItems();
      playerHasItem = items.some((item: any) => item?.itemType === itemType);
    }
  }

  // Note: Client doesn't have zombie player check in this context,
  // but the shared logic will handle it if needed
  return shouldAutoPickupShared({
    entityType,
    isCarryable,
    itemType,
    playerHasItem,
    isZombiePlayer: false, // Client-side doesn't need zombie check for UI purposes
  });
}
