import { IEntity } from "@/entities/types";
import { Player } from "@/entities/players/player";
import Carryable from "@/extensions/carryable";
import Interactive from "@/extensions/interactive";
import Inventory from "@/extensions/inventory";
import { isWeapon, isResourceItem } from "@shared/util/inventory";

/**
 * Determines if an item should be auto-picked up when walked over.
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
export function shouldAutoPickup(entity: IEntity, player: Player): boolean {
  // Zombie players cannot pick up anything
  if (player.isZombie()) {
    return false;
  }

  const entityType = entity.getType();

  // Check if it's a resource (wood, cloth, etc.) - always auto-pickup
  if (isResourceItem(entityType)) {
    return true;
  }

  // Check if it's a tree (harvestable resource) - always auto-pickup
  if (entityType === "tree") {
    return true;
  }

  // Check if it's a coin - always auto-pickup
  if (entityType === "coin") {
    return true;
  }

  // Crates and barrels (gallon drums) - always auto-loot when walked over
  if (entityType === "crate" || entityType === "gallon_drum") {
    return true;
  }

  // Weapons always require manual pickup
  if (isWeapon(entityType)) {
    return false;
  }

  // Check if entity has Carryable extension (inventory items)
  if (!entity.hasExt(Carryable)) {
    return false;
  }

  const carryable = entity.getExt(Carryable);
  const itemType = carryable.getItemType();

  // If player already has this item type, auto-pickup (for stacking)
  const inventory = player.getExt(Inventory);
  if (inventory.hasItem(itemType)) {
    return true;
  }

  // New item not in inventory - require manual pickup
  return false;
}

/**
 * Attempts to auto-pickup an entity for a player.
 * Returns true if pickup was successful.
 */
export function attemptAutoPickup(entity: IEntity, player: Player): boolean {
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
