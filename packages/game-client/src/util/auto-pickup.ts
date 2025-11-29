import { ClientEntityBase } from "@/extensions/client-entity";
import { ClientCarryable, ClientInventory } from "@/extensions";
import { isWeapon, isResourceItem, ItemType } from "@shared/util/inventory";

/**
 * Client-side check to determine if an item will be auto-picked up.
 * Mirrors server-side logic for consistent UI.
 *
 * Auto-pickup conditions:
 * 1. Resources (wood, cloth) - always auto-pickup
 * 2. Trees (harvestable resource) - always auto-pickup
 * 3. Coins - always auto-pickup
 * 4. Items already in player's inventory (stackable items like ammo)
 *
 * Manual pickup required:
 * 1. Weapons - always require manual pickup
 * 2. New items not in inventory
 */
export function isAutoPickupItem(entity: ClientEntityBase, player: ClientEntityBase): boolean {
  const entityType = entity.getType();

  // Resources are always auto-pickup
  if (isResourceItem(entityType)) {
    return true;
  }

  // Trees (harvestable resource) are always auto-pickup
  if (entityType === "tree") {
    return true;
  }

  // Coins are always auto-pickup
  if (entityType === "coin") {
    return true;
  }

  // Weapons always require manual pickup
  if (isWeapon(entityType)) {
    return false;
  }

  // Check if entity is carryable
  if (!entity.hasExt(ClientCarryable)) {
    return false;
  }

  const carryable = entity.getExt(ClientCarryable);
  const itemType = carryable.getItemKey() as ItemType;

  // Check if player already has this item
  if (!player.hasExt(ClientInventory)) {
    return false;
  }

  const inventory = player.getExt(ClientInventory);
  const items = inventory.getItems();

  // If player has this item type, it will auto-pickup (for stacking)
  return items.some((item: any) => item?.itemType === itemType);
}
