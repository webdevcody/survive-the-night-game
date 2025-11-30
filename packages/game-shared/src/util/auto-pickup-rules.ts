import { EntityType, ItemType } from "../types/entity";
import { isWeapon, isResourceItem } from "./inventory";

/**
 * Shared auto-pickup rules logic
 * Determines if an item should be auto-picked up based on entity type and inventory state
 *
 * Auto-pickup conditions:
 * 1. Resources (wood, cloth) - always auto-pickup
 * 2. Trees (harvestable resource) - always auto-pickup
 * 3. Coins - always auto-pickup
 * 4. Crates and gallon drums - always auto-loot
 * 5. Items already in player's inventory (stackable items like ammo)
 *
 * Manual pickup required:
 * 1. Weapons - always require manual pickup
 * 2. New items not in inventory
 */

export interface AutoPickupContext {
  /** The entity type to check */
  entityType: EntityType;
  /** Whether the entity is carryable (has an item type) */
  isCarryable: boolean;
  /** The item type if carryable */
  itemType?: ItemType;
  /** Whether the player already has this item type in inventory */
  playerHasItem: boolean;
  /** Whether the player is a zombie (zombies can't pick up items) */
  isZombiePlayer: boolean;
}

/**
 * Determines if an item should be auto-picked up based on shared rules
 * This is a pure function that can be used by both server and client
 */
export function shouldAutoPickup(context: AutoPickupContext): boolean {
  // Zombie players cannot pick up anything
  if (context.isZombiePlayer) {
    return false;
  }

  // Check if it's a resource (wood, cloth, etc.) - always auto-pickup
  if (isResourceItem(context.entityType)) {
    return true;
  }

  // Check if it's a tree (harvestable resource) - always auto-pickup
  if (context.entityType === "tree") {
    return true;
  }

  // Check if it's a coin - always auto-pickup
  if (context.entityType === "coin") {
    return true;
  }

  // Crates and barrels (gallon drums) - always auto-loot when walked over
  if (context.entityType === "crate" || context.entityType === "gallon_drum") {
    return true;
  }

  // Weapons always require manual pickup
  if (isWeapon(context.entityType)) {
    return false;
  }

  // Check if entity is carryable (inventory items)
  if (!context.isCarryable) {
    return false;
  }

  // If player already has this item type, auto-pickup (for stacking)
  if (context.playerHasItem) {
    return true;
  }

  // New item not in inventory - require manual pickup
  return false;
}

